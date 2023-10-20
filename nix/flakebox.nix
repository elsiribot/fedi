{ pkgs, pkgs-unstable, flakeboxLib, fedi-v0, fedimint-build, fedimint-pkgs, toolchains, replaceGitHash }:
let
  system = pkgs.system;
  lib = pkgs.lib;

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
    "stability-pool/stability-pool-client"
    "stability-pool/stability-pool-common"
    "stability-pool/stability-pool-server"
    "stability-pool/stability-pool-tests"
  ];

  root = builtins.path {
    name = "fedi";
    path = ./..;
  };

  # filter (roughly) only files&directories that Rust build needs to make
  # caching easier for Nix/crane
  rustSrc =
    flakeboxLib.filter.filterSubdirs {
      inherit root;
      dirs = rustSrcDirs;
    };

  rustTestSrc =
    flakeboxLib.filter.filterSubdirs {
      inherit root;
      dirs = rustSrcDirs ++ [
        # bridge test script
        "scripts"
        "misc"
      ];
    };
in
(flakeboxLib.craneMultiBuild { inherit toolchains; }) (craneLib':
let
  # placeholder we use to avoid actually needing to detect hash via runnning `git`
  # 012345... for easy recognizability (in case something went wrong),
  # rest randomized to avoid accidentally overwritting innocent bytes in the binary
  gitHashPlaceholderValue = "01234569abcdef7afa1d2683a099c7af48a523c1";

  commonEnvsShell = {
    PROTOC = "${pkgs.protobuf}/bin/protoc";
    PROTOC_INCLUDE = "${pkgs.protobuf}/include";
  };
  commonEnvsShellRocksdbLink =
    let
      target_underscores = lib.strings.replaceStrings [ "-" ] [ "_" ] pkgs.stdenv.buildPlatform.config;
    in
    {
      ROCKSDB_STATIC = "true";
      ROCKSDB_LIB_DIR = "${pkgs.rocksdb}/lib/";
      SNAPPY_LIB_DIR = "${pkgs.pkgsStatic.snappy}/lib/";

      "ROCKSDB_${target_underscores}_STATIC" = "true";
      "ROCKSDB_${target_underscores}_LIB_DIR" = "${pkgs.rocksdb}/lib/";
      "SNAPPY_${target_underscores}_LIB_DIR" = "${pkgs.pkgsStatic.snappy}/lib/";
    } // pkgs.lib.optionalAttrs (!pkgs.stdenv.isDarwin) {
      # macos can't static libraries
      SNAPPY_STATIC = "true";
      "SNAPPY_${target_underscores}_STATIC" = "true";
    } // pkgs.lib.optionalAttrs (!pkgs.stdenv.isDarwin) {
      # TODO: could we used the android-nixpkgs toolchain instead of another one?
      # BROKEN: seems to produce binaries that crash; needs investigation
      # ROCKSDB_aarch64_linux_android_STATIC = "true";
      # SNAPPY_aarch64_linux_android_STATIC = "true";
      # ROCKSDB_aarch64_linux_android_LIB_DIR = "${pkgs-unstable.pkgsCross.aarch64-android-prebuilt.rocksdb}/lib/";
      # SNAPPY_aarch64_linux_android_LIB_DIR = "${pkgs-unstable.pkgsCross.aarch64-android-prebuilt.pkgsStatic.snappy}/lib/";

      # BROKEN
      # error: "No timer implementation for this platform"
      # ROCKSDB_armv7_linux_androideabi_STATIC = "true";
      # SNAPPY_armv7_linux_androideabi_STATIC = "true";
      # ROCKSDB_armv7_linux_androideabi_LIB_DIR = "${pkgs-unstable.pkgsCross.armv7a-android-prebuilt.rocksdb}/lib/";
      # SNAPPY_armv7_linux_androideabi_LIB_DIR = "${pkgs-unstable.pkgsCross.armv7a-android-prebuilt.pkgsStatic.snappy}/lib/";

      # x86-64-linux-android doesn't have a toolchain in nixpkgs
    } // pkgs.lib.optionalAttrs pkgs.stdenv.isDarwin {
      # broken: fails to compile with:
      # `linux-headers-android-common> sh: line 1: gcc: command not found`
      # ROCKSDB_aarch64_linux_android_STATIC = "true";
      # SNAPPY_aarch64_linux_android_STATIC = "true";
      # ROCKSDB_aarch64_linux_android_LIB_DIR = "${pkgs-unstable.pkgsCross.aarch64-android.rocksdb}/lib/";
      # SNAPPY_aarch64_linux_android_LIB_DIR = "${pkgs-unstable.pkgsCross.aarch64-android.pkgsStatic.snappy}/lib/";

      # requires downloading Xcode manually and adding to /nix/store
      # then running with `env NIXPKGS_ALLOW_UNFREE=1 nix develop -L --impure`
      # maybe we could live with it?
      # ROCKSDB_aarch64_apple_ios_STATIC = "true";
      # SNAPPY_aarch64_apple_ios_STATIC = "true";
      # ROCKSDB_aarch64_apple_ios_LIB_DIR = "${pkgs-unstable.pkgsCross.iphone64.rocksdb}/lib/";
      # SNAPPY_aarch64_apple_ios_LIB_DIR = "${pkgs-unstable.pkgsCross.iphone64.pkgsStatic.snappy}/lib/";
    };

  craneLib =
    (craneLib'.overrideArgs ({
      pname = "fedi";
      version = "0.1.0";
      nativeBuildInputs = builtins.attrValues {
        inherit (pkgs) clang mold pkg-config;
        inherit (pkgs) cargo-nextest;
        inherit (pkgs) perl;
      };
      buildInputs = builtins.attrValues {
        inherit (pkgs) openssl;
      };
      src = rustSrc;
      FEDIMINT_BUILD_FORCE_GIT_HASH = gitHashPlaceholderValue;
    } // commonEnvsShell)).overrideArgs'' (craneLib: args:
      # TODO: should we compile from scratch from vendored source for release builds? (allegedly better perf)
      # pkgs.lib.optionalAttrs (builtins.elem (craneLib.cargoProfile or "") [ "dev" "ci" ]) commonEnvsShellRocksdbLink);
      commonEnvsShellRocksdbLink);

  fediBuildPackageGroup = args: replaceGitHash {
    name = args.pname;
    package =
      craneLib.buildPackageGroup args;
  };
in
rec {
  workspaceDeps = craneLib.buildWorkspaceDepsOnly {
    buildPhaseCargoCommand = "cargoWithProfile doc --locked ; cargoWithProfile check --all-targets --locked ; cargoWithProfile build --locked --all-targets";
  };
  workspaceBuild = craneLib.buildWorkspace {
    cargoArtifacts = workspaceDeps;
    buildPhaseCargoCommand = "cargoWithProfile doc --locked ; cargoWithProfile check --all-targets --locked ; cargoWithProfile build --locked --all-targets";
  };

  fedi-fedimint-pkgs = fediBuildPackageGroup {
    pname = "fedi-fedimint-pkgs";
    packages = [
      "fedi-fedimintd"
      "fedi-fedimint-cli"
    ];
  };

  fedi-wasm = fediBuildPackageGroup {
    pname = "fedi-wasm";
    packages = [
      "fedi-wasm"
    ];
  };

  fedi-monitoring = fediBuildPackageGroup {
    name = "fedi-monitoring";
    packages = [
      "fedi-monitoring"
    ];
  };

  devops-cli = fediBuildPackageGroup {
    name = "devops-cli";
    packages = [
      "devops-cli"
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
      export PATH="${pkgs.which}/bin:${pkgs.bitcoind}/bin:${pkgs.electrs}/bin:${pkgs.clightning}/bin:${pkgs.esplora}/bin:${pkgs.lnd}/bin:$PATH"

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
      export PATH="${pkgs.which}/bin:${pkgs.bitcoind}/bin:${pkgs.electrs}/bin:${pkgs.clightning}/bin:${pkgs.esplora}/bin:${pkgs.lnd}/bin:$PATH"

      for i in fedimintd lnd lightningd gatewayd devimint esplora electrs bitcoind faucet distributedgen ; do
         which $i
      done
      ./scripts/test-bridge-v0.sh
    '';
  };

  inherit commonEnvsShell;
  inherit commonEnvsShellRocksdbLink;
})
