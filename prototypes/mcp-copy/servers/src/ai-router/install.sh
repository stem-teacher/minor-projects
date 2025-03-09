#!/bin/bash

# Make script exit on error
set -e

echo "Installing dependencies for AI Router MCP Server..."

# Install npm dependencies
npm install

# Check if .env file exists, if not create from example
if [ ! -f .env ]; then
  echo "Creating .env file from example..."
  cp .env.example .env
  echo "Please edit the .env file to add your API keys."
  echo ""
fi

echo "Installation complete!"
echo ""
echo "To start the server, run: npm start"
echo ""
echo "Make sure to set your API keys in the .env file before starting the server."