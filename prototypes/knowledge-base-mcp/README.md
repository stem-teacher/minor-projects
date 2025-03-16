# Knowledge Graph MCP Server

This is a SurrealDB-powered knowledge graph integration for Claude Desktop via the Model Context Protocol (MCP).

## Overview

This implementation allows Claude Desktop to maintain a knowledge graph with entities, observations, and relations using SurrealDB as the backend database.

## Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Configure environment:
   ```
   cp .env.example .env
   ```
   Edit the `.env` file to set your SurrealDB connection details.

4. Build the direct implementation:
   ```
   npm run build-direct
   ```

## Usage

### Running the Direct Implementation (Recommended)

This implementation directly handles the JSON-RPC protocol expected by Claude Desktop without relying on the MCP SDK:

```
npm run start-direct
```

OR

```
node build/index-direct.js
```

### Testing

To verify everything is working correctly, run:

```
./test-direct.js
```

This simulates Claude Desktop interactions and verifies responses are correct.

## Supported Tools

The knowledge graph supports the following operations:

1. `read_graph` - Return the entire knowledge graph
2. `search_nodes` - Search for entities matching a query
3. `open_nodes` - Open specific entities by name
4. `create_entities` - Create new entities
5. `create_relations` - Create new relations between entities  
6. `add_observations` - Add observations to existing entities
7. `delete_entities` - Delete entities and their relations
8. `delete_observations` - Delete specific observations from entities
9. `delete_relations` - Delete specific relations

## Architecture

This implementation:

1. Uses SurrealDB for graph database storage
2. Directly handles JSON-RPC messages via stdin/stdout
3. Provides proper error handling and validation
4. Is fully compatible with Claude Desktop's MCP implementation

## Database Schema

The knowledge graph consists of:

### Entities
- `name`: Unique identifier (string)
- `entityType`: Category/classification (string)
- `observations`: Array of observations, each with:
  - `text`: The observation content (string)
  - `createdAt`: Timestamp when the observation was added (ISO datetime string)
- `createdAt`: Timestamp when the entity was created (ISO datetime string)
- `updatedAt`: Timestamp when the entity was last updated (ISO datetime string)

### Relations
- `from`: Source entity name (string)
- `to`: Target entity name (string)
- `relationType`: Describes the relationship (string)
- `createdAt`: Timestamp when the relation was created (ISO datetime string)

## Database Migration

If you're upgrading from a previous version without timestamps, the simplest approach is to reset the database:

```
npm run reset-db
```

This script will:
1. Drop the existing entity and relation tables
2. Recreate them with timestamp support
3. This will delete all existing data, so only use this if you don't need to preserve your data

Alternatively, if you need to maintain existing data and are comfortable with potential migration issues, you can:
1. Modify the code to add timestamps manually
2. Test thoroughly with your database

## Claude Desktop Integration

To integrate with Claude Desktop, add the following to your config:

```json
"knowledge": {
  "command": "node",
  "args": [
    "/path/to/knowledge-base-mcp/mcp-wrapper.mjs"
  ],
  "env": {
    "SURREALDB_URL": "http://localhost:8070",
    "SURREALDB_USER": "root",
    "SURREALDB_PASS": "root",
    "SURREALDB_NS": "development",
    "SURREALDB_DB": "knowledge",
    "TRACE_LEVEL": "DEBUG"
  }
}
```

Replace `/path/to/knowledge-base-mcp` with the absolute path to your installation.

**Important:** Make sure to build the project first with `npm run build` before starting the integration.

## Notes

This implementation directly handles the JSON-RPC protocol expected by Claude Desktop. It's designed to be simple, reliable, and efficient.

## License

MIT
