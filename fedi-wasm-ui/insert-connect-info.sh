#!/bin/bash

set -x

nix run nixpkgs#gnused -- -i "s/%FEDERATION_CONNECT_STRING%/$1/g" dist/assets/*.js
