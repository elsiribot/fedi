#!/usr/bin/env bash

# exit on failure
set -e

prettier --config .prettierrc.js -c . --write

eslint ./components --ext .js,.jsx,.ts,.tsx

tsc --noEmit
