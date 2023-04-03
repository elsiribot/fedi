{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-22.11";
    nixpkgs-unstable.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    flake-compat = {
      url = "github:edolstra/flake-compat";
      flake = false;
    };
    fedimint = {
      url = "github:fedibtc/fedimint-fedi?rev=bd3d75a739af0f66a21f1f6d203979d1d5d13743";
    };
  };

  outputs = { self, nixpkgs, nixpkgs-unstable, flake-utils, flake-compat, fedimint }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };
        fmLib = fedimint.lib.${system};
        crane = fedimint.inputs.crane;
        fenix = fedimint.inputs.fenix;
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
            gateway-pkgs = fedimint.packages.${system}.gateway-pkgs;
          };
        devShells = fmLib.devShells;
      });

}
