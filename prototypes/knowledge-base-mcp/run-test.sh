#!/bin/bash

# Change to the project directory
cd "$(dirname "$0")"

# Build the direct implementation
npm run build-direct

# Run the comprehensive test
npm test

echo "Test completed."