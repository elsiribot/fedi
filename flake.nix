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
        commonArgsBase = fmLib.commonArgsBase;


        # lib = pkgs.lib;
        # stdenv = pkgs.stdenv;

        fenixChannel = fenix.packages.${system}.stable;

        fenixToolchain = (fenixChannel.withComponents [
          "rustc"
          "cargo"
          "clippy"
          "rust-analysis"
          "rust-src"
          "llvm-tools-preview"
        ]);

        craneLib = crane.lib.${system}.overrideToolchain fenixToolchain;

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
          };
        devShells = fmLib.devShells;
      });

}
