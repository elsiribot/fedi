{
  inputs = {
    nixpkgs-unstable.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    # we pick upstream packages from here, so we want this to be compatible with our forks
    fedimint-pkgs = {
      url = "git+https://x-access-token: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@github.com/fedibtc/fedimint-fedi.git?ref=shaurya947/rel-a06-r3&rev=9ed84b8e9a5baf252bb560c24dd2cc673532d056";
    };
    # we only pick build system stuff here, so we can be more relaxed about updating it
    fedimint-build = {
      url = "git+https://x-access-token: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@github.com/fedibtc/fedimint-fedi.git?ref=shaurya947/rel-a06-r3&rev=9ed84b8e9a5baf252bb560c24dd2cc673532d056";
    };
    # Fedi at consensus version 0. This is used to test bridge against old federations
    fedi-v0 = {
      url = "git+https://x-access-token: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@github.com/fedibtc/fedi.git?ref=master&rev=3502c58bdf37e9abf32615d3ba14b1a109922554";
    };

    flakebox = {
      url = "github:rustshop/flakebox?rev=a837aa4a2c9587313890ae2d0d4799dccb009c2f";
      # inputs.nixpkgs.follows = "fedimint-build/nixpkgs";
    };

    fs-dir-cache = {
      url = "github:dpc/fs-dir-cache?rev=a6371f48f84512ea06a8ac671f9cdc141a732673";
    };

    android-nixpkgs = {
      url = "github:tadfisher/android-nixpkgs?rev=6370a3aafe37ed453bfdc4af578eb26339f8fee0"; # stable
      inputs.nixpkgs.follows = "fedimint-build/nixpkgs";
    };
  };

  outputs = { self, nixpkgs-unstable, flake-utils, fedimint-pkgs, fedimint-build, fs-dir-cache, android-nixpkgs, fedi-v0, flakebox }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        nixpkgs = fedimint-build.inputs.nixpkgs;
        pkgs-unstable = import nixpkgs-unstable {
          inherit system;
        };
        pkgs-kitman = import fedimint-build.inputs.nixpkgs-kitman {
          inherit system;
        };

        pkgs = import nixpkgs {
          inherit system;
          overlays = [
            (final: prev: {
              fs-dir-cache = fs-dir-cache.packages.${system}.default;
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

              clightning = prev.clightning.overrideAttrs (oldAttrs: {
                configureFlags = [ "--enable-developer" "--disable-valgrind" ];
              } // pkgs.lib.optionalAttrs (!pkgs.stdenv.isDarwin) {
                NIX_CFLAGS_COMPILE = "-Wno-stringop-truncation -w";
              });

              # mold wrapper from https://discourse.nixos.org/t/using-mold-as-linker-prevents-libraries-from-being-found/18530/5
              mold =
                let
                  bintools-wrapper = "${nixpkgs}/pkgs/build-support/bintools-wrapper";
                in
                prev.symlinkJoin {
                  name = "mold";
                  paths = [ prev.mold ];
                  nativeBuildInputs = [ prev.makeWrapper ];
                  suffixSalt = lib.replaceStrings [ "-" "." ] [ "_" "_" ] prev.targetPlatform.config;
                  postBuild = ''
                    for bin in ${prev.mold}/bin/*; do
                      rm $out/bin/"$(basename "$bin")"

                      export prog="$bin"
                      substituteAll "${bintools-wrapper}/ld-wrapper.sh" $out/bin/"$(basename "$bin")"
                      chmod +x $out/bin/"$(basename "$bin")"

                      mkdir -p $out/nix-support
                      substituteAll "${bintools-wrapper}/add-flags.sh" $out/nix-support/add-flags.sh
                      substituteAll "${bintools-wrapper}/add-hardening.sh" $out/nix-support/add-hardening.sh
                      substituteAll "${bintools-wrapper}/../wrapper-common/utils.bash" $out/nix-support/utils.bash
                    done
                  '';
                };

              # Note: we are using cargo-nextest from pkgs-unstable because it has some fixes we need
              # Note: shell script adding DYLD_FALLBACK_LIBRARY_PATH because of: https://github.com/nextest-rs/nextest/issues/962
              cargo-nextest = pkgs.writeShellScriptBin "cargo-nextest" "exec env DYLD_FALLBACK_LIBRARY_PATH=\"$(dirname $(which rustc))/../lib\" ${pkgs-unstable.cargo-nextest}/bin/cargo-nextest \"$@\"";

            })
          ];
        };

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
            # we have our own weird CI workflows
            github.ci.enable = false;
            just.rules = {
              custom = {
                content = ./justfile.fedi;
              };
            };
            typos.pre-commit.enable = false;
            git.pre-commit.trailing_newline = false;
          };
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
          (flakeboxLib.mkStdFenixToolchains {
            inherit androidSdk;
          })
        );
        toolchain = flakeboxLib.mkFenixMultiToolchain {
          inherit toolchains;
        };

        craneMultiBuild = import nix/flakebox.nix {
          inherit pkgs flakeboxLib fedi-v0 fedimint-build fedimint-pkgs toolchains;
        };

        fmLib = fedimint-build.lib.${system};


        lib = pkgs.lib;
        stdenv = pkgs.stdenv;

        replaceGitHash = name: package: fmLib.replaceGitHash {
          # FIXME: don't hard-code this. But I don't know how to get it from craneLib
          inherit name package; placeholder = "01234569abcdef7afa1d2683a099c7af48a523c1";
        };

        # this symlinks binaries needed to run xcode-specific commands assuming
        # xcode is already installed on the machine (can't be nixified normally)
        xcode-wrapper = stdenv.mkDerivation {
          name = "xcode-wrapper-14.3.1";
          buildCommand = ''
            mkdir -p $out/bin

            ln -s /usr/bin/ld $out/bin/ld
            ln -s /usr/bin/clang $out/bin/clang
            ln -s /usr/bin/xcodebuild $out/bin/xcodebuild
            ln -s /usr/bin/xcrun $out/bin/xcrun

            # Check if we have the xcodebuild version that we want
            if [ -z "$($out/bin/xcodebuild -version | grep 14.3.1)" ]
            then
                echo "xcodebuild version: 14.3.1 is required"
                echo "run: \`just install-xcode\` to install Xcode.app from the CLI"
                exit 1
            fi
          '';
        };

        crossDevShell = flakeboxLib.mkDevShell (craneMultiBuild.commonEnvsShell // {
          inherit toolchain;
          nativeBuildInputs =
            [
              fedimint-build.packages.${system}.devimint
              fedimint-pkgs.packages.${system}.gateway-pkgs
              fedimint-pkgs.packages.${system}.fedimint-pkgs
              pkgs.fs-dir-cache
              pkgs.cargo-nextest
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
              pkgs.llvmPackages_14.clang
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
            ];

          buildInputs = [ pkgs.openssl ];

          FEDI_CROSS_DEV_SHELL = "1";
          shellHook = ''
            export PATH=$PATH:''${ANDROID_SDK_ROOT}/../../bin
            alias create-avd="avdmanager create avd --force --name phone --package 'system-images;android-32;google_apis;arm64-v8a' --path $PWD/avd";
            alias emulator="emulator -avd phone"
          '';
        });
      in
      {
        packages = {
          # straight from Fedimint, without any modifications
          gateway-pkgs = fedimint-pkgs.packages.${system}.gateway-pkgs;

          fedi-fedimint-pkgs = replaceGitHash "fedi-fedimint-pkgs" craneMultiBuild.fedi-fedimint-pkgs;
          fedi-monitoring = craneMultiBuild.fedi-monitoring;
          fedi-wasm = craneMultiBuild.wasm32-unknown.release.fedi-wasm;
          devops-cli = craneMultiBuild.fedi-monitoring;
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
            '';
          });
          v0 = fedi-v0.devShells.${system}.default.overrideAttrs (prev: {
            nativeBuildInputs = [
              fedi-v0.packages.${system}.fedi-fedimint-pkgs
            ]
            ++ prev.nativeBuildInputs;
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
