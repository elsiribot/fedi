#!/usr/bin/env bash

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)

if [[ "$SKIP_BRIDGE_BUILD" == "1" ]]; then
    echo "Bridge build was skipped... would you like to build it now?"
else
    echo "Latest bridge was built... would you like to rebuild?"
fi

while true; do
    echo "Select an option:"
    echo "a - rebuild bridge (android only)"
    echo "i - rebuild bridge (ios only)"
    echo "b - rebuild bridge (both android + ios)"
    echo "q - quit"
    
    read -rsn1 input
    
    case $input in
        a)
            echo "Building android bridge artifacts"
            $REPO_ROOT/scripts/bridge/build-bridge-android.sh
            echo -e "\x1B[32;1mRebuilt android bridge artifacts successfully\x1B[0m"
            ;;
        i)
            echo "Building ios bridge artifacts"
            $REPO_ROOT/scripts/bridge/build-bridge-ios.sh
            echo -e "\x1B[32;1mRebuilt ios bridge artifacts successfully\x1B[0m"
            ;;
        b)
            echo "Building android bridge artifacts"
            $REPO_ROOT/scripts/bridge/build-bridge-android.sh
            echo "Building ios bridge artifacts"
            $REPO_ROOT/scripts/bridge/build-bridge-ios.sh
            echo -e "\x1B[32;1mRebuilt android + ios bridge artifacts successfully\x1B[0m"
            ;;
        q)
            echo "Exiting."
            exit 0
            ;;
        *)
            echo "Invalid option. Try again."
            ;;
    esac
done
