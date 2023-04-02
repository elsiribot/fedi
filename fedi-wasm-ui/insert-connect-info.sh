#!/bin/bash

set -x

sed -i "s/%FEDERATION_CONNECT_STRING%/$1/g" dist/assets/*.js 
