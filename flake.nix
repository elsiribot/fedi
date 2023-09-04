{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-22.11";
    nixpkgs-unstable.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    flake-compat = {
      url = "github:edolstra/flake-compat";
      flake = false;
    };
    # we pick upstream packages from here, so we want this to be compatible with our forks
    fedimint-pkgs = {
      url = "git+https://x-access-token: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@github.com/fedibtc/fedimint-fedi.git?ref=rel-a05&rev=c4feb8d487b604dce68082df12bb5fc862421784";
    };
    # we only pick build system stuff here, so we can be more relaxed about updating it
    fedimint-build = {
      url = "github:dpc/fedimint?rev=505c9cc809efc4133ff204a938da6b7c9455ddd4"; # https://github.com/fedimint/fedimint/pull/2546
    };

    android-nixpkgs = {
      url = "github:tadfisher/android-nixpkgs?rev=297976c270bfe86feb57bd66c27a5ad9b4dea3f1"; # stable
    };

    fs-dir-cache = {
      url = "github:dpc/fs-dir-cache?rev=a6371f48f84512ea06a8ac671f9cdc141a732673";
    };
  };

  outputs = { self, nixpkgs, nixpkgs-unstable, flake-utils, flake-compat, fedimint-pkgs, fedimint-build, android-nixpkgs, fs-dir-cache }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        nixpkgs = fedimint-build.inputs.nixpkgs;
        pkgs-unstable = import nixpkgs-unstable {
          inherit system;
        };
        pkgs = import nixpkgs {
          inherit system;
          overlays = [
            (final: prev: {
              fs-dir-cache = fs-dir-cache.packages.${system}.default;
              convco = pkgs-unstable.convco;
            })
          ];
        };
        pkgs-kitman = import fedimint-build.inputs.nixpkgs-kitman {
          inherit system;
        };
        fmLib = fedimint-build.lib.${system};
        crane = fedimint-build.inputs.crane;
        fenix = fedimint-build.inputs.fenix;
        advisory-db = fedimint-build.inputs.advisory-db;

        clightning-dev = pkgs.clightning.overrideAttrs (oldAttrs: {
          configureFlags = [ "--enable-developer" "--disable-valgrind" ];
        } // pkgs.lib.optionalAttrs (!pkgs.stdenv.isDarwin) {
          NIX_CFLAGS_COMPILE = "-Wno-stringop-truncation";
        });

        filterSubdirs = import ./nix/filterSubdirs.nix { inherit lib; };

        # filter (roughly) only files&directories that Rust build needs to make
        # caching easier for Nix/crane
        rustSrc =
          filterSubdirs {
            root = ./.;
            dirs = [
              "Cargo.toml"
              "Cargo.lock"
              "Cargo.wasm32.lock"
              ".cargo"
              "bridge"
              "fedimintd"
              "fedimint-cli"
              "fedi-social-client"
              "fedi-social-common"
              "fedi-social-server"
              "fedi-monitoring"
              # bridge test script
              "scripts"
              "misc"
            ];
          };

        lib = pkgs.lib;
        stdenv = pkgs.stdenv;

        toolchains = import ./nix/toolchains.nix {
          inherit pkgs lib system stdenv fenix android-nixpkgs;
        };

        craneLibNative = crane.lib.${system}.overrideToolchain toolchains.fenixToolchain;

        craneLibCross = builtins.mapAttrs
          (name: target: crane.lib.${system}.overrideToolchain toolchains.fenixToolchainCross.${name})
          toolchains.crossTargets
        ;

        craneLibBuildNative = import ./nix/crane.nix {
          inherit pkgs pkgs-kitman lib advisory-db fedimint-build fedimint-pkgs clightning-dev;
          src = rustSrc;
          craneLib = craneLibNative;
          profile = "release";
        };

        craneLibBuildCross =
          builtins.mapAttrs
            (name: target:
              import ./nix/crane.nix
                {
                  inherit pkgs pkgs-kitman lib advisory-db target fedimint-build fedimint-pkgs clightning-dev;
                  src = rustSrc;
                  craneLib = craneLibCross.${name};
                  profile = "release";
                }
            )
            toolchains.crossTargets;

        # outputs that build a particular Rust package
        rustPackages = {
          fedi-fedimint-pkgs = craneLibBuildNative.pkgsBuild {
            name = "fedi-fedimint-pkgs";
            pkgs = {
              fedi-fedimintd = { };
              fedi-fedimint-cli = { };
            };
          };

          fedi-wasm = craneLibBuildCross."wasm32-unknown-unknown".pkgsBuild {
            name = "fedi-wasm";
            cargoLock = ./Cargo.wasm32.lock;
            pkgs = {
              fedi-wasm = { };
            };
          };

          fedi-monitoring = craneLibBuildNative.pkgsBuild {
            name = "fedi-monitoring";
            pkgs = {
              fedi-monitoring = { };
            };
          };

          testBridge = craneLibBuildNative.testBridge;
        };

        # rust packages outputs with git hash replaced
        rustPackagesFinal = builtins.mapAttrs (name: package: fmLib.replaceGitHash { inherit name package; }) rustPackages;

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

        crossDevShell = fmLib.devShells.cross.overrideAttrs (prev: {
          nativeBuildInputs =
            [
              (pkgs.hiPrio toolchains.fenixToolchainCrossAll)
            ] ++ [
              fedimint-build.packages.${system}.devimint
              fedimint-pkgs.packages.${system}.gateway-pkgs
              fedimint-pkgs.packages.${system}.fedimint-dbtool-pkgs
              pkgs.git
              pkgs.fs-dir-cache
              pkgs.convco
            ]
            ++ [
              pkgs.git
              pkgs.wasm-pack
              pkgs.wasm-bindgen-cli
              pkgs.binaryen
              pkgs.gnused
              pkgs.yarn
              pkgs.nodejs
              pkgs.jdk17
              # tools for managing native app deployments
              pkgs.fastlane
              pkgs.ruby
              pkgs.fs-dir-cache
            ]
            ++ prev.nativeBuildInputs;
          ANDROID_SDK_ROOT = "${toolchains.androidSdk}/share/android-sdk/";
          ANDROID_HOME = "${toolchains.androidSdk}/share/android-sdk/";
          FEDI_CROSS_DEV_SHELL = "1";
          shellHook = prev.shellHook
            + toolchains.wasm32CrossEnvVars
            + toolchains.iosCrossEnvVars
            + toolchains.androidCrossEnvVars
            + ''
            export PATH=$PATH:${toolchains.androidSdk}/bin
            alias create-avd="avdmanager create avd --force --name phone --package 'system-images;android-32;google_apis;arm64-v8a' --path $PWD/avd";
            alias emulator="emulator -avd phone"
          '';
        });
      in
      {
        packages = {
          # straight from Fedimint, without any modifications
          gateway-pkgs = fedimint-pkgs.packages.${system}.gateway-pkgs;
          fedi-fedimint-pkgs = rustPackages.fedi-fedimint-pkgs;
          dbtool-pkgs = fedimint-pkgs.packages.${system}.fedimint-dbtool-pkgs;
        } // rustPackagesFinal;

        devShells = fmLib.devShells // {
          default = crossDevShell;
          # TODO: this is overriden just to fix semgrep on MacOS,
          # which will be fixed upstream as well. Then this whole section
          # can be removed
          lint = fmLib.devShells.lint.overrideAttrs (prev:
            let
              moreutils-ts = pkgs.writeShellScriptBin "ts" "exec ${pkgs.moreutils}/bin/ts \"$@\"";
            in
            {
              nativeBuildInputs = with pkgs; [
                toolchains.fenixToolchainCargoFmt
                nixpkgs-fmt
                shellcheck
                git
                parallel
                typos
                convco
                moreutils-ts
                nix
              ] ++ lib.optionals (!pkgs.stdenv.isDarwin) [
                semgrep
              ];

            });

          cross = crossDevShell;
          # nix develop .#xcode is used for running commands that depend on an
          # existing underlying Xcode installation that cannot be nixified
          xcode = crossDevShell.overrideAttrs (prev: {
            nativeBuildInputs = prev.nativeBuildInputs
              ++ lib.optionals stdenv.isDarwin [
              pkgs.cocoapods
              xcode-wrapper
              pkgs.fs-dir-cache
            ];
            shellHook = prev.shellHook
              + ''
              # CocoaPods requires the terminal to be using UTF-8 encoding.
              export LANG=en_US.UTF-8
            '';
          });
        };
      });


  nixConfig = {
    extra-substituters = [ "https://fedibtc.cachix.org" ];
    extra-trusted-public-keys = [ "fedibtc.cachix.org-1:KyG8I1663EYQm2ThciPUvjm1r9PHiZbOYz4goj+U76k=" ];
  };
}
