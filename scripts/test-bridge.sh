#!/usr/bin/env bash
set -ex

# kill everything on exit
function kill_fedimint_bin_tests() {
    kill $FEDIMINT_BIN_TESTS_PID || true
}
trap kill_fedimint_bin_tests EXIT

# core lightning / bitcoind need this
HOME=$(mktemp -d)
export HOME

# compile binaries in a way that nix can cache
cargo build ${CARGO_PROFILE:+--profile ${CARGO_PROFILE}}

source scripts/build.sh
export PATH="$FM_BIN_DIR:$PATH"
echo "Running in temporary directory $FM_TEST_DIR"

# a pipe that rust writes to, and user-shell can wait for it
export FM_READY_FILE=$FM_TMP_DIR/ready
mkfifo $FM_READY_FILE

# symlink logs to local gitignored directory so they're easier to find
rm target/logs || true
ln -s $FM_LOGS_DIR target/logs
rm target/test || true
ln -s $FM_DATA_DIR target/test

fedimint-bin-tests tmuxinator &>$FM_LOGS_DIR/fedimint-dev.log &
FEDIMINT_BIN_TESTS_PID=$!

# waits for rust to write to this pipe
STATUS=$(cat $FM_READY_FILE)
if [ "$STATUS" = "ERROR" ]
then
    echo "fedimint didn't start correctly"
    echo "See other panes for errors"
    exit 1
fi

FM_CONNECT_STRING=$(cat $FM_DATA_DIR/client-connect)
export FM_CONNECT_STRING

echo "## Running tests"
cargo test ${CARGO_PROFILE:+--profile ${CARGO_PROFILE}} -p fedi-ffi

echo "## Tests Passed"
