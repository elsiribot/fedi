default:
  @just --list

# run `cargo build` on everything
build:
  cargo build --all --all-targets

# run `cargo check` on everything
check:
  cargo check --all --all-targets

# run `cargo clippy` on everything
clippy:
  cargo clippy --all --all-targets

# run `cargo clippy --fix` on everything
clippy-fix:
  cargo clippy --all --all-targets --fix

# check if ulimit is set correctly
check-ulimit:
  #!/usr/bin/env bash
  if [ "$(ulimit -Sn)" -lt "1024" ]; then
      >&2 echo "⚠️  ulimit too small. Run 'ulimit -Sn 1024' to avoid problems running tests"
  fi

# run tests
test: build check-ulimit
  cargo test

# run lints (quick)
lint:
  env NO_STASH=true misc/git-hooks/pre-commit
  just clippy
  env RUSTDOCFLAGS='-D rustdoc::broken_intra_doc_links' cargo doc --profile dev --no-deps --document-private-items

# fix some lint failures
lint-fix:
  just format
  just clippy-fix

# `cargo udeps` check
udeps:
  nix build -L .#debug.workspaceCargoUdeps

# run all checks recommended before opening a PR
final-check: lint
  cargo test --doc
  just check-wasm
  just test

check-wasm:
  nix develop .#cross -c cargo check --target wasm32-unknown-unknown --package fedi-wasm

build-wasm:
  ./scripts/build-wasm.sh --dev

release-wasm:
  ./scripts/build-wasm.sh --release

[no-exit-message]
typos:
  #!/usr/bin/env bash
  >&2 echo '💡 Valid new words can be added to `_typos.toml`'
  typos

[no-exit-message]
typos-fix-all:
  #!/usr/bin/env bash
  >&2 echo '💡 Valid new words can be added to `_typos.toml`'
  typos --write-changes

# run code formatters
format:
  cargo fmt --all
  nixpkgs-fmt $(echo **.nix)

test-bridge testcase="":
  ./scripts/test-bridge.sh "{{testcase}}"

# start mprocs with a dev federation setup
mprocs:
  ./scripts/mprocs.sh

# build the bridge for ui/native (android + ios + typescript bindings)
build-bridge:
  ./scripts/bridge/build.sh

# build only the android bridge artifacts for ui/native
build-bridge-android:
  ./scripts/bridge/build-bridge-android.sh

# build only the ios bridge artifacts for ui/native
build-bridge-ios:
  ./scripts/bridge/build-bridge-ios.sh

# install UI dependencies
build-ui-deps:
  ./scripts/ui/build-deps.sh

# generates a standard production release APK for @fedi/native
build-production-apk:
  ./scripts/ui/build-production-apk.sh

# bumps the npm + react-native versions for @fedi/native
bump-version-native-ui:
  ./scripts/ui/bump-version-native.sh

# generate typescript bindings for the bridge
generate-bridge-bindings:
  ./scripts/bridge/ts-bindgen.sh

# start dev UI (native + pwa). Use `just run-dev-ui interactive` for build options
run-dev-ui mode="default":
  MODE={{mode}} ./scripts/ui/run-dev-ui.sh

# installs the xcodes tool and installs a version of Xcode.app
install-xcode:
  ./scripts/install-xcode.sh
