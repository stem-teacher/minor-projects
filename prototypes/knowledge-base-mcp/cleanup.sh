#!/bin/bash

# Cleanup script for knowledge-base-mcp project
echo "Starting cleanup of old test and debug files..."

# Older test files
echo "Removing old test files..."
rm -f test-basic.js
rm -f test-command.js
rm -f test-compatible.js
rm -f test-db.js
rm -f test-direct-fixed.js
rm -f test-jsonrpc.js
rm -f test-mcp.js
rm -f test-methods.js
rm -f test-sdk.js
rm -f test-simple.js
rm -f test-stdio.js
rm -f direct-test.js
rm -f claude-test.js
rm -f mcp-protocol-test.js

# Debug files
echo "Removing debug files..."
rm -f debug-mcp.js
rm -rf debug/
rm -f update-raw-event-processing.js
rm -f check-sdk.js

# Older implementation files
echo "Removing old implementation files..."
rm -f index-direct.js
rm -f index-direct.ts

# Unnecessary scripts
echo "Removing unnecessary scripts..."
rm -f debug-build-and-test.sh
rm -f debug-build-run.sh
rm -f make-debug-script-executable.sh
rm -f make-executable.sh
rm -f final-build-and-test.sh
rm -f run-claude-test.sh
rm -f run-tests.sh
rm -f make-test-direct-executable.sh
rm -f migrate-emergent-mind.sh
rm -f test-direct.sh

echo "Cleanup complete!"