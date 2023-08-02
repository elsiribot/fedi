#!/usr/bin/env bash

set -e

if [[ -z "${IN_NIX_SHELL:-}" ]]; then
  echo "You must run this command from a Nix dev shell. Use 'nix develop' first"
  exit 1
fi
