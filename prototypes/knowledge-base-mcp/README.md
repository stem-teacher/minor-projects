# Knowledge Graph MCP Server

A SurrealDB-powered knowledge graph integration for Claude Desktop via the Model Context Protocol (MCP).

## Overview

This implementation allows Claude Desktop to maintain a persistent knowledge graph with entities, observations, and relations using SurrealDB as the backend database. Claude can store and retrieve information across conversations, creating a form of long-term memory.

## Features

- Create, read, update, and delete entities
- Establish and manage relationships between entities
- Add and remove observations about entities
- Search functionality for finding related concepts
- Persistent storage across conversations

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

4. Start SurrealDB:
   ```
   npm run startdb
   ```

5. Build the implementation:
   ```
   npm run build-mcp
   ```

## Usage

### Running the Implementation

The implementation has a clean separation between the MCP protocol handling and database operations:

```
npm run start-mcp
```

### Testing

To verify everything is working correctly, run:

```
npm run test-basic
```

For comprehensive testing of all operations:

```
npm run test
```

If you encounter database issues, you can reset it:

```
npm run cleanup
```

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
    "/absolute/path/to/knowledge-base-mcp/build/src/index.js"
  ],
  "env": {
    "SURREALDB_URL": "http://localhost:8070",
    "SURREALDB_USER": "root",
    "SURREALDB_PASS": "root",
    "SURREALDB_NS": "development",
    "SURREALDB_DB": "knowledge",
    "TRACE_LEVEL": "INFO"
  }
}
```

Replace `/absolute/path/to/knowledge-base-mcp` with the absolute path to your installation.

**Important:** 
- Make sure to build the project first with `npm run build-mcp` before integration
- Ensure SurrealDB is running with `npm run startdb`
- For detailed configuration and troubleshooting, see [CLAUDE.md](CLAUDE.md)

## Architecture

The implementation follows a clean separation of concerns:

- **src/index.ts**: MCP server and protocol handling
- **src/database.ts**: Database operations through KnowledgeGraphManager
- **SurrealDB**: Underlying graph database

This architecture makes the code more maintainable and testable.

## License

MIT
