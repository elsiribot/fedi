#!/usr/bin/env bash

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh

# main.rs & remote-bridge.ts must both respect this port
export REMOTE_BRIDGE_PORT=${REMOTE_BRIDGE_PORT:-26722}
# convenient to prevent cleanup if we're running remote bridge in separate window
DONT_KILL_BRIDGE=${DONT_KILL_BRIDGE:-0}

is_port_in_use() {
    lsof -i:$REMOTE_BRIDGE_PORT >/dev/null 2>&1
}

# Makes sure there is a remote bridge server running and ready
ensure_remote_bridge() {
    # assume whatever is running on the port is the remote bridge
    if is_port_in_use; then
        echo "🔍 Remote bridge is already running on port $REMOTE_BRIDGE_PORT..."
        BRIDGE_PID=$(lsof -ti:$REMOTE_BRIDGE_PORT | head -1)
        DONT_KILL_BRIDGE=1
        if [ -n "$BRIDGE_PID" ]; then
            echo "✅ Using existing remote bridge (PID: $BRIDGE_PID)"
        else
            echo "⚠️ Port is in use but couldn't find PID, cleanup may fail..."
        fi
        return
    fi
    
    echo "🚀 Starting remote bridge server on port $REMOTE_BRIDGE_PORT..."
    $REPO_ROOT/scripts/bridge/run-remote.sh --with-devfed --port $REMOTE_BRIDGE_PORT &
    BRIDGE_PID=$!
    
    local retry_count=0
    # wait max of 5 mins for remote bridge server to start
    local max_retries=100
    local retry_delay=3
    
    echo "⏳ Waiting for remote bridge server to be ready on port $REMOTE_BRIDGE_PORT..."
    
    while ! is_port_in_use; do
        retry_count=$((retry_count + 1))
        if [ $retry_count -ge $max_retries ]; then
            echo "❌ Remote bridge server failed to start after $((max_retries * retry_delay)) seconds"
            exit 1
        fi
        echo "⏳ Remote bridge not ready yet..."
        sleep $retry_delay
    done
    
    echo "✅ Remote bridge server is ready on port $REMOTE_BRIDGE_PORT"
}

run_tests() {
    echo "🧪 Running tests with Jest..."
    pushd $REPO_ROOT/ui && yarn test && popd
    echo "Tests completed"
}

cleanup_remote_bridge() {
    if [ -n "$BRIDGE_PID" ] && [ "$DONT_KILL_BRIDGE" == "0" ]; then
        echo "🔄 Shutting down remote bridge (PID: $BRIDGE_PID)..."
        
        # Kill the remote bridge process and its entire tree
        pkill -TERM -P $BRIDGE_PID 2>/dev/null || true
        kill -TERM $BRIDGE_PID 2>/dev/null || true
        
        # Give it a moment to shut down, then check once
        sleep 5
        if is_port_in_use; then
            echo "⚠️ Remote bridge may still be running on port $REMOTE_BRIDGE_PORT"
        else
            echo "✅ Remote bridge shutdown complete"
            return
        fi
        
        # If we get here, cleanup failed
        echo "❌ Remote bridge shutdown failed - process or port still active"
        echo "   Active processes on port $REMOTE_BRIDGE_PORT:"
        lsof -i:$REMOTE_BRIDGE_PORT 2>/dev/null || echo "   None found"
    fi
}

# ensures cleanup happens on script exit (success, failure, or interruption)
trap cleanup_remote_bridge EXIT
ensure_remote_bridge
run_tests
