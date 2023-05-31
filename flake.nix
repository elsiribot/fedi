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
      url = "git+https://x-access-token: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@github.com/fedibtc/fedimint-fedi.git?ref=rel-a05&rev=3cfbec360788a2be286e0caa37fd7e61cf68fbbd";
    };
    # we only pick build system stuff here, so we can be more relaxed about updating it
    fedimint-build = {
      url = "github:dpc/fedimint?rev=505c9cc809efc4133ff204a938da6b7c9455ddd4"; # https://github.com/fedimint/fedimint/pull/2546
    };

    android-nixpkgs = {
      url = "github:tadfisher/android-nixpkgs?rev=297976c270bfe86feb57bd66c27a5ad9b4dea3f1"; # stable
    };
  };

  outputs = { self, nixpkgs, nixpkgs-unstable, flake-utils, flake-compat, fedimint-pkgs, fedimint-build, android-nixpkgs }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        nixpkgs = fedimint-build.inputs.nixpkgs;
        pkgs = import nixpkgs {
          inherit system;
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
      in
      {
        packages = {
          # straight from Fedimint, without any modifications
          gateway-pkgs = fedimint-pkgs.packages.${system}.gateway-pkgs;
          fedi-fedimint-pkgs = rustPackages.fedi-fedimint-pkgs;
          dbtool-pkgs = fedimint-pkgs.packages.${system}.fedimint-dbtool-pkgs;
        } // rustPackagesFinal;

        devShells = fmLib.devShells // {
          default = fmLib.devShells.default.overrideAttrs (prev: {
            nativeBuildInputs = [
              fedimint-build.packages.${system}.devimint
              fedimint-pkgs.packages.${system}.gateway-pkgs
              fedimint-pkgs.packages.${system}.fedimint-dbtool-pkgs
            ] ++ prev.nativeBuildInputs;
          });
          cross = fmLib.devShells.cross.overrideAttrs (prev: {
            nativeBuildInputs =
              [
                (pkgs.hiPrio toolchains.fenixToolchainCrossAll)
              ] ++
              prev.nativeBuildInputs ++ [
                pkgs.wasm-pack
                pkgs.wasm-bindgen-cli
                pkgs.binaryen
                pkgs.gnused
                pkgs.yarn
                pkgs.nodejs
              ] ++ lib.optionals stdenv.isDarwin [
                pkgs.cocoapods
              ];
            ANDROID_SDK_ROOT = "${toolchains.androidSdk}/share/android-sdk/";
            ANDROID_HOME = "${toolchains.androidSdk}/share/android-sdk/";
            shellHook = prev.shellHook + toolchains.wasm32CrossEnvVars + toolchains.iosCrossEnvVars;
          });
        };
      });


  nixConfig = {
    extra-substituters = [ "https://fedibtc.cachix.org" ];
    extra-trusted-public-keys = [ "fedibtc.cachix.org-1:KyG8I1663EYQm2ThciPUvjm1r9PHiZbOYz4goj+U76k=" ];
  };
}
