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

## Notes

The direct implementation bypasses the MCP SDK entirely, as we encountered issues with the SDK's stdio transport handling. This implementation is simpler, more reliable, and specifically tailored for Claude Desktop's JSON-RPC protocol expectations.

## License

MIT
