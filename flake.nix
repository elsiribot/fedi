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
      url = "github:fedimint/fedimint?rev=2e432f1f3e02869f85a216b835aaa7fa67c9699d";
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

        fedimintd-fedi = craneLib.buildPackage (commonArgsBase // {
          pname = "fedimintd-fedi";
          src = ./.;
          cargoExtraArgs = "--package fedimintd-fedi";
          doCheck = false;
        });
      in
      {
        packages =
          {
            inherit fedimintd-fedi;
          };
        devShells = fmLib.devShells;
      });

}
