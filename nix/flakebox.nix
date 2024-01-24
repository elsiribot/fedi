{ pkgs, pkgs-unstable, flakeboxLib, fedimint-pkgs, toolchains, pkgs-kitman, replaceGitHash }:
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
    flakeboxLib.filter.filterSubPaths {
      inherit root;
      paths = rustSrcDirs;
    };

  rustTestSrc =
    flakeboxLib.filter.filterSubPaths {
      inherit root;
      paths = rustSrcDirs ++ [
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

      # we carefully optimize our debug symbols on cargo level,
      # and in case of errors and panics, would like to see the
      # line numbers etc.
      dontStrip = true;
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
    buildPhaseCargoCommand = "cargoWithProfile check --all-targets --locked ; cargoWithProfile build --locked --all-targets";
  };

  workspaceBuild = craneLib.buildWorkspace {
    cargoArtifacts = workspaceDeps;
    buildPhaseCargoCommand = "cargoWithProfile check --all-targets --locked ; cargoWithProfile build --locked --all-targets";
  };

  workspaceClippy = craneLib.cargoClippy {
    cargoArtifacts = workspaceDeps;

    cargoClippyExtraArgs = "--all-targets --no-deps -- --deny warnings --allow deprecated";
    doInstallCargoArtifacts = false;
  };

  workspaceWasmDeps = craneLib.buildWorkspaceDepsOnly {
    cargoArtifacts = workspaceDeps;
    buildPhaseCargoCommand = "cargoWithProfile build --locked --lib --package fedi-wasm";
  };

  workspaceWasmBuild = craneLib.buildWorkspace {
    cargoArtifacts = workspaceWasmDeps;
    buildPhaseCargoCommand = "cargoWithProfile build --locked --lib --package fedi-wasm";
  };

  fedi-wasm-pack = craneLib.buildCommand {
    pname = "fedi-wasm-pack";
    cargoArtifacts = workspaceWasmBuild;
    doInstallCargoArtifacts = false;
    # need './scripts'
    src = rustTestSrc;

    nativeBuildInputs = [ pkgs.wasm-pack pkgs.wasm-bindgen-cli pkgs.binaryen ];

    # nativeBuildInputs = craneLib.args.nativeBuildInputs ++ [];
    cmd = ''
      patchShebangs ./scripts
      args=()

      case $CARGO_PROFILE in
        release)
          args+=("--release")
          ;;
        dev)
          args+=("--dev")
          ;;
        *)
          >&2 "Cargo profile: $CARGO_PROFILE not supported"
          exit 1
      esac

      # wasm-pack/cargo doesn't like being homeless
      export HOME=/tmp

      # note: --out-dir is relative, so this doesn't control anything
      pack_out="bridge/fedi-wasm/out"

      wasm-pack build --target web --out-dir out bridge/fedi-wasm "''${args[@]}"

      # replace broken import
      sed 's:import \*:// import \*:g' -i  $pack_out/fedi_wasm.js
      sed "s|imports\['env'\] \= \_\_wbg_star0;|imports['env'] = { GFp_poly1305_init: () => { throw Error('Ring library not available') }, GFp_poly1305_update: () => { throw Error('Ring library not available') }, GFp_poly1305_finish: () => { throw Error('Ring library not available') }, GFp_memcmp: () => { throw Error('Ring library not available') } };|g" -i $pack_out/fedi_wasm.js

      mkdir -p $out/public
      mkdir -p $out/src/wasm
      mkdir -p $out/ui/common/wasm
      cp "$pack_out/fedi_wasm_bg.wasm" $out/public/fedi.wasm
      cp $pack_out/*.{ts,js} $out/src/wasm
      cp $pack_out/*.{ts,js,wasm} $out/ui/common/wasm
    '';
  };

  fedi-fedimint-pkgs = fediBuildPackageGroup {
    pname = "fedi-fedimint-pkgs";
    packages = [
      "fedi-fedimintd"
      "fedi-fedimint-cli"
    ];
  };

  fedi-fedimintd = flakeboxLib.pickBinary { bin = "fedimintd"; pkg = fedi-fedimint-pkgs; };
  fedi-fedimint-cli = flakeboxLib.pickBinary { bin = "fedimint-cli"; pkg = fedi-fedimint-pkgs; };

  fedi-wasm = fediBuildPackageGroup {
    pname = "fedi-wasm";
    packages = [
      "fedi-wasm"
    ];
  };

  devops-cli = fediBuildPackageGroup {
    pname = "devops-cli";
    packages = [
      "devops-cli"
    ];
  };

  testStabilityPool = craneLib.buildCommand {
    pname = "fedi-test-stability-pool";
    cargoArtifacts = workspaceBuild;
    doInstallCargoArtifacts = false;
    src = rustTestSrc;

    nativeBuildInputs =
      craneLib.args.nativeBuildInputs ++ [
        pkgs.clightning
        pkgs.lnd
        pkgs.bitcoind
        pkgs.electrs
        # Get esplora from pkgs-kitman
        pkgs-kitman.esplora
        # Get fedimint deps from fedi-v1
        fedimint-pkgs.packages.${system}.devimint
        fedimint-pkgs.packages.${system}.gateway-pkgs
        # helpers
        pkgs.jq
        pkgs.bc
        pkgs.which
      ];
    cmd = ''
      patchShebangs ./scripts
      export FM_CARGO_DENY_COMPILATION=1

      # check that all expected binaries are available
      for i in lnd lightningd gatewayd devimint esplora electrs bitcoind faucet ; do
         which $i
      done

      export HOME=/tmp
      ./scripts/test-stability-pool.sh
    '';
  };

  testBridgeAll = pkgs.linkFarmFromDrvs "fedi-test-bridge-all" [
    testBridgeCurrent
  ];

  testBridgeCurrent = craneLib.buildCommand {
    pname = "fedi-test-bridge-current";
    cargoArtifacts = workspaceBuild;
    doInstallCargoArtifacts = false;
    src = rustTestSrc;

    nativeBuildInputs =
      craneLib.args.nativeBuildInputs ++ [
        pkgs.clightning
        pkgs.lnd
        pkgs.bitcoind
        pkgs.electrs
        # Get esplora from pkgs-kitman
        pkgs-kitman.esplora
        # Get fedimint deps from fedi-v1
        fedimint-pkgs.packages.${system}.devimint
        fedimint-pkgs.packages.${system}.gateway-pkgs
        # helpers
        pkgs.jq
        pkgs.bc
        pkgs.which
      ];
    cmd = ''
      patchShebangs ./scripts
      export FM_CARGO_DENY_COMPILATION=1

      # check that all expected binaries are available
      for i in lnd lightningd gatewayd devimint esplora electrs bitcoind faucet ; do
         which $i
      done

      export HOME=/tmp
      ./scripts/test-bridge-current.sh
    '';
  };

  inherit commonEnvsShell;
  inherit commonEnvsShellRocksdbLink;
})
