#!/bin/bash

# Change to the project directory
cd "$(dirname "$0")"

# Build the implementation
npm run build

# Run the comprehensive test
npm test

echo "Test completed."