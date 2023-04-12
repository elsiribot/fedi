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
      url = "github:fedimint/fedimint?rev=b283f4e2c5d4ccacd1293276e4880a5918013981";
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
        pkgs-kitman = import fedimint-build.inputs.nixpkgs-kitman {
          inherit system;
        };
        android-nixpkgs = fedimint-build.inputs.android-nixpkgs;
        advisory-db = fedimint-build.inputs.advisory-db;

        clightning-dev = pkgs.clightning.overrideAttrs (oldAttrs: {
          configureFlags = [ "--enable-developer" "--disable-valgrind" ];
        } // pkgs.lib.optionalAttrs (!pkgs.stdenv.isDarwin) {
          NIX_CFLAGS_COMPILE = "-Wno-stringop-truncation";
        });

        # `moreutils/bin/parallel` and `parallel/bin/parallel` conflict, so just use
        # the binary we need from `moreutils`

        moreutils-ts = pkgs.writeShellScriptBin "ts" "exec ${pkgs.moreutils}/bin/ts \"$@\"";

        commonArgsBase = fmLib.commonArgsBase;

        lib = pkgs.lib;
        stdenv = pkgs.stdenv;

        fenixChannel = fenix.packages.${system}.stable;

        fenixToolchain = (fenixChannel.withComponents [
          "rustc"
          "cargo"
          "clippy"
          "rust-analysis"
          "rust-src"
          "llvm-tools-preview"
        ]);


        toolchain = import ./flake.toolchain.nix
          {

            inherit pkgs lib system stdenv fenix crane android-nixpkgs;
          };


        craneBuild = import ./flake.crane.nix
          {
            inherit pkgs pkgs-kitman clightning-dev advisory-db lib moreutils-ts;
          };

        craneBuildNative = craneBuild toolchain.craneLibNative;
        craneBuildNativeDocExport = craneBuild toolchain.craneLibNativeDocExport;
        craneBuildCross = target: craneBuild toolchain.craneLibCross.${target};

        craneLib = crane.lib.${system}.overrideToolchain fenixToolchain;

        # outputs that build a particular Rust package
        rustPackageOutputs = {
          fedi-wasm = (craneBuildCross "wasm32-unknown-unknown").fedi-wasm {
            target = toolchain.crossTargets."wasm32-unknown-unknown";
          };
        };

        # rust packages outputs with git hash replaced
        rustPackageOutputsFinal = builtins.mapAttrs (name: package: fmLib.replaceGitHash { inherit name package; }) rustPackageOutputs;

        fedi-fedimint-pkgs = craneLib.buildPackage (commonArgsBase // {
          version = "0.0.1";
          pname = "fedi-fedimint-pkgs";
          src = ./.;
          cargoExtraArgs = "--package fedi-fedimintd --package fedi-fedimint-cli";
          doCheck = false;
        });
      in
      {
        packages =
          {
            inherit fedi-fedimint-pkgs;
            gateway-pkgs = fedimint-pkgs.packages.${system}.gateway-pkgs;
          } // rustPackageOutputsFinal;

        devShells = fmLib.devShells // {
          cross = fmLib.devShells.cross.overrideAttrs (prev: {
            nativeBuildInputs = prev.nativeBuildInputs ++ [ pkgs.wasm-pack pkgs.wasm-bindgen-cli pkgs.binaryen ];
          });
        };
      });

}
