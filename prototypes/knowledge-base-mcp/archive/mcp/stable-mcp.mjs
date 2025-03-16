#!/usr/bin/env node

/**
 * Knowledge Graph MCP Server with SurrealDB Integration
 */

import * as fs from 'fs';
import { EOL } from 'os';
import Surreal from 'surrealdb';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Set up logging to file (NOT to stdout/stderr)
const logFile = '/tmp/mcp-knowledge-debug.log';
fs.writeFileSync(logFile, `MCP Server Started at ${new Date().toISOString()}${EOL}`);

function log(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `[${timestamp}] ${message}${EOL}`);
  // Only log to stderr in debug mode
  if (process.env.DEBUG_MCP === 'true') {
    console.error(`[DEBUG] ${message}`);
  }
}

// SurrealDB connection details from environment or defaults
const SURREALDB_URL = process.env.SURREALDB_URL || "http://localhost:8070";
const SURREALDB_USER = process.env.SURREALDB_USER || "root";
const SURREALDB_PASS = process.env.SURREALDB_PASS || "root";
const SURREALDB_NS = process.env.SURREALDB_NS || "development";
const SURREALDB_DB = process.env.SURREALDB_DB || "knowledge";

log(`SurrealDB connection details:
  URL: ${SURREALDB_URL}
  Namespace: ${SURREALDB_NS}
  Database: ${SURREALDB_DB}
`);

// SurrealDB connection
let db = null;
let connected = false;

// Fallback in-memory graph if database connection fails
const inMemoryGraph = {
  entities: [],
  relations: []
};

// Database operations
async function connectToDb() {
  try {
    log('Connecting to SurrealDB...');
    db = new Surreal();
    await db.connect(SURREALDB_URL, {
      auth: {
        username: SURREALDB_USER,
        password: SURREALDB_PASS
      }
    });
    
    await db.use({
      namespace: SURREALDB_NS,
      database: SURREALDB_DB
    });
    
    log('Connected to SurrealDB successfully');
    connected = true;
    return true;
  } catch (error) {
    log(`Error connecting to SurrealDB: ${error.message}`);
    connected = false;
    return false;
  }
}

// Initialize the database connection
connectToDb().catch(err => {
  log(`Database initialization error: ${err.message}`);
});

// Database operations
async function findEntity(name) {
  if (!connected) {
    return inMemoryGraph.entities.find(entity => entity.name === name);
  }
  
  try {
    const result = await db.query('SELECT * FROM entity WHERE name = $name', { name });
    if (result[0] && result[0].length > 0) {
      return result[0][0];
    }
    return null;
  } catch (error) {
    log(`Error finding entity: ${error.message}`);
    return null;
  }
}

async function readGraph() {
  if (!connected) {
    return inMemoryGraph;
  }
  
  try {
    // Get all entities
    const entitiesResult = await db.query('SELECT * FROM entity');
    const entities = entitiesResult[0] || [];
    
    // Get all relations
    const relationsResult = await db.query('SELECT * FROM relation');
    const dbRelations = relationsResult[0] || [];
    
    // Get all observations
    const observationsResult = await db.query('SELECT * FROM observation');
    const observations = observationsResult[0] || [];
    
    // Group observations by entity
    const observationsByEntity = {};
    observations.forEach(obs => {
      if (!observationsByEntity[obs.entityName]) {
        observationsByEntity[obs.entityName] = [];
      }
      observationsByEntity[obs.entityName].push(obs.text);
    });
    
    // Add observations to entities
    const formattedEntities = entities.map(entity => {
      return {
        name: entity.name,
        entityType: entity.entityType,
        observations: observationsByEntity[entity.name] || []
      };
    });
    
    // Format relations to match our model
    const formattedRelations = dbRelations.map(rel => {
      return {
        from: rel.from,
        to: rel.to,
        relationType: rel.relationType
      };
    });
    
    return {
      entities: formattedEntities,
      relations: formattedRelations
    };
  } catch (error) {
    log(`Error reading graph: ${error.message}`);
    return inMemoryGraph;
  }
}

async function createEntity(name, entityType, observations = []) {
  if (!connected) {
    const entity = {
      name,
      entityType,
      observations,
      createdAt: new Date().toISOString()
    };
    inMemoryGraph.entities.push(entity);
    return entity;
  }
  
  try {
    // Create entity
    const entityResult = await db.query(`
      CREATE entity CONTENT {
        name: $name,
        entityType: $entityType,
        createdAt: time::now(),
        updatedAt: time::now()
      }
    `, { name, entityType });
    
    // Add observations if any
    if (observations && observations.length > 0) {
      const observationPromises = observations.map(text => {
        return db.query(`
          CREATE observation CONTENT {
            entityName: $name,
            text: $text,
            createdAt: time::now()
          }
        `, { name, text });
      });
      
      await Promise.all(observationPromises);
    }
    
    // Return entity with observations
    return {
      name,
      entityType,
      observations,
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    log(`Error creating entity: ${error.message}`);
    return null;
  }
}

async function createRelation(from, to, relationType) {
  if (!connected) {
    const relation = {
      from,
      to,
      relationType,
      createdAt: new Date().toISOString()
    };
    inMemoryGraph.relations.push(relation);
    return relation;
  }
  
  try {
    // Create relation
    const relationResult = await db.query(`
      CREATE relation CONTENT {
        from: $from,
        to: $to,
        relationType: $relationType,
        createdAt: time::now()
      }
    `, { from, to, relationType });
    
    return {
      from,
      to,
      relationType,
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    log(`Error creating relation: ${error.message}`);
    return null;
  }
}

async function searchNodes(query) {
  if (!connected) {
    const lowerQuery = query.toLowerCase();
    
    // Search in-memory entities
    const matchingEntities = inMemoryGraph.entities.filter(entity => 
      entity.name.toLowerCase().includes(lowerQuery) ||
      entity.entityType.toLowerCase().includes(lowerQuery) ||
      entity.observations.some(obs => obs.toLowerCase().includes(lowerQuery))
    );
    
    // Filter in-memory relations
    const entityNames = new Set(matchingEntities.map(e => e.name));
    const matchingRelations = inMemoryGraph.relations.filter(rel => 
      entityNames.has(rel.from) && entityNames.has(rel.to)
    );
    
    return {
      entities: matchingEntities,
      relations: matchingRelations
    };
  }
  
  try {
    // Search entities by name or type
    const entityResult = await db.query(`
      SELECT * FROM entity 
      WHERE name CONTAINS $query 
      OR entityType CONTAINS $query
    `, { query });
    
    // Search observations
    const obsResult = await db.query(`
      SELECT entityName FROM observation
      WHERE text CONTAINS $query
      GROUP BY entityName
    `, { query });
    
    // Get entity names from both queries
    const entityNames = new Set();
    
    // Add entities from direct entity match
    if (entityResult[0] && entityResult[0].length > 0) {
      entityResult[0].forEach(entity => entityNames.add(entity.name));
    }
    
    // Add entities from observation match
    if (obsResult[0] && obsResult[0].length > 0) {
      obsResult[0].forEach(result => entityNames.add(result.entityName));
    }
    
    // If we found any entities, get their full data
    let matchingEntities = [];
    let matchingRelations = [];
    
    if (entityNames.size > 0) {
      // Convert Set to array
      const nameArray = Array.from(entityNames);
      
      // Get full entity details
      const fullEntityResult = await db.query(`
        SELECT * FROM entity
        WHERE name IN $names
      `, { names: nameArray });
      
      const entities = fullEntityResult[0] || [];
      
      // Get observations for these entities
      const observationsResult = await db.query(`
        SELECT * FROM observation
        WHERE entityName IN $names
      `, { names: nameArray });
      
      const observations = observationsResult[0] || [];
      
      // Group observations by entity
      const observationsByEntity = {};
      observations.forEach(obs => {
        if (!observationsByEntity[obs.entityName]) {
          observationsByEntity[obs.entityName] = [];
        }
        observationsByEntity[obs.entityName].push(obs.text);
      });
      
      // Format entities with their observations
      matchingEntities = entities.map(entity => {
        return {
          name: entity.name,
          entityType: entity.entityType,
          observations: observationsByEntity[entity.name] || []
        };
      });
      
      // Get relations between these entities
      const relationsResult = await db.query(`
        SELECT * FROM relation
        WHERE from IN $names
        AND to IN $names
      `, { names: nameArray });
      
      const relations = relationsResult[0] || [];
      
      // Format relations
      matchingRelations = relations.map(rel => {
        return {
          from: rel.from,
          to: rel.to,
          relationType: rel.relationType
        };
      });
    }
    
    return {
      entities: matchingEntities,
      relations: matchingRelations
    };
  } catch (error) {
    log(`Error searching nodes: ${error.message}`);
    return { entities: [], relations: [] };
  }
}

// Define the available tools
const tools = [
  {
    name: "read_graph",
    description: "Read the entire knowledge graph",
    inputSchema: {
      type: "object",
      properties: {},
    }
  },
  {
    name: "create_entity",
    description: "Create a new entity in the knowledge graph",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The name of the entity"
        },
        entityType: {
          type: "string",
          description: "The type of the entity"
        },
        observations: {
          type: "array",
          items: { type: "string" },
          description: "Observations about the entity"
        }
      },
      required: ["name", "entityType"]
    }
  },
  {
    name: "create_relation",
    description: "Create a relation between entities",
    inputSchema: {
      type: "object",
      properties: {
        from: {
          type: "string",
          description: "Source entity name"
        },
        to: {
          type: "string",
          description: "Target entity name"
        },
        relationType: {
          type: "string",
          description: "Type of relation"
        }
      },
      required: ["from", "to", "relationType"]
    }
  },
  {
    name: "search_nodes",
    description: "Search for entities by name or content",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query"
        }
      },
      required: ["query"]
    }
  }
];

// Handle a JSON-RPC message
async function handleMessage(message) {
  log(`Received message: ${JSON.stringify(message)}`);

  // Initialize request
  if (message.method === 'initialize') {
    const response = {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        serverInfo: {
          name: "knowledge-graph-mcp",
          version: "1.0.0"
        },
        protocolVersion: "2024-11-05"
      }
    };
    console.log(JSON.stringify(response));
    
    // Send initialized notification
    const notification = {
      jsonrpc: "2.0",
      method: "initialized",
      params: {}
    };
    console.log(JSON.stringify(notification));
  }
  
  // List tools request
  else if (message.method === 'mcp.listTools') {
    const response = {
      jsonrpc: "2.0", 
      id: message.id,
      result: { tools }
    };
    console.log(JSON.stringify(response));
  }
  
  // Prompts list request (required by Claude Desktop)
  else if (message.method === 'prompts/list') {
    const response = {
      jsonrpc: "2.0",
      id: message.id,
      result: { prompts: [] }
    };
    console.log(JSON.stringify(response));
  }
  
  // Call tool request
  else if (message.method === 'mcp.callTool') {
    const toolName = message.params?.name;
    const args = message.params?.arguments || {};
    
    log(`Calling tool '${toolName}' with args: ${JSON.stringify(args)}`);
    
    try {
      if (toolName === 'read_graph') {
        // Get the entire graph from database
        const graph = await readGraph();
        
        const response = {
          jsonrpc: "2.0",
          id: message.id,
          result: {
            content: [{ 
              type: "text", 
              text: JSON.stringify(graph, null, 2) 
            }]
          }
        };
        console.log(JSON.stringify(response));
      }
      else if (toolName === 'create_entity') {
        // Check if entity already exists
        const existing = await findEntity(args.name);
        if (existing) {
          const response = {
            jsonrpc: "2.0",
            id: message.id,
            result: {
              content: [{ 
                type: "text", 
                text: `Entity "${args.name}" already exists.` 
              }]
            }
          };
          console.log(JSON.stringify(response));
          return;
        }
        
        // Create entity in database
        const entity = await createEntity(
          args.name,
          args.entityType,
          args.observations || []
        );
        
        const response = {
          jsonrpc: "2.0",
          id: message.id,
          result: {
            content: [{ 
              type: "text", 
              text: entity ? JSON.stringify(entity, null, 2) : "Failed to create entity" 
            }]
          }
        };
        console.log(JSON.stringify(response));
      }
      else if (toolName === 'create_relation') {
        // Check if both entities exist
        const fromEntity = await findEntity(args.from);
        const toEntity = await findEntity(args.to);
        
        if (!fromEntity || !toEntity) {
          const response = {
            jsonrpc: "2.0",
            id: message.id,
            result: {
              content: [{ 
                type: "text", 
                text: `One or both entities don't exist: "${args.from}" or "${args.to}"` 
              }]
            }
          };
          console.log(JSON.stringify(response));
          return;
        }
        
        // Create relation in database
        const relation = await createRelation(
          args.from,
          args.to,
          args.relationType
        );
        
        const response = {
          jsonrpc: "2.0",
          id: message.id,
          result: {
            content: [{ 
              type: "text", 
              text: relation ? JSON.stringify(relation, null, 2) : "Failed to create relation" 
            }]
          }
        };
        console.log(JSON.stringify(response));
      }
      else if (toolName === 'search_nodes') {
        // Search for nodes in database
        const results = await searchNodes(args.query);
        
        const response = {
          jsonrpc: "2.0",
          id: message.id,
          result: {
            content: [{ 
              type: "text", 
              text: JSON.stringify(results, null, 2) 
            }]
          }
        };
        console.log(JSON.stringify(response));
      }
      else {
        // Unknown tool
        const errorResponse = {
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: -32601,
            message: `Unknown tool: ${toolName}`
          }
        };
        console.log(JSON.stringify(errorResponse));
      }
    } catch (error) {
      // Error handling
      log(`Error executing tool ${toolName}: ${error.stack}`);
      const errorResponse = {
        jsonrpc: "2.0",
        id: message.id,
        error: {
          code: -32000,
          message: `Error executing tool: ${error.message}`
        }
      };
      console.log(JSON.stringify(errorResponse));
    }
  }
  else if (message.method === 'shutdown') {
    const response = {
      jsonrpc: "2.0",
      id: message.id,
      result: null
    };
    console.log(JSON.stringify(response));
    process.exit(0);
  }
  else {
    // Method not found
    const errorResponse = {
      jsonrpc: "2.0",
      id: message.id,
      error: {
        code: -32601,
        message: `Method not found: ${message.method}`
      }
    };
    console.log(JSON.stringify(errorResponse));
  }
}

// JSON-RPC message handling (line-based for simplicity)
let buffer = '';

process.stdin.on('data', (chunk) => {
  try {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep the last potentially incomplete line

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine) {
        try {
          log(`Received message: ${trimmedLine}`);
          const message = JSON.parse(trimmedLine);
          
          // Process message (but don't await, we want to process each message immediately)
          handleMessage(message).catch(err => {
            log(`Error handling message: ${err.stack || err.message}`);
          });
        } catch (parseError) {
          log(`Error parsing JSON: ${parseError.message}`);
        }
      }
    }
  } catch (error) {
    log(`Error processing stdin: ${error.stack || error.message}`);
  }
});

// Handle exit signals
process.on('SIGTERM', () => {
  log('SIGTERM received, but staying alive to complete current operations');
});

process.on('SIGINT', () => {
  log('SIGINT received, exiting');
  process.exit(0);
});

process.on('exit', () => {
  log('Process exiting');
});

// Keep the process alive
process.stdin.resume();

// Handle stdin end event
process.stdin.on('end', () => {
  log('stdin stream ended, but keeping process alive');
  // We don't exit to keep the process running
});

log('MCP server ready and will stay alive until explicitly terminated');

// Add one more mechanism to keep the process alive
setInterval(() => {
  // This empty interval keeps Node.js event loop active
}, 60000);