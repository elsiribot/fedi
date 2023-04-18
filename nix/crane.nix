{ pkgs, lib, advisory-db, src, craneLib, target ? null, profile }:
rec {
  cargo-llvm-cov = craneLib.buildPackage rec {
    pname = "cargo-llvm-cov";
    version = "0.4.14";
    buildInputs = commonArgs.buildInputs;

    src = pkgs.fetchCrate {
      inherit pname version;
      sha256 = "sha256-DY5eBSx/PSmKaG7I6scDEbyZQ5hknA/pfl0KjTNqZlo=";
    };
    doCheck = false;
  };

  # command line arguments that will be imported even
  # in the shell
  commonEnvs = {
    LIBCLANG_PATH = "${pkgs.libclang.lib}/lib/";
    ROCKSDB_LIB_DIR = "${pkgs.rocksdb}/lib/";
    PROTOC = "${pkgs.protobuf}/bin/protoc";
    PROTOC_INCLUDE = "${pkgs.protobuf}/include";
  };

  commonArgsBase = {
    pname = "fedimint-workspace";

    buildInputs = with pkgs; [
      clang
      gcc
      openssl
      pkg-config
      perl
      pkgs.llvmPackages.bintools
      rocksdb
      protobuf

      parallel
    ] ++ lib.optionals (!stdenv.isDarwin) [
      util-linux
      iproute2
    ] ++ lib.optionals stdenv.isDarwin [
      libiconv
      darwin.apple_sdk.frameworks.Security
      zld
    ] ++ lib.optionals (!(stdenv.isAarch64 || stdenv.isDarwin)) [
      # mold is currently broken on ARM and MacOS
      mold
    ];

    nativeBuildInputs = with pkgs; [
      pkg-config

      # tests
      (hiPrio pkgs.bashInteractive)
      bc
      bitcoind
      jq
      lnd
      netcat
      perl
      procps
      which
    ];


    # https://github.com/ipetkov/crane/issues/76#issuecomment-1296025495
    installCargoArtifactsMode = "use-zstd";

    CI = "true";
    HOME = "/tmp";
    CARGO_BUILD_TARGET = if target != null then target.name else null;
    CARGO_PROFILE = profile;
  } // commonEnvs;

  commonArgs = commonArgsBase // {
    inherit src;
  };

  commonArgsCargoLock = cargoLock: commonArgsBase // {
    cargoVendorDir = craneLib.vendorCargoDeps {
      inherit src cargoLock;
    };

    inherit src cargoLock;
  };

  commonArgsDepsOnly = commonArgsBase // {
    cargoVendorDir = craneLib.vendorCargoDeps {
      inherit src;
    };
    # copy over the linker/ar wrapper scripts which by default would get
    # stripped by crane
    dummySrc = craneLib.mkDummySrc {
      inherit src;

      extraDummyScript = ''
        cp -ar "${src}/.cargo" --no-target-directory $out/.cargo
      '';
    };
  };

  commonArgsDepsOnlyCargoLock = cargoLock: commonArgsBase // {
    cargoVendorDir = craneLib.vendorCargoDeps {
      inherit src;
      cargoLock = cargoLock;
    };
    # copy over the linker/ar wrapper scripts which by default would get
    # stripped by crane
    dummySrc = craneLib.mkDummySrc {
      inherit src;

      cargoLock = cargoLock;

      extraDummyScript = ''
        cp -ar "${src}/.cargo" --no-target-directory $out/.cargo
      '';
    };
  };
  commonCliTestArgs = commonArgs // {
    pname = "fedimint-test";
    version = "0.0.1";
    inherit src;
    # there's no point saving the `./target/` dir
    doInstallCargoArtifacts = false;
    # the build command will be the test
    doCheck = true;
  };

  workspaceDeps = craneLib.buildDepsOnly (commonArgsDepsOnly // {
    version = "0.0.1";
    buildPhaseCargoCommand = "cargo doc --locked --profile $CARGO_PROFILE ; cargo check --locked --profile $CARGO_PROFILE --all-targets ; cargo build --locked --profile $CARGO_PROFILE --all-targets";
    doCheck = false;
  });

  workspaceBuild = craneLib.cargoBuild (commonArgs // {
    version = "0.0.1";
    cargoArtifacts = workspaceDeps;
    cargoExtraArgs = "--locked";
    doCheck = false;
  });

  workspaceTest = craneLib.cargoTest (commonArgs // {
    version = "0.0.1";
    cargoArtifacts = workspaceDeps;
  });

  workspaceTestDoc = craneLib.cargoTest (commonArgs // {
    version = "0.0.1";
    cargoTestExtraArgs = "--doc";
    cargoArtifacts = workspaceDeps;
  });

  workspaceClippy = craneLib.cargoClippy (commonArgs // {
    version = "0.0.1";
    cargoArtifacts = workspaceDeps;

    cargoClippyExtraArgs = "--all-targets --no-deps -- --deny warnings";
    doInstallCargoArtifacts = false;
  });

  workspaceDoc = craneLib.mkCargoDerivation (commonArgs // {
    version = "0.0.1";
    cargoArtifacts = workspaceDeps;
    preConfigure = ''
      export RUSTDOCFLAGS='-D rustdoc::broken_intra_doc_links'
    '';
    buildPhaseCargoCommand = "cargo doc --no-deps --document-private-items";
    doInstallCargoArtifacts = false;
    postInstall = ''
      cp -a target/doc/ $out
    '';
    doCheck = false;
  });

  # version of `workspaceDocs` with some nightly-only flags to publish
  workspaceDocExport = craneLib.mkCargoDerivation (commonArgs // {
    version = "0.0.1";
    # no need for inheriting any artifacts, as we are using it as a one-off, and only care
    # about the docs
    cargoArtifacts = null;
    preConfigure = ''
      export RUSTDOCFLAGS='-D rustdoc::broken_intra_doc_links -Z unstable-options --enable-index-page'
    '';
    buildPhaseCargoCommand = "cargo doc --no-deps --document-private-items";
    doInstallCargoArtifacts = false;
    installPhase = ''
      cp -a target/doc/ $out
    '';
    doCheck = false;
  });

  workspaceCargoUdeps = craneLib.mkCargoDerivation (commonArgs // {
    version = "0.0.1";
    # no need for inheriting any artifacts, as we are using it as a one-off, and only care
    # about the docs
    cargoArtifacts = null;
    nativeBuildInputs = commonArgs.nativeBuildInputs ++ [ pkgs.cargo-udeps ];
    buildPhaseCargoCommand = "cargo udeps";
    doInstallCargoArtifacts = false;
    doCheck = false;
  });

  workspaceAudit = craneLib.cargoAudit (commonArgs // {
    version = "0.0.1";
    pname = commonArgs.pname + "-audit";
    inherit advisory-db;
  });

  # Build only deps, but with llvm-cov so `workspaceCov` can reuse them cached
  workspaceDepsCov = craneLib.buildDepsOnly (commonArgsDepsOnly // {
    pnameSuffix = "-lcov-deps";
    version = "0.0.1";
    buildPhaseCargoCommand = "cargo llvm-cov --locked --workspace --profile $CARGO_PROFILE --no-report";
    cargoBuildCommand = "dontuse";
    cargoCheckCommand = "dontuse";
    nativeBuildInputs = commonArgs.nativeBuildInputs ++ [ cargo-llvm-cov ];
    doCheck = false;
  });

  workspaceCov = craneLib.buildPackage (commonArgs // {
    pnameSuffix = "-lcov";
    version = "0.0.1";
    cargoArtifacts = workspaceDepsCov;
    buildPhaseCargoCommand = "mkdir -p $out ; cargo llvm-cov --locked --workspace --profile $CARGO_PROFILE --lcov --all-targets --tests --output-path $out/lcov.info";
    installPhaseCommand = "true";
    nativeBuildInputs = commonArgs.nativeBuildInputs ++ [ cargo-llvm-cov ];
    doCheck = false;
  });

  cliTestReconnect = craneLib.mkCargoDerivation (commonCliTestArgs // {
    pname = "${commonCliTestArgs.pname}-reconnect";
    version = "0.0.1";
    cargoArtifacts = workspaceBuild;
    buildPhaseCargoCommand = "patchShebangs ./scripts ; ./scripts/reconnect-test.sh";
  });

  cliTestUpgrade = craneLib.mkCargoDerivation (commonCliTestArgs // {
    pname = "${commonCliTestArgs.pname}-upgrade";
    version = "0.0.1";
    cargoArtifacts = workspaceBuild;
    buildPhaseCargoCommand = "patchShebangs ./scripts ; ./scripts/upgrade-test.sh";
  });

  cliTestLatency = craneLib.mkCargoDerivation (commonCliTestArgs // {
    pname = "${commonCliTestArgs.pname}-latency";
    version = "0.0.1";
    cargoArtifacts = workspaceBuild;
    buildPhaseCargoCommand = "patchShebangs ./scripts ; ./scripts/latency-test.sh";
  });

  cliTestCli = craneLib.mkCargoDerivation (commonCliTestArgs // {
    pname = "${commonCliTestArgs.pname}-cli";
    version = "0.0.1";
    cargoArtifacts = workspaceBuild;
    buildPhaseCargoCommand = "patchShebangs ./scripts ; ./scripts/cli-test.sh";
  });

  cliRustTests = craneLib.mkCargoDerivation (commonCliTestArgs // {
    pname = "${commonCliTestArgs.pname}-rust-tests";
    version = "0.0.1";
    cargoArtifacts = workspaceBuild;
    buildPhaseCargoCommand = "patchShebangs ./scripts ; ./scripts/rust-tests.sh";
  });

  cliTestsAll = craneLib.mkCargoDerivation (commonCliTestArgs // {
    pname = "${commonCliTestArgs.pname}-all";
    version = "0.0.1";
    cargoArtifacts = workspaceBuild;
    # One normal run, then if succeeded, modify the "always success test" to fail,
    # and make sure we detect it (happened too many times that we didn't).
    # Thanks to early termination, this should be all very quick, as we actually
    # won't start other tests.
    buildPhaseCargoCommand = ''
      patchShebangs ./scripts
      ./scripts/test-ci-all.sh || exit 1
      sed -i -e 's/exit 0/exit 1/g' scripts/always-success-test.sh
      echo "Verifying failure detection..."
      ./scripts/test-ci-all.sh 1>/dev/null 2>/dev/null && exit 1
    '';
  });

  cliTestAlwaysFail = craneLib.mkCargoDerivation (commonCliTestArgs // {
    pname = "${commonCliTestArgs.pname}-always-fail";
    version = "0.0.1";
    cargoArtifacts = workspaceBuild;
    buildPhaseCargoCommand = "patchShebangs ./scripts ; ./scripts/always-fail-test.sh";
  });


  # Compile a group of packages together
  #
  # This unifies their cargo features and avoids building common dependencies multiple
  # times, but will produce a derivation with all listed packages.
  pkgsBuild = { name, pkgs, defaultBin ? null, cargoLock ? null }:
    let
      pname =
        if target == null then
          "${name}"
        else
          "${name}-${target.name}"
      ;
      # "--package x --package y" args passed to cargo
      pkgsArgs = lib.strings.concatStringsSep " " (lib.mapAttrsToList (name: value: "--package ${name}") pkgs);
      deps = (craneLib.buildDepsOnly ((if cargoLock != null then (commonArgsDepsOnlyCargoLock cargoLock) else commonArgsDepsOnly) // {
        inherit pname;
        version = "0.0.1";
        # workaround: on wasm, we can't compile all deps, so narrow dependency build
        # to ones used by the client package only
        buildPhaseCargoCommand = "cargo build --profile $CARGO_PROFILE ${pkgsArgs}";
        doCheck = false;
        inherit cargoLock;

        preBuild = ''
          patchShebangs .cargo/
        '' + (if target != null then target.extraEnvs else "");
      }));

    in
    craneLib.buildPackage ((if cargoLock != null then (commonArgsCargoLock cargoLock) else commonArgs) // {
      inherit pname;
      version = "0.0.1";
      cargoArtifacts = deps;

      meta = { mainProgram = defaultBin; };
      inherit src;

      cargoExtraArgs = "${pkgsArgs}";

      # if needed we will check the whole workspace at once with `workspaceBuild`
      doCheck = false;
      preBuild = ''
        patchShebangs .cargo/
      '' + (if target != null then target.extraEnvs else "");
    });
}
