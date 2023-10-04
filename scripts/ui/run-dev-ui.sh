#!/usr/bin/env bash

# exit on failure (strict)
set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh

SKIP_BRIDGE_BUILD=${SKIP_BRIDGE_BUILD:-0}
SKIP_PWA_BUILD=${SKIP_PWA_BUILD:-0}
SKIP_ANDROID_BUILD=${SKIP_ANDROID_BUILD:-0}
SKIP_IOS_BUILD=${SKIP_IOS_BUILD:-0}
SKIP_INSTALL_PODS=${SKIP_INSTALL_PODS:-0}
SELECT_IOS_DEVICE=${SELECT_IOS_DEVICE:-0}

if [[ "$MODE" == "interactive" ]]; then
  echo "Running development UI (native + PWA) in interactive mode"
  # Set to true so we can handle it in the start-ios.sh script
  SELECT_IOS_DEVICE=1

  unset REPLY
  while [[ -z "${REPLY:-}" ]] || ! [[ "${REPLY:-}" =~ ^[YyNn]$ ]]
  do
    read -p "Skip bridge rebuild? (y/n) " -n 1 -r
    echo
  done
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    SKIP_BRIDGE_BUILD=1
  else
    SKIP_BRIDGE_BUILD=0
  fi

  unset REPLY
  while [[ -z "${REPLY:-}" ]] || ! [[ "${REPLY:-}" =~ ^[YyNn]$ ]]
  do
    read -p "Skip PWA build? (y/n) " -n 1 -r
    echo
  done
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    SKIP_PWA_BUILD=1
  else
    SKIP_PWA_BUILD=0
  fi

  unset REPLY
  while [[ -z "${REPLY:-}" ]] || ! [[ "${REPLY:-}" =~ ^[YyNn]$ ]]
  do
    read -p "Skip Android build? (y/n) " -n 1 -r
    echo
  done
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    SKIP_ANDROID_BUILD=1
  else
    SKIP_ANDROID_BUILD=0
  fi

  unset REPLY
  while [[ -z "${REPLY:-}" ]] || ! [[ "${REPLY:-}" =~ ^[YyNn]$ ]]
  do
    read -p "Skip iOS build? (y/n) " -n 1 -r
    echo
  done
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    SKIP_IOS_BUILD=1
    SKIP_INSTALL_PODS=1
    # disable this since we are skipping ios build
    SELECT_IOS_DEVICE=0
  else
    SELECT_IOS_DEVICE=1
    SKIP_IOS_BUILD=0
    unset REPLY
    while [[ -z "${REPLY:-}" ]] || ! [[ "${REPLY:-}" =~ ^[YyNn]$ ]]
    do
      read -p "Skip pods installation? (y/n) " -n 1 -r
      echo
    done
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      SKIP_INSTALL_PODS=1
    else
      SKIP_INSTALL_PODS=0
    fi
  fi
else
  echo "Running development UI (native + PWA)"
fi

source $REPO_ROOT/scripts/ui/dev-setup.sh

# export these so mprocs scripts can see them
export SKIP_BRIDGE_BUILD
export SKIP_PWA_BUILD
export SKIP_ANDROID_BUILD
export SKIP_IOS_BUILD
export SELECT_IOS_DEVICE
cd $REPO_ROOT
mprocs -c $REPO_ROOT/misc/mprocs-dev-ui.yaml
