# SurrealDB MCP Integration Project

## Project Overview

This project creates a knowledge graph tool for Claude Desktop using the Model Context Protocol (MCP). It enables Claude to maintain an external memory store in SurrealDB, allowing for persistent storage of entities, observations, and relationships between different knowledge concepts.

## Development Guidelines

1. **Follow Standard Practices**: Always adhere to established patterns and standard practices when implementing features or fixing bugs. Don't randomly change course from standard approaches as this wastes time and resources.

2. **Incremental Changes**: Make small, incremental changes that can be easily tested and verified rather than attempting large rewrites or refactorings.

3. **Maintain Compatibility**: When working on fixes, ensure that existing functionality continues to work as expected. Don't introduce changes that break working code.

4. **Test Before Committing**: Always ensure that the code compiles and basic functionality works before committing changes or suggesting implementations.

5. **Ask Before Making Significant Changes**: ALWAYS ask before making any significant change to the implementation approach, architecture, or fundamental design decisions. This includes switching libraries, frameworks, or implementation strategies (such as moving from SDK-based to direct implementation).

6. **Evidence-Based, Disciplined Approach**: Take a disciplined, methodical approach to problem-solving. Do not make unilateral decisions or changes without clear evidence. Test theories incrementally, and seek agreement on the approach before implementing solutions. Never assume a solution will work without testing it first.

## Key Issues and Solutions

### Original Problem

The initial implementation using the MCP SDK had a critical issue: message handling through stdin/stdout wasn't working properly. Although both the server and client were sending messages, the handlers registered with the MCP SDK weren't being triggered as expected.

### Debugging Process
1. We identified that messages were being received (visible in logs) but handlers weren't responding
2. We observed custom stdin handlers were "stealing" messages from the SDK
3. We tried repositioning custom handlers and using dummy transports
4. We discovered that even with proper setup, messages weren't being routed correctly

### Solution
We created a standalone direct implementation that:
1. Bypasses the MCP SDK completely
2. Implements the JSON-RPC protocol directly
3. Directly processes stdin/stdout for communication
4. Connects to SurrealDB for database operations
5. Properly handles all knowledge graph operations

### Additional Issues and Fixes

#### TypeScript Module Issues
When using ES modules with TypeScript and SurrealDB, we encountered several issues:

1. **Default Export Error**: The dotenv module doesn't have a default export
   - Solution: Changed `import dotenv from 'dotenv'` to `import * as dotenv from 'dotenv'`

2. **Module Resolution Problems**: TypeScript couldn't find SurrealDB module
   - Solution: Created a dedicated tsconfig file and used `--moduleResolution nodenext`

3. **File Extension Mismatch**: TypeScript compiled .mts files to .mjs but scripts looked for .js
   - Solution: Updated start script to use the correct .mjs extension

#### SurrealDB Integration Issues

1. **JavaScript Function Rejection**: Using JavaScript functions in SurrealDB queries caused "Scripting functions are not allowed" errors
   - Solution: Rewrote the search_nodes method to use standard SurrealDB functions instead of custom JS functions

2. **Relation Storage Problems**: Relations weren't being stored or retrieved correctly
   - Solution: 
     - Changed from using `db.create()` to direct SQL with `INSERT INTO` for relations
     - Improved error handling and added validation
     - Enhanced the readGraph method to properly retrieve relations

## Architecture

The implementation follows a simple, direct architecture:

1. **JSON-RPC Message Processing**:
   - Listens for stdin messages
   - Parses JSON-RPC requests
   - Identifies method (listTools or callTool)
   - Routes to appropriate handler

2. **Database Layer**:
   - KnowledgeGraphManager class handles all SurrealDB operations
   - Manages entities, relations, and observations
   - Provides methods for CRUD operations

3. **Tool Implementation**:
   - read_graph - Returns the entire knowledge graph
   - search_nodes - Searches for entities matching a query
   - open_nodes - Opens specific entities by name
   - create_entities - Creates new entities
   - create_relations - Creates relations between entities
   - add_observations - Adds observations to existing entities
   - delete_entities - Deletes entities and their relations
   - delete_observations - Deletes specific observations from entities
   - delete_relations - Deletes specific relations

## Implementation Details

### Key Files
- **src/index.ts**: Main application entry point with MCP integration
- **src/database.ts**: Database layer with KnowledgeGraphManager implementation
- **build/src/index.js**: Compiled JavaScript for production use
- **official-mcp.mjs**: Standalone JavaScript implementation (alternative to the TypeScript version)
- **test-direct.js**: Basic testing script that simulates Claude Desktop interaction
- **test-direct-comprehensive.js**: Thorough test suite for all knowledge graph operations
- **startdb.sh**: Script to start the SurrealDB server

Archived files (in the `archive` directory) include experimental implementations that were created during debugging.

### Data Structure
The knowledge graph consists of:
1. **Entities**:
   - name (unique identifier)
   - entityType (category/classification)
   - observations (array of text observations)

2. **Relations**:
   - from (source entity name)
   - to (target entity name)
   - relationType (describes the relationship)

### Testing
The implementation includes multiple testing scripts:

1. **Basic Test (test-direct.js)**:
   - Validates basic communication flow
   - Tests listTools and simple read_graph operations

2. **Comprehensive Test (test-direct-comprehensive.js)**:
   - Tests all knowledge graph operations in sequence
   - Creates test entities with observations
   - Establishes relations between entities
   - Searches and retrieves entities
   - Deletes relations, observations, and entities
   - Validates the final state matches expectations

## Configuration and Usage

### Environment Variables
- SURREALDB_URL: URL for SurrealDB (default: http://localhost:8070)
- SURREALDB_USER: Database username (default: root)
- SURREALDB_PASS: Database password (default: root)
- SURREALDB_NS: Database namespace (default: test)
- SURREALDB_DB: Database name (default: knowledge)
- TRACE_LEVEL: Logging level (DEBUG or INFO)

### Running the Implementation

### Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Start SurrealDB:
   
   Using Docker (default):
   ```
   npm run startdb
   ```
   
   For native macOS (more power efficient):
   ```
   # First install SurrealDB
   curl -sSf https://install.surrealdb.com | sh
   
   # Then run with native option
   ./startdb.sh native
   ```

3. Build the implementation:
   ```
   npm run build-mcp
   ```

### Testing

1. Run basic functionality test:
   ```
   npm run test-basic
   ```

2. Run comprehensive test (tests all operations):
   ```
   npm run test
   ```

3. Run with debug logging:
   ```
   npm run test-debug
   ```

4. Run database unit tests:
   ```
   npm run test:node
   ```

### Reset Database

If you encounter issues or want to start fresh:
```
npm run cleanup
```

## Memory Support

This implementation enables Claude to maintain long-term, persistent memory through:

1. **Entity Creation**: Store key concepts or items from conversations
2. **Observations**: Add notes or details to entities
3. **Relations**: Create connections between related entities
4. **Search and Recall**: Retrieve information based on queries

## Next Steps

Potential improvements:
1. Add support for more complex query capabilities
2. Implement data validation and sanitization
3. Add authentication for the MCP connection
4. Implement backup and restore functionality
5. Create a visualization component for the knowledge graph

## Technical Notes

- The implementation is written in TypeScript for type safety
- It uses only the necessary dependencies to minimize complexity
- All operations return properly formatted JSON-RPC responses
- Error handling is comprehensive throughout the codebase
- The ES module implementation (.mts) is more compatible with modern Node.js practices
- Direct SQL queries are more reliable than the SurrealDB client methods for certain operations
- Avoid using JavaScript functions in SurrealDB queries when running in secure mode

### SurrealDB Storage and Versioning

- This project uses SurrealDB 2.0 with versioned storage
- The storage format uses `surrealkv+versioned://` prefix for database files
- Versioning allows tracking changes, point-in-time queries, and improved data integrity
- The database file is stored in the `surrealdb-data` directory with `.db` extension
- When migrating between environments, make sure to:
  - Use the correct storage format (`surrealkv+versioned://`)
  - Maintain the same database name in environment variables
  - Keep consistent user authentication settings
- Docker and native modes use the same storage format, so you can switch between them

## Claude Desktop Integration

To integrate with Claude Desktop, follow these steps:

1. Build the latest implementation:
   ```
   npm run build-mcp
   ```

2. Ensure SurrealDB is running:
   ```
   npm run startdb
   ```

3. Configure the connection in Claude Desktop settings:

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
    "SURREALDB_DB": "knowledge"
  }
}
```

Replace `/absolute/path/to/knowledge-base-mcp` with the actual absolute path to your project directory.

### Alternative Integration Method

If you encounter issues with the TypeScript-compiled version, you can use the standalone JavaScript implementation:

```json
"knowledge": {
  "command": "node",
  "args": [
    "/absolute/path/to/knowledge-base-mcp/official-mcp.mjs"
  ],
  "env": {
    "SURREALDB_URL": "http://localhost:8070",
    "SURREALDB_USER": "root",
    "SURREALDB_PASS": "root",
    "SURREALDB_NS": "development",
    "SURREALDB_DB": "knowledge"
  }
}
```

### Troubleshooting

Common errors:
- **MODULE_NOT_FOUND**: Make sure the file path in the configuration points to a file that exists
- **Connection issues**: Ensure SurrealDB is running with `npm run startdb`
- **Server disconnection**: Check the log file at `~/Library/Logs/Claude/mcp-server-knowledge.log`
- **Parse errors**: The configuration is particular about paths; use absolute paths with correct extensions
- **Datetime errors**: If you see datetime format errors, the database schema might need updating (run `npm run cleanup` to reset the database)
