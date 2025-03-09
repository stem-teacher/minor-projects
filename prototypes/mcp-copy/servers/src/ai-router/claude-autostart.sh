#!/bin/bash

# Get the full path to this script's directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
cd "$SCRIPT_DIR"

# Load environment variables
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# Log startup information
echo "Starting AI Router MCP Server from $(pwd)..." >&2
echo "Node.js version: $(node --version)" >&2
echo "NPX version: $(npx --version)" >&2

# Start the server using npx
exec npx tsx index.ts
