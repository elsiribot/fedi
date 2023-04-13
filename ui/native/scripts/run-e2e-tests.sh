#!/usr/bin/env bash

while getopts n: flag
do
    case "${flag}" in
        n) network=${OPTARG};;
        *) ;;
    esac
done
echo "Running e2e tests on network: $network"
# TODO: configure and run Detox
# detox test --inspect-brk --configuration android.emu.debug
detox build --configuration android.emu.debug
detox test --configuration android.emu.debug
