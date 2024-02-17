{
  inputs = {
    nixpkgs = {
      url = "github:NixOS/nixpkgs/nixos-23.11";
    };
    nixpkgs-unstable.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    # we pick upstream packages from here, so we want this to be compatible with our forks
    fedimint-pkgs = {
      url = "git+https://x-access-token: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@github.com/fedibtc/fedimint-fedi.git?ref=refs/tags/v0.2.2-rc8&rev=d3e154ef0ea2fde064d6f3c3d40b9800c9a9a3ce";
    };

    fenix = {
      url = "github:nix-community/fenix?rev=15c95e2adbe285c82ce347a31110b83d13aad586";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    flakebox = {
      url = "github:rustshop/flakebox?rev=b141d3c7640a7f6fff8da2dec50a72bcbed15056";
      inputs.fenix.follows = "fenix";
    };

    fs-dir-cache = {
      url = "github:dpc/fs-dir-cache?rev=a6371f48f84512ea06a8ac671f9cdc141a732673";
    };

    android-nixpkgs = {
      url = "github:tadfisher/android-nixpkgs?rev=6370a3aafe37ed453bfdc4af578eb26339f8fee0"; # stable
      # inputs.nixpkgs.follows = "fedimint-pkgs/nixpkgs";
    };
  };

  outputs = { self, nixpkgs, nixpkgs-unstable, flake-utils, fedimint-pkgs, fs-dir-cache, android-nixpkgs, flakebox, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs-unstable = import nixpkgs-unstable {
          inherit system;
        };
        pkgs-kitman = import fedimint-pkgs.inputs.nixpkgs-kitman {
          inherit system;
        };

        pkgs = import nixpkgs {
          inherit system;
          overlays = [
            (final: prev: {
              fs-dir-cache = fs-dir-cache.packages.${system}.default;
              fastlane = pkgs-unstable.fastlane;
              convco = pkgs-unstable.convco;

              esplora = pkgs-kitman.esplora;

              mprocs = prev.mprocs.overrideAttrs (final: prev: {
                patches = prev.patches ++ [
                  (builtins.fetchurl {
                    url = "https://github.com/pvolok/mprocs/pull/88.patch";
                    name = "clipboard-fix.patch";
                    sha256 = "sha256-9dx1vaEQ6kD66M+vsJLIq1FK+nEObuXSi3cmpSZuQWk=";
                  })
                ];
              });

              rocksdb_7_10 = prev.rocksdb_7_10.overrideAttrs (oldAttrs:
                pkgs.lib.optionalAttrs pkgs.stdenv.isDarwin {
                  # C++ and its damn super-fragie compilation
                  env = oldAttrs.env // {
                    NIX_CFLAGS_COMPILE = oldAttrs.env.NIX_CFLAGS_COMPILE + " -Wno-error=unused-but-set-variable";
                  };
                });

              rocksdb_6_23 = prev.rocksdb_6_23.overrideAttrs (oldAttrs:
                pkgs.lib.optionalAttrs pkgs.stdenv.isDarwin {
                  # C++ and its damn super-fragie compilation
                  env = oldAttrs.env // {
                    NIX_CFLAGS_COMPILE = oldAttrs.env.NIX_CFLAGS_COMPILE + " -Wno-error=unused-but-set-variable -Wno-error=deprecated-copy";
                  };
                });

              bitcoind = prev.bitcoind.overrideAttrs (oldAttrs: {
                # tests broken on Mac for some reason
                doCheck = !prev.stdenv.isDarwin;
              });

              # syncing channels doesn't work right on newer versions, exactly like described here
              # https://bitcoin.stackexchange.com/questions/84765/how-can-channel-policy-be-missing
              # note that config-time `--enable-developer` turns into run-time `--developer` at some
              # point
              clightning = prev.clightning.overrideAttrs (oldAttrs: rec {
                version = "23.05.2";
                src = prev.fetchurl {
                  url = "https://github.com/ElementsProject/lightning/releases/download/v${version}/clightning-v${version}.zip";
                  sha256 = "sha256-Tj5ybVaxpk5wmOw85LkeU4pgM9NYl6SnmDG2gyXrTHw=";
                };
                makeFlags = [ "VERSION=v${version}" ];
                configureFlags = [ "--enable-developer" "--disable-valgrind" ];
                NIX_CFLAGS_COMPILE = "-w";
              });

              # Note: shell script adding DYLD_FALLBACK_LIBRARY_PATH because of: https://github.com/nextest-rs/nextest/issues/962
              cargo-nextest = pkgs.writeShellScriptBin "cargo-nextest" "exec env DYLD_FALLBACK_LIBRARY_PATH=\"$(dirname $(${pkgs.which}/bin/which rustc))/../lib\" ${prev.cargo-nextest}/bin/cargo-nextest \"$@\"";
            })
          ];
        };

        fmLib = fedimint-pkgs.lib.${system};

        # Replace placeholder git hash in a binary
        #
        # To avoid impurity, we use a git hash placeholder when building binaries
        # and then replace them with the real git hash in the binaries themselves.
        #
        # BUG: rev and dirtyRev are not available in-local flake builds. :/
        replaceGitHash =
          let
            # the hash we will set if the tree is dirty;
            dirtyHashPrefix = builtins.substring 0 16 self.dirtyRev;
            dirtyHashSuffix = builtins.substring (40 - 16) 16 self.dirtyRev;
            # the string needs to be 40 characters, like the original,
            # so to denote `-dirty` we replace the middle with zeros
            dirtyHash = "${dirtyHashPrefix}00000000${dirtyHashSuffix}";
          in
          { name
          , package
          , placeholder ? "01234569abcdef7afa1d2683a099c7af48a523c1"
          , gitHash ? if (self ? rev) then self.rev else if (self ? dirtyRev) then dirtyHash else placeholder
          }:
          stdenv.mkDerivation {
            inherit system;
            inherit name;

            dontUnpack = true;
            dontStrip = !pkgs.stdenv.isDarwin;

            installPhase = ''
              cp -a ${package} $out
              for path in `find $out -type f -executable`; do
                # need to use a temporary file not to overwrite source as we are reading it
                bbe -e 's/${placeholder}/${gitHash}/' $path -o ./tmp || exit 1
                chmod +w $path
                # use cat to keep all the original permissions etc as they were
                cat ./tmp > "$path"
                chmod -w $path
              done
            '';

            buildInputs = [ pkgs.bbe ];
          };

        # TODO: use this version after updating upstream fedimint to handle `gitHash` argument
        # replaceGitHash = name: package: fmLib.replaceGitHash {
        #   # FIXME: don't hard-code this. But I don't know how to get it from craneLib
        #   inherit name package; placeholder = "01234569abcdef7afa1d2683a099c7af48a523c1";
        # gitHash ? if (self ? rev) then self.rev else dirty-hash
        # };


        androidSdk =
          android-nixpkgs.sdk."${system}" (sdkPkgs: with sdkPkgs; [
            cmdline-tools-latest
            build-tools-30-0-3
            build-tools-32-0-0
            build-tools-33-0-0
            platform-tools
            platforms-android-31
            platforms-android-33
            emulator
            ndk-bundle
            ndk-23-1-7779620
            cmake-3-22-1
            patcher-v4
            tools
          ]);


        flakeboxLib = flakebox.lib.${system} {
          # customizations will go here in the future
          config = {
            toolchain.channel.default = "latest";

            # we have our own weird CI workflows
            github.ci.enable = false;
            just.includePaths = [
              "justfile.fedi"
            ];
            typos.pre-commit.enable = false;
            git.pre-commit.trailing_newline = false;

            # we must not use --workspace anywhere
            just.rules.clippy.content = lib.mkForce ''
              # run `cargo clippy` on everything
              clippy *ARGS="--locked --offline --all-targets":
                cargo clippy {{ARGS}}
                cargo clippy --package fedi-wasm --target wasm32-unknown-unknown {{ARGS}}

              # run `cargo clippy --fix` on everything
              clippy-fix *ARGS="--locked --offline --all-targets":
                just clippy {{ARGS}} --fix
            '';
            just.rules.build.content = lib.mkForce ''
              # run `cargo build` on everything
              build:
                cargo build --all-targets
            '';
            just.rules.check.content = lib.mkForce ''
              # run `cargo check` on everything
              check:
                cargo check --all-targets
            '';
          };
        };

        toolchainArgs = let llvmPackages = pkgs.llvmPackages_11; in {
          inherit androidSdk;
          componentTargetsChannelName = "latest";
          extraRustFlags = "--cfg tokio_unstable";

          components = [
            "rustc"
            "cargo"
            "clippy"
            "rust-analyzer"
            "rust-analysis"
            "rust-src"
            "llvm-tools-preview"
          ];
        } // lib.optionalAttrs pkgs.stdenv.isDarwin {
          # on Darwin newest stdenv doesn't seem to work
          # linking rocksdb
          stdenv = pkgs.clang11Stdenv;
          clang = llvmPackages.clang;
          libclang = llvmPackages.libclang.lib;
          clang-unwrapped = llvmPackages.clang-unwrapped;
        };

        toolchains = (pkgs.lib.getAttrs
          ([
            "default"
            "aarch64-android"
            "x86_64-android"
            "arm-android"
            "armv7-android"
            "wasm32-unknown"
          ] ++ lib.optionals pkgs.stdenv.isDarwin [
            "aarch64-ios"
            "aarch64-ios-sim"
            "x86_64-ios"
          ])
          (flakeboxLib.mkStdFenixToolchains toolchainArgs)
        );
        toolchain = flakeboxLib.mkFenixMultiToolchain {
          inherit toolchains;
          componentTargetsChannelName = "latest";
        };

        craneMultiBuild = import nix/flakebox.nix {
          inherit pkgs pkgs-unstable flakeboxLib fedimint-pkgs toolchains replaceGitHash pkgs-kitman;
        };

        lib = pkgs.lib;
        stdenv = pkgs.stdenv;

        # this symlinks binaries needed to run xcode-specific commands assuming
        # xcode is already installed on the machine (can't be nixified normally)
        xcode-wrapper = stdenv.mkDerivation {
          name = "xcode-wrapper-15.0.1";
          buildCommand = ''
            mkdir -p $out/bin

            ln -s /usr/bin/ld $out/bin/ld
            ln -s /usr/bin/clang $out/bin/clang
            ln -s /usr/bin/xcodebuild $out/bin/xcodebuild
            ln -s /usr/bin/xcrun $out/bin/xcrun

            # Check if we have the xcodebuild version that we want
            if [ -z "$($out/bin/xcodebuild -version | grep 15.0.1)" ]
            then
                echo "xcodebuild version: 15.0.1 is required"
                echo "run: \`just install-xcode\` to install Xcode.app from the CLI"
                exit 1
            fi
          '';
        };

        crossDevShell = flakeboxLib.mkDevShell (craneMultiBuild.commonEnvsShell // craneMultiBuild.commonEnvsShellRocksdbLink // {
          inherit toolchain;
          nativeBuildInputs =
            [
              (lib.hiPrio toolchains.default.toolchain)
              fedimint-pkgs.packages.${system}.devimint
              fedimint-pkgs.packages.${system}.gateway-pkgs
              pkgs.fs-dir-cache
              pkgs.cargo-nextest
              pkgs.cargo-audit
              pkgs.curl # wasm build needs it for some reason
              pkgs.wasm-pack
              pkgs.wasm-bindgen-cli
              pkgs.binaryen
              pkgs.gnused
              pkgs.yarn
              pkgs.nodejs
              pkgs.nodePackages.prettier # for ts-bindgen
              pkgs.jdk17
              pkgs.nodePackages.typescript-language-server
              # tools for managing native app deployments
              pkgs.fastlane
              pkgs.ruby
              pkgs.perl
              pkgs.pkg-config
              pkgs.mprocs
              pkgs.bitcoind
              pkgs.electrs
              pkgs.esplora
              pkgs.clightning
              pkgs.lnd
              pkgs.sccache

              androidSdk
            ];

          buildInputs = [ pkgs.openssl ];

          FEDI_CROSS_DEV_SHELL = "1";
          RUSTFLAGS = "-Z threads=8";
          shellHook = ''
            export PATH=$PATH:''${ANDROID_SDK_ROOT}/../../bin
            alias create-avd="avdmanager create avd --force --name phone --package 'system-images;android-32;google_apis;arm64-v8a' --path $PWD/avd";
            alias emulator="emulator -avd phone"

            # hijack cargo for our evil purposes
            export CARGO_ORIG_BIN="$(${pkgs.which}/bin/which cargo)"
            git_root="$(git rev-parse --show-toplevel)"
            export PATH="''${git_root}/nix/cargo-wrapper/:$PATH"
            export RUSTC_WRAPPER=${pkgs.sccache}/bin/sccache
          '';
        });
      in
      {
        packages = {
          # straight from Fedimint, without any modifications
          gateway-pkgs = fedimint-pkgs.packages.${system}.gateway-pkgs;
          gatewayd = fedimint-pkgs.packages.${system}.gatewayd;
          gateway-cli = fedimint-pkgs.packages.${system}.gateway-cli;
          fedimint-dbtool = flakeboxLib.pickBinary { bin = "fedimint-dbtool"; pkg = fedimint-pkgs.packages.${system}.fedimint-pkgs; };

          fedi-fedimint-pkgs = craneMultiBuild.fedi-fedimint-pkgs;
          fedi-fedimintd = craneMultiBuild.fedi-fedimintd;
          fedi-fedimint-cli = craneMultiBuild.fedi-fedimint-cli;

          fedi-wasm = craneMultiBuild.wasm32-unknown.release.fedi-wasm;
        };

        legacyPackages = craneMultiBuild;

        devShells = fmLib.devShells // {
          default = crossDevShell;
          # TODO: this is overriden just to fix semgrep on MacOS,
          # which will be fixed upstream as well. Then this whole section
          # can be removed
          lint = flakeboxLib.mkDevShell
            { };

          # nix develop .#xcode is used for running commands that depend on an
          # existing underlying Xcode installation that cannot be nixified
          xcode = crossDevShell.overrideAttrs (prev: {
            nativeBuildInputs = lib.optionals stdenv.isDarwin [
              pkgs.bundler
              pkgs.cocoapods
              xcode-wrapper
              pkgs.fs-dir-cache
            ] ++ prev.nativeBuildInputs;
            shellHook = prev.shellHook
              + ''
              # CocoaPods requires the terminal to be using UTF-8 encoding.
              export LC_ALL=en_US.UTF-8
              export LANG=en_US.UTF-8

              # LD envs are needed because xcodebuild is confused and tries
              # to use ld instead of clang for linking the bridge binary
              export LD=/usr/bin/clang
              export LD_FOR_TARGET=/usr/bin/clang
              export MACOSX_DEPLOYMENT_TARGET=""
            '';
          });
          # tool for managing pwa deployment
          vercel = crossDevShell.overrideAttrs (prev: {
            nativeBuildInputs = prev.nativeBuildInputs
              ++ [
              pkgs.nodePackages_latest.vercel
            ];
          });
        };
      });


  nixConfig = {
    extra-substituters = [ "https://fedibtc.cachix.org" ];
    extra-trusted-public-keys = [ "fedibtc.cachix.org-1:KyG8I1663EYQm2ThciPUvjm1r9PHiZbOYz4goj+U76k=" ];
  };
}
