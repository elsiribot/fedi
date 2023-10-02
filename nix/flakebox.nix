{ pkgs, flakebox, fedi-v0, fedimint-build, fedimint-pkgs, clightning-dev }:
let
  system = pkgs.system;
  flakeboxLib = flakebox.lib.${system} {
    # customizations will go here in the future
  };

  rustSrcDirs = [
    "Cargo.toml"
    "Cargo.lock"
    ".cargo"
    ".config"
    "bridge"
    "fedimintd"
    "fedimint-cli"
    "fedi-social-client"
    "fedi-social-common"
    "fedi-social-server"
    "fedi-monitoring"
    "devops-cli"
  ];

  # filter (roughly) only files&directories that Rust build needs to make
  # caching easier for Nix/crane
  rustSrc =
    flakeboxLib.filter.filterSubdirs {
      root = ../.;
      dirs = rustSrcDirs;
    };
  rustTestSrc =
    flakeboxLib.filter.filterSubdirs {
      root = ../.;
      dirs = rustSrcDirs ++ [
        # bridge test script
        "scripts"
        "misc"
      ];
    };
in
(flakeboxLib.buildOutputs { }) (craneLib':
let
  # placeholder we use to avoid actually needing to detect hash via runnning `git`
  # 012345... for easy recognizability (in case something went wrong),
  # rest randomized to avoid accidentally overwritting innocent bytes in the binary
  gitHashPlaceholderValue = "01234569abcdef7afa1d2683a099c7af48a523c1";

  commonEnvsShell = {
    LIBCLANG_PATH = "${pkgs.libclang.lib}/lib/";
    ROCKSDB_LIB_DIR = "${pkgs.rocksdb}/lib/";
    PROTOC = "${pkgs.protobuf}/bin/protoc";
    PROTOC_INCLUDE = "${pkgs.protobuf}/include";
  };

  craneLib =
    (craneLib'.overrideArgs' (craneLib: prev: ({
      pname = "fedi";
      version = "0.1.0";
      nativeBuildInputs = (prev.nativeBuildInputs or [ ]) ++ builtins.attrValues {
        inherit (pkgs) clang mold pkg-config;
        inherit (pkgs) cargo-nextest;
      };
      buildInputs = (prev.buildInputs or [ ]) ++ builtins.attrValues {
        inherit (pkgs) openssl;
      };
      src = rustSrc;
      FEDIMINT_BUILD_FORCE_GIT_HASH = gitHashPlaceholderValue;
    } // commonEnvsShell))).overrideArgsDepsOnly'
      (craneLib: prev: {
        # copy over the linker/ar wrapper scripts which by default would get
        # stripped by crane

        cargoVendorDir = craneLib.vendorCargoDeps {
          src = rustSrc;
        };

        dummySrc = craneLib.mkDummySrc {
          src = rustSrc;

          extraDummyScript = ''
            # temporary workaround: https://github.com/ipetkov/crane/issues/312#issuecomment-1601827484
            find $out
            rm -f $(find $out | grep bin/crane-dummy/main.rs)

            cp -ar ${../.cargo} --no-target-directory $out/.cargo
          '';
        };
        src = null;
      });
in
rec {
  workspaceDeps = craneLib.buildWorkspaceDepsOnly {
    buildPhaseCargoCommand = "cargoWithProfile doc --locked ; cargoWithProfile check --all-targets --locked ; cargoWithProfile build --locked --all-targets";
  };
  workspaceBuild = craneLib.buildWorkspace {
    cargoArtifacts = workspaceDeps;
    buildPhaseCargoCommand = "cargoWithProfile doc --locked ; cargoWithProfile check --all-targets --locked ; cargoWithProfile build --locked --all-targets";
  };

  fedi-fedimint-pkgs = craneLib.buildPackageGroup {
    pname = "fedi-fedimint-pkgs";
    packages = [
      "fedi-fedimintd"
      "fedi-fedimint-cli"
    ];
  };
  fedi-wasm = craneLib.buildPackageGroup {
    pname = "fedi-fedimint-pkgs";
    packages = [
      "fedi-wasm"
    ];
  };

  testBridgeV1 = craneLib.buildCommand {
    pname = "fedi-test-bridge-v1";
    cargoArtifacts = workspaceBuild;
    doInstallCargoArtifacts = false;
    src = rustTestSrc;

    nativeBuildInputs = craneLib.args.nativeBuildInputs ++ [
      fedimint-build.packages.${system}.devimint
      fedimint-pkgs.packages.${system}.gateway-pkgs
    ];
    cmd = ''
      patchShebangs ./scripts
      export FM_CARGO_DENY_COMPILATION=1
      export PATH="${pkgs.which}/bin:${pkgs.bitcoind}/bin:${pkgs.electrs}/bin:${clightning-dev}/bin:${pkgs.esplora}/bin:${pkgs.lnd}/bin:$PATH"

      for i in lnd lightningd gatewayd devimint esplora electrs bitcoind faucet ; do
         which $i
      done
      ./scripts/test-bridge-v1.sh
    '';
  };

  testBridgeV0 = craneLib.buildCommand {
    pname = "fedi-test-bridge-v0";
    cargoArtifacts = workspaceBuild;
    doInstallCargoArtifacts = false;
    src = rustTestSrc;

    nativeBuildInputs = craneLib.args.nativeBuildInputs ++ [
      fedi-v0.inputs.fedimint-build.packages.${system}.devimint
      fedi-v0.inputs.fedimint-pkgs.packages.${system}.gateway-pkgs
      fedi-v0.packages.${system}.fedi-fedimint-pkgs
      pkgs.jq
      pkgs.bc
    ];
    cmd = ''
      patchShebangs ./scripts
      export FM_CARGO_DENY_COMPILATION=1
      export PATH="${pkgs.which}/bin:${pkgs.bitcoind}/bin:${pkgs.electrs}/bin:${clightning-dev}/bin:${pkgs.esplora}/bin:${pkgs.lnd}/bin:$PATH"

      for i in fedimintd lnd lightningd gatewayd devimint esplora electrs bitcoind faucet distributedgen ; do
         which $i
      done
      ./scripts/test-bridge-v0.sh
    '';
  };

})
