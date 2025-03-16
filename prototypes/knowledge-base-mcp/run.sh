#!/bin/bash

# Change to the project directory
cd "$(dirname "$0")"

# Build the TypeScript code
npm run build

# Run the MCP server
npm run start
