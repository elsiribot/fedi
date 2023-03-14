#!/usr/bin/env bash

npx react-native clean

# clean rust code
cd ../bridge || exit 1
cargo clean
cd ../mobile-ui || exit 1
