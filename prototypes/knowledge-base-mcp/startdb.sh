#!/bin/bash

# Create data directory if it doesn't exist
mkdir -p surrealdb-data

# Check if the script is being run with an argument 'native'
if [ "$1" = "native" ]; then
    # Start SurrealDB natively on macOS
    echo "Starting SurrealDB natively on macOS..."
    # Make sure to install SurrealDB with: curl -sSf https://install.surrealdb.com | sh
    surreal start --user root --pass root --bind 0.0.0.0:8070 surrealkv+versioned://$(pwd)/surrealdb-data/knowledge.db
else
    # Start SurrealDB with Docker (default)
    echo "Starting SurrealDB with Docker..."
    docker run --rm -p 8070:8000 -v $(pwd)/surrealdb-data:/data surrealdb/surrealdb:latest start --user root --pass root surrealkv+versioned:///data/knowledge.db
fi
