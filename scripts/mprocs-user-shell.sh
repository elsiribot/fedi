#!/usr/bin/env bash

source ./scripts/user-shell.sh

echo ""
echo "Important mprocs key sequences:"
echo ""
echo "  ctrl+a <up/down arrow> - switching between panels"
echo "  ctrl+a q               - quit mprocs"

echo "Connection string:"
cat $FM_DATA_DIR/client-connect
echo ""
