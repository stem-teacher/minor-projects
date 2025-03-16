#!/bin/bash

# Create data directory if it doesn't exist
mkdir -p surrealdb-data

# Start SurrealDB with persistent storage using the surrealkv driver
docker run --rm -p 8070:8000 -v $(pwd)/surrealdb-data:/data surrealdb/surrealdb:latest start --user root --pass root surrealkv:///data/knowledge.db
