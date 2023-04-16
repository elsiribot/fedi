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
      url = "git+https://x-access-token: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@github.com/fedibtc/fedimint-fedi.git?rev=0cd132c856df03953ab46e9644289a76cccfa9d9";
    };
    # we only pick build system stuff here, so we can be more relaxed about updating it
    fedimint-build = {
      url = "github:fedimint/fedimint?rev=e013b0e064cbe4a49e57d2e8c06bade8647016f9";
    };
  };

  outputs = { self, nixpkgs, nixpkgs-unstable, flake-utils, flake-compat, fedimint-pkgs, fedimint-build }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };
        fmLib = fedimint-build.lib.${system};
        crane = fedimint-build.inputs.crane;
        fenix = fedimint-build.inputs.fenix;
        android-nixpkgs = fedimint-build.inputs.android-nixpkgs;
        advisory-db = fedimint-build.inputs.advisory-db;

        filterSubdirs = import ./nix/filterSubdirs.nix { inherit lib; };

        # filter (roughly) only files&directories that Rust build needs to make
        # caching easier for Nix/crane
        rustSrc =
          filterSubdirs {
            root = ./.;
            dirs = [
              "Cargo.toml"
              "Cargo.lock"
              ".cargo"
              "bridge"
              "fedimintd"
              "fedimint-cli"
              "fedimint-client-fedi"
              "fedi-social-client"
              "fedi-social-common"
              "fedi-social-server"
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
          inherit pkgs lib advisory-db;
          src = rustSrc;
          craneLib = craneLibNative;
          profile = "release";
        };

        craneLibBuildCross =
          builtins.mapAttrs
            (name: target:
              import ./nix/crane.nix
                {
                  inherit pkgs lib advisory-db target;
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

            pkgs = {
              fedi-wasm = { };
            };
          };
        };

        # rust packages outputs with git hash replaced
        rustPackagesFinal = builtins.mapAttrs (name: package: fmLib.replaceGitHash { inherit name package; }) rustPackages;
      in
      {
        packages = {
          # straight from Fedimint, without any modifications
          gateway-pkgs = fedimint-pkgs.packages.${system}.gateway-pkgs;
        } // rustPackagesFinal;

        devShells = fmLib.devShells // {
          cross = fmLib.devShells.cross.overrideAttrs (prev: {
            nativeBuildInputs = prev.nativeBuildInputs ++ [ pkgs.wasm-pack pkgs.wasm-bindgen-cli pkgs.binaryen ];
          });
        };
      });

}
