#!/bin/bash
cd "$(dirname "$0")"
export $(grep -v '^#' .env 2>/dev/null | xargs) 2>/dev/null
echo "Starting AI Router MCP Server..."

# Try using npx to run tsx directly (recommended approach)
if command -v npx &> /dev/null; then
  exec npx tsx index.ts
else
  # Fallback to node with import flag for newer Node.js versions
  exec node --import tsx index.ts
fi
