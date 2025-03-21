#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { RequestSchema } from "@modelcontextprotocol/sdk/types.js";
import * as fs from 'fs';
import Surreal from 'surrealdb';
import * as dotenv from 'dotenv';

// Fix for ES Module imports in Node.js >=14
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Load environment variables
dotenv.config();

// Set up logging
const logFile = '/tmp/official-mcp.log';
fs.writeFileSync(logFile, `Official MCP Server Started at ${new Date().toISOString()}\n`);

function log(message) {
  try {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`);
  } catch (error) {
    // Silent catch
  }
}

// SurrealDB connection details from environment or defaults
const SURREALDB_URL = process.env.SURREALDB_URL || "http://localhost:8070";
const SURREALDB_USER = process.env.SURREALDB_USER || "root";
const SURREALDB_PASS = process.env.SURREALDB_PASS || "root";
const SURREALDB_NS = process.env.SURREALDB_NS || "development";
const SURREALDB_DB = process.env.SURREALDB_DB || "knowledge";

// Initialize SurrealDB connection
const db = new Surreal();
let connected = false;

async function connectToDb() {
  try {
    log(`Connecting to SurrealDB at ${SURREALDB_URL}...`);
    
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
    
    // Initialize schema - use datetime for timestamps
    try {
      await db.query(`
        DEFINE TABLE IF NOT EXISTS entity SCHEMAFULL;
        DEFINE FIELD name ON TABLE entity TYPE string;
        DEFINE FIELD entityType ON TABLE entity TYPE string;
        DEFINE FIELD observations ON TABLE entity TYPE array;
        DEFINE FIELD createdAt ON TABLE entity TYPE datetime;
        DEFINE FIELD updatedAt ON TABLE entity TYPE datetime;
      `);
      
      await db.query(`
        DEFINE TABLE IF NOT EXISTS relation SCHEMAFULL;
        DEFINE FIELD from ON TABLE relation TYPE string;
        DEFINE FIELD to ON TABLE relation TYPE string;
        DEFINE FIELD relationType ON TABLE relation TYPE string;
        DEFINE FIELD createdAt ON TABLE relation TYPE datetime;
      `);
    } catch (schemaError) {
      log(`Schema definition warning: ${schemaError.message}`);
    }
    
    // Test connection with a simple query
    await db.query('SELECT * FROM ONLY type::thing("ping", "pong")');
    
    log('Connected to SurrealDB successfully');
    connected = true;
    return true;
  } catch (error) {
    log(`Error connecting to SurrealDB: ${error.message}`);
    connected = false;
    return false;
  }
}

// Establish database connection
(async function initDb() {
  await connectToDb();
})();

// Tools definition
const tools = [
  {
    name: "read_graph",
    description: "Read the entire knowledge graph",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "search_nodes",
    description: "Search for entities by name, type, or observations content",
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
  },
  {
    name: "open_nodes",
    description: "Open specific entities by name",
    inputSchema: {
      type: "object",
      properties: {
        names: {
          type: "array",
          items: { type: "string" },
          description: "Array of entity names to retrieve"
        }
      },
      required: ["names"]
    }
  },
  {
    name: "create_entities",
    description: "Create new entities in the knowledge graph",
    inputSchema: {
      type: "object",
      properties: {
        entities: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Entity name"
              },
              entityType: {
                type: "string",
                description: "Entity type or category"
              },
              observations: {
                type: "array",
                items: { type: "string" },
                description: "Observations about the entity"
              }
            },
            required: ["name", "entityType"]
          }
        }
      },
      required: ["entities"]
    }
  },
  {
    name: "create_relations",
    description: "Create relations between entities",
    inputSchema: {
      type: "object",
      properties: {
        relations: {
          type: "array",
          items: {
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
        }
      },
      required: ["relations"]
    }
  },
  {
    name: "add_observations",
    description: "Add observations to existing entities",
    inputSchema: {
      type: "object",
      properties: {
        observations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              entityName: {
                type: "string",
                description: "Name of the entity to add observations to"
              },
              contents: {
                type: "array",
                items: { type: "string" },
                description: "Observations to add"
              }
            },
            required: ["entityName", "contents"]
          }
        }
      },
      required: ["observations"]
    }
  },
  {
    name: "delete_entities",
    description: "Delete entities and their relations",
    inputSchema: {
      type: "object",
      properties: {
        entityNames: {
          type: "array",
          items: { type: "string" },
          description: "Names of entities to delete"
        }
      },
      required: ["entityNames"]
    }
  },
  {
    name: "delete_observations",
    description: "Delete specific observations from entities",
    inputSchema: {
      type: "object",
      properties: {
        deletions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              entityName: {
                type: "string",
                description: "Entity name"
              },
              observations: {
                type: "array",
                items: { type: "string" },
                description: "Observations to delete"
              }
            },
            required: ["entityName", "observations"]
          }
        }
      },
      required: ["deletions"]
    }
  },
  {
    name: "delete_relations",
    description: "Delete relations between entities",
    inputSchema: {
      type: "object",
      properties: {
        relations: {
          type: "array",
          items: {
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
        }
      },
      required: ["relations"]
    }
  }
];

// Server capabilities
const capabilities = {
  tools: {
    supportedMethodNames: tools.map(tool => tool.name)
  },
  resources: {},
  prompts: {}
};

// Create the Server instance with proper info and capabilities
const server = new Server(
  { name: "knowledge-graph", version: "1.0.0" },
  { capabilities }
);

// Main implementation functions
async function readGraph() {
  if (!connected) {
    return { entities: [], relations: [] };
  }
  
  try {
    // Get all entities
    const entitiesResult = await db.query("SELECT * FROM entity");
    const entities = entitiesResult[0] || [];
    
    // Get all relations
    const relationsResult = await db.query("SELECT * FROM relation");
    const relations = relationsResult[0] || [];
    
    return { entities, relations };
  } catch (error) {
    log(`Error reading graph: ${error.message}`);
    return { entities: [], relations: [] };
  }
}

async function searchNodes(query) {
  if (!connected) {
    return { entities: [], relations: [] };
  }
  
  try {
    // Search for entities by name or type
    const entitiesResult = await db.query(
      `SELECT * FROM entity 
      WHERE name CONTAINS $query 
      OR entityType CONTAINS $query`,
      { query }
    );
    
    const entities = entitiesResult[0] || [];
    
    // Get entity names for relation filtering
    const entityNames = entities.map(e => e.name);
    
    if (entityNames.length === 0) {
      return { entities: [], relations: [] };
    }
    
    // Get relations between these entities
    const relationsResult = await db.query(
      `SELECT * FROM relation 
      WHERE from IN $names AND to IN $names`,
      { names: entityNames }
    );
    
    const relations = relationsResult[0] || [];
    
    return { entities, relations };
  } catch (error) {
    log(`Error searching nodes: ${error.message}`);
    return { entities: [], relations: [] };
  }
}

async function openNodes(names) {
  if (!connected) {
    return { entities: [], relations: [] };
  }
  
  try {
    // Get specified entities
    const entitiesResult = await db.query(
      "SELECT * FROM entity WHERE name IN $names",
      { names }
    );
    
    const entities = entitiesResult[0] || [];
    
    // Get relations between these entities
    const relationsResult = await db.query(
      "SELECT * FROM relation WHERE from IN $names AND to IN $names",
      { names }
    );
    
    const relations = relationsResult[0] || [];
    
    return { entities, relations };
  } catch (error) {
    log(`Error opening nodes: ${error.message}`);
    return { entities: [], relations: [] };
  }
}

async function createEntities(entities) {
  const results = [];
  
  if (!connected) {
    return entities.map(entity => ({
      name: entity.name,
      error: "Database not connected",
      created: false
    }));
  }
  
  for (const entity of entities) {
    try {
      // Check if entity already exists
      const existing = await db.query(
        "SELECT * FROM entity WHERE name = $name",
        { name: entity.name }
      );
      
      if (!existing[0] || existing[0].length === 0) {
        // Create entity using time::now() for datetime fields
        await db.query(
          `CREATE entity CONTENT {
            name: $name,
            entityType: $entityType,
            observations: $observations,
            createdAt: time::now(),
            updatedAt: time::now()
          }`,
          {
            name: entity.name,
            entityType: entity.entityType,
            observations: entity.observations || []
          }
        );
        
        results.push({
          name: entity.name,
          entityType: entity.entityType,
          observations: entity.observations || [],
          created: true
        });
      } else {
        results.push({
          name: entity.name,
          message: "Entity already exists",
          created: false
        });
      }
    } catch (error) {
      log(`Error creating entity ${entity.name}: ${error.message}`);
      results.push({
        name: entity.name,
        error: error.message,
        created: false
      });
    }
  }
  
  return results;
}

async function createRelations(relations) {
  const results = [];
  
  if (!connected) {
    return relations.map(relation => ({
      from: relation.from,
      to: relation.to,
      error: "Database not connected",
      created: false
    }));
  }
  
  for (const relation of relations) {
    try {
      // Verify entities exist
      const fromEntity = await db.query(
        "SELECT * FROM entity WHERE name = $name",
        { name: relation.from }
      );
      
      const toEntity = await db.query(
        "SELECT * FROM entity WHERE name = $name",
        { name: relation.to }
      );
      
      if (!fromEntity[0] || fromEntity[0].length === 0) {
        results.push({
          from: relation.from,
          to: relation.to,
          message: `From entity '${relation.from}' does not exist`,
          created: false
        });
        continue;
      }
      
      if (!toEntity[0] || toEntity[0].length === 0) {
        results.push({
          from: relation.from,
          to: relation.to,
          message: `To entity '${relation.to}' does not exist`,
          created: false
        });
        continue;
      }
      
      // Create relation with time::now() for datetime
      await db.query(
        `CREATE relation CONTENT {
          from: $from,
          to: $to,
          relationType: $relationType,
          createdAt: time::now()
        }`,
        {
          from: relation.from,
          to: relation.to,
          relationType: relation.relationType
        }
      );
      
      results.push({
        from: relation.from,
        to: relation.to,
        relationType: relation.relationType,
        created: true
      });
    } catch (error) {
      log(`Error creating relation: ${error.message}`);
      results.push({
        from: relation.from,
        to: relation.to,
        error: error.message,
        created: false
      });
    }
  }
  
  return results;
}

async function addObservations(observations) {
  const results = [];
  
  if (!connected) {
    return observations.map(obs => ({
      entityName: obs.entityName,
      error: "Database not connected",
      success: false
    }));
  }
  
  for (const obs of observations) {
    try {
      // Get current entity
      const existing = await db.query(
        "SELECT * FROM entity WHERE name = $name",
        { name: obs.entityName }
      );
      
      if (!existing[0] || existing[0].length === 0) {
        results.push({
          entityName: obs.entityName,
          message: "Entity not found",
          success: false
        });
        continue;
      }
      
      // Add new observations with time::now() for updatedAt
      await db.query(
        "UPDATE entity SET observations = array::concat(observations, $newObs), updatedAt = time::now() WHERE name = $name",
        {
          name: obs.entityName,
          newObs: obs.contents
        }
      );
      
      results.push({
        entityName: obs.entityName,
        addedObservations: obs.contents,
        success: true
      });
    } catch (error) {
      log(`Error adding observations to ${obs.entityName}: ${error.message}`);
      results.push({
        entityName: obs.entityName,
        error: error.message,
        success: false
      });
    }
  }
  
  return results;
}

async function deleteEntities(entityNames) {
  if (!connected) {
    return {
      success: false,
      error: "Database not connected"
    };
  }
  
  try {
    // Delete entities
    await db.query(
      "DELETE FROM entity WHERE name IN $names",
      { names: entityNames }
    );
    
    // Delete related relations
    await db.query(
      "DELETE FROM relation WHERE from IN $names OR to IN $names",
      { names: entityNames }
    );
    
    return {
      success: true,
      message: `Deleted ${entityNames.length} entities`,
      deletedEntities: entityNames
    };
  } catch (error) {
    log(`Error deleting entities: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

async function deleteObservations(deletions) {
  const results = [];
  
  if (!connected) {
    return deletions.map(deletion => ({
      entityName: deletion.entityName,
      error: "Database not connected",
      success: false
    }));
  }
  
  for (const deletion of deletions) {
    try {
      // Get current entity
      const existing = await db.query(
        "SELECT * FROM entity WHERE name = $name",
        { name: deletion.entityName }
      );
      
      if (!existing[0] || existing[0].length === 0) {
        results.push({
          entityName: deletion.entityName,
          message: "Entity not found",
          success: false
        });
        continue;
      }
      
      const entity = existing[0][0];
      const currentObservations = entity.observations || [];
      
      // Filter out observations to be deleted
      const updatedObservations = currentObservations.filter(
        obs => !deletion.observations.includes(obs)
      );
      
      // Update entity with time::now() for updatedAt
      await db.query(
        "UPDATE entity SET observations = $observations, updatedAt = time::now() WHERE name = $name",
        {
          name: deletion.entityName,
          observations: updatedObservations
        }
      );
      
      results.push({
        entityName: deletion.entityName,
        deletedObservations: deletion.observations,
        success: true
      });
    } catch (error) {
      log(`Error deleting observations from ${deletion.entityName}: ${error.message}`);
      results.push({
        entityName: deletion.entityName,
        error: error.message,
        success: false
      });
    }
  }
  
  return results;
}

async function deleteRelations(relations) {
  const results = [];
  
  if (!connected) {
    return relations.map(relation => ({
      from: relation.from,
      to: relation.to,
      error: "Database not connected",
      deleted: false
    }));
  }
  
  for (const relation of relations) {
    try {
      // Delete relation
      await db.query(
        "DELETE FROM relation WHERE from = $from AND to = $to AND relationType = $relationType",
        {
          from: relation.from,
          to: relation.to,
          relationType: relation.relationType
        }
      );
      
      results.push({
        from: relation.from,
        to: relation.to,
        relationType: relation.relationType,
        deleted: true
      });
    } catch (error) {
      log(`Error deleting relation: ${error.message}`);
      results.push({
        from: relation.from,
        to: relation.to,
        relationType: relation.relationType,
        error: error.message,
        deleted: false
      });
    }
  }
  
  return results;
}

// Create Zod schemas for each of our requests
const ListToolsRequestSchema = RequestSchema.extend({
  method: z.literal("mcp.listTools")
});

const ResourcesListRequestSchema = RequestSchema.extend({
  method: z.literal("resources/list")
});

const PromptsListRequestSchema = RequestSchema.extend({
  method: z.literal("prompts/list")
});

const CallToolRequestSchema = RequestSchema.extend({
  method: z.literal("mcp.callTool"),
  params: z.object({
    name: z.string(),
    arguments: z.record(z.any())
  })
});

// Set up MCP tool handlers with correct schema objects
server.setRequestHandler(ListToolsRequestSchema, async () => {
  log("Handling list tools request");
  return { tools };
});

// Handle resources/list request
server.setRequestHandler(ResourcesListRequestSchema, async () => {
  log("Handling resources list request");
  return { resources: [] };
});

// Handle prompts/list request
server.setRequestHandler(PromptsListRequestSchema, async () => {
  log("Handling prompts list request");
  return { prompts: [] };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  log(`Handling tool call: ${name} with args: ${JSON.stringify(args)}`);
  
  try {
    // Check DB connection and attempt reconnect if needed
    if (!connected) {
      log("Database not connected - attempting to reconnect");
      await connectToDb();
      
      if (!connected) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: "Database not connected",
              message: "Please ensure SurrealDB is running"
            }, null, 2)
          }]
        };
      }
    }
    
    let result;
    
    // Route to the appropriate handler
    switch (name) {
      case "read_graph":
        result = await readGraph();
        break;
      case "search_nodes":
        result = await searchNodes(args.query);
        break;
      case "open_nodes":
        result = await openNodes(args.names);
        break;
      case "create_entities":
        result = await createEntities(args.entities);
        break;
      case "create_relations":
        result = await createRelations(args.relations);
        break;
      case "add_observations":
        result = await addObservations(args.observations);
        break;
      case "delete_entities":
        result = await deleteEntities(args.entityNames);
        break;
      case "delete_observations":
        result = await deleteObservations(args.deletions);
        break;
      case "delete_relations":
        result = await deleteRelations(args.relations);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    log(`Error handling tool call: ${error.message}`);
    throw error;
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log("Server started and connected successfully");
}

main().catch(error => {
  log(`Error starting server: ${error.message}`);
});