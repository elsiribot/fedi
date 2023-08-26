#!/usr/bin/env bash

set -euo pipefail
 
job_name="$1"
shift 1

if [ -z "$job_name" ]; then
    >&2 "error: no job name"
    exit 1
fi

export FS_DIR_CACHE_ROOT="$HOME/.cache/fs-dir-cache" # directory to hold all cache (sub)directories
export FS_DIR_CACHE_LOCK_ID="pid-$$-rnd-$RANDOM"     # acquire lock based on the current pid and something random (just in case pid gets reused)
export FS_DIR_CACHE_KEY_NAME="$job_name"             # the base name of our key
export FS_DIR_CACHE_LOCK_TIMEOUT_SECS="$((60 * 30))" # unlock after timeout in case our job fails misereably


# create/reuse cache (sub-directory) and lock it (wait if already locked)
cache_dir=$(fs-dir-cache lock --key-file Cargo.lock --key-file flake.lock)

# unlock it when the script finish
# We want to expand it right away:
# shellcheck disable=SC2064
trap "fs-dir-cache unlock --dir ${cache_dir}" EXIT
# TBD.
# trap 'fs-dir-cache gc unused --seconds "$((7 * 24 * 60 * 60))"' # delete caches not used in more than a week

export TARGET_DIR="$cache_dir/target"

"$@"
