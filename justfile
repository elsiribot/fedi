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
  >&2 echo '⚠️ This is a development build of the wasm bundle, do not commit the output from this ⚠️'
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

# FIXME: maybe we should just run the fixtures using the v0 nix shell,
# but us the normal environment to run `cargo test`
test-bridge-v0 testcase="":
   nix develop .#v0 --command ./scripts/test-bridge-v0.sh "{{testcase}}"

test-bridge-v1 testcase="":
  ./scripts/test-bridge-v1.sh "{{testcase}}"

test-bridge-all testcase="":
  ./scripts/test-bridge-all.sh "{{testcase}}"

# start mprocs with a dev federation setup
mprocs:
  ./scripts/mprocs.sh

# build the bridge for ui/native (android + ios + typescript bindings)
build-bridge:
  ./scripts/bridge/build.sh

# build only the android bridge artifacts for ui/native
build-bridge-android:
  nix develop --ignore-environment --command ./scripts/bridge/build-bridge-android.sh

# build only the ios bridge artifacts for ui/native
build-bridge-ios:
  # note: can't use --ignore-environment as it uses globally installed xcode
  nix develop .#xcode --command ./scripts/bridge/build-bridge-ios.sh

# install UI dependencies
build-ui-deps:
  nix develop --command ./scripts/ui/build-deps.sh

# generates a standard production release APK for @fedi/native
build-production-apk:
  nix develop --command ./scripts/ui/build-production-apk.sh

# generates a signed xcode release archive and uploads to testflight
deploy-to-testflight:
  nix develop .#xcode --command ./scripts/ui/deploy-to-testflight.sh

# generates a standard production release AAB for @fedi/native and uploads it to the Google Play Internal Testing track
deploy-to-google-play:
  nix develop --command ./scripts/ui/deploy-to-google-play.sh

# bumps the npm + react-native versions for @fedi/native
bump-version-native-ui:
  nix develop --command ./scripts/ui/bump-version-native.sh

# generate typescript bindings for the bridge
generate-bridge-bindings:
  ./scripts/bridge/ts-bindgen.sh

# start dev UI (native + pwa). Use `just run-dev-ui interactive` for build options
run-dev-ui mode="default":
  export MODE={{mode}} && ./scripts/ui/run-dev-ui.sh

# installs the xcodes tool and installs a version of Xcode.app
install-xcode:
  ./scripts/install-xcode.sh

# (TEMPORARY) builds APK for a variant of the android app (Fedi Bravo) that can connect to old prague-era federations AND new ones tracking fedimint master
build-bravo-apk:
  ./scripts/build-bravo-apk.sh
