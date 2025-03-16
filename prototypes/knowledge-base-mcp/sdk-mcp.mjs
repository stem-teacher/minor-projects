#!/usr/bin/env node

/**
 * MCP Knowledge Graph Server using the official SDK
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import Surreal from 'surrealdb';
import * as fs from 'fs';
import { EOL } from 'os';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Set up logging to file (NOT to stdout/stderr)
const logFile = '/tmp/sdk-mcp-knowledge.log';
fs.writeFileSync(logFile, `SDK MCP Server Started at ${new Date().toISOString()}${EOL}`);

function log(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `[${timestamp}] ${message}${EOL}`);
}

// SurrealDB connection details
const SURREALDB_URL = process.env.SURREALDB_URL || "http://localhost:8070";
const SURREALDB_USER = process.env.SURREALDB_USER || "root";
const SURREALDB_PASS = process.env.SURREALDB_PASS || "root";
const SURREALDB_NS = process.env.SURREALDB_NS || "development";
const SURREALDB_DB = process.env.SURREALDB_DB || "knowledge";

// Database connection
let db = null;

// Connect to database
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
    return true;
  } catch (error) {
    log(`Error connecting to SurrealDB: ${error.message}`);
    return false;
  }
}

// Knowledge Graph Manager - contains operations for interacting with SurrealDB
class KnowledgeGraphManager {
  // Read the entire graph
  async readGraph() {
    try {
      if (!db) return { entities: [], relations: [] };
      
      // Get all entities
      const entitiesResult = await db.query('SELECT * FROM entity');
      const entities = entitiesResult[0] || [];
      
      // Get all relations
      const relationsResult = await db.query('SELECT * FROM relation');
      const relations = relationsResult[0] || [];
      
      // Format outputs
      const formattedEntities = entities.map(entity => ({
        name: entity.name,
        entityType: entity.entityType,
        observations: entity.observations || []
      }));
      
      const formattedRelations = relations.map(rel => ({
        from: rel.from,
        to: rel.to,
        relationType: rel.relationType
      }));
      
      return { 
        entities: formattedEntities, 
        relations: formattedRelations 
      };
    } catch (error) {
      log(`Error reading graph: ${error.message}`);
      return { entities: [], relations: [] };
    }
  }
  
  // Search for entities
  async searchNodes(query) {
    try {
      if (!db) return { entities: [], relations: [] };
      
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
        matchingEntities = entities.map(entity => ({
          name: entity.name,
          entityType: entity.entityType,
          observations: observationsByEntity[entity.name] || []
        }));
        
        // Get relations between these entities
        const relationsResult = await db.query(`
          SELECT * FROM relation
          WHERE from IN $names
          AND to IN $names
        `, { names: nameArray });
        
        const relations = relationsResult[0] || [];
        
        // Format relations
        matchingRelations = relations.map(rel => ({
          from: rel.from,
          to: rel.to,
          relationType: rel.relationType
        }));
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
  
  // Open specific entities by name
  async openNodes(names) {
    try {
      if (!db) return { entities: [], relations: [] };
      
      // Get specified entities
      const entitiesResult = await db.query(
        "SELECT * FROM entity WHERE name IN $names",
        { names }
      );
      
      // Format entities
      const entities = !entitiesResult[0] ? [] :
        entitiesResult[0].map(entity => ({
          name: entity.name,
          entityType: entity.entityType,
          observations: entity.observations || []
        }));
      
      // Get relations between these entities
      const relationsResult = await db.query(
        "SELECT * FROM relation WHERE from IN $names AND to IN $names",
        { names }
      );
      
      // Format relations
      const relations = !relationsResult[0] ? [] :
        relationsResult[0].map(relation => ({
          from: relation.from,
          to: relation.to,
          relationType: relation.relationType
        }));
      
      return { entities, relations };
    } catch (error) {
      log(`Error opening nodes: ${error.message}`);
      return { entities: [], relations: [] };
    }
  }
  
  // Create new entities
  async createEntities(entities) {
    const createdEntities = [];
    
    for (const entity of entities) {
      try {
        // Check if entity already exists
        const existing = await db.query(
          "SELECT * FROM entity WHERE name = $name",
          { name: entity.name }
        );
        
        if (!existing[0] || existing[0].length === 0) {
          const timestamp = new Date().toISOString();
          
          // Create new entity
          const result = await db.create("entity", {
            name: entity.name,
            entityType: entity.entityType,
            observations: entity.observations,
            createdAt: timestamp,
            updatedAt: timestamp
          });
          
          // Format the returned entity
          const created = Array.isArray(result) ? result[0] : result;
          
          if (created && typeof created === 'object' && 'name' in created) {
            createdEntities.push({
              name: created.name,
              entityType: created.entityType,
              observations: created.observations || []
            });
          }
        }
      } catch (error) {
        log(`Error creating entity ${entity.name}: ${error.message}`);
      }
    }
    
    return createdEntities;
  }
  
  // Create new relations
  async createRelations(relations) {
    const createdRelations = [];
    
    for (const relation of relations) {
      try {
        // First, ensure both referenced entities exist
        const fromEntity = await db.query(
          "SELECT * FROM entity WHERE name = $name",
          { name: relation.from }
        );
        
        const toEntity = await db.query(
          "SELECT * FROM entity WHERE name = $name",
          { name: relation.to }
        );
        
        if (!fromEntity[0] || fromEntity[0].length === 0) {
          log(`From entity '${relation.from}' does not exist`);
          continue;
        }
        
        if (!toEntity[0] || toEntity[0].length === 0) {
          log(`To entity '${relation.to}' does not exist`);
          continue;
        }
        
        // Check if relation already exists
        const existing = await db.query(
          "SELECT * FROM relation WHERE from = $from AND to = $to AND relationType = $relationType",
          {
            from: relation.from,
            to: relation.to,
            relationType: relation.relationType,
          }
        );
        
        if (!existing[0] || existing[0].length === 0) {
          // Create new relation
          const timestamp = new Date().toISOString();
          const result = await db.query(
            `CREATE relation SET from = $from, to = $to, relationType = $relationType, createdAt = $createdAt`,
            {
              from: relation.from,
              to: relation.to,
              relationType: relation.relationType,
              createdAt: timestamp
            }
          );
          
          if (result && result[0] && result[0].length > 0) {
            const created = result[0][0];
            createdRelations.push({
              from: created.from,
              to: created.to,
              relationType: created.relationType
            });
          }
        }
      } catch (error) {
        log(`Error creating relation: ${error.message}`);
      }
    }
    
    return createdRelations;
  }
  
  // Add observations to existing entities
  async addObservations(observations) {
    const results = [];
    
    for (const obs of observations) {
      try {
        // Get current entity
        const existing = await db.query(
          "SELECT * FROM entity WHERE name = $name",
          { name: obs.entityName }
        );
        
        if (!existing[0] || existing[0].length === 0) {
          throw new Error(`Entity with name ${obs.entityName} not found`);
        }
        
        const entity = existing[0][0];
        
        // Get current observations
        const currentObservations = entity.observations || [];
        
        // Add new observations that don't already exist
        const newObservations = obs.contents.filter(content => 
          !currentObservations.some(existing => 
            (typeof existing === 'string' && existing === content) || 
            (typeof existing === 'object' && existing.text === content)
          )
        );
        
        if (newObservations.length > 0) {
          // Update entity with new observations
          const timestamp = new Date().toISOString();
          await db.query(
            "UPDATE entity SET observations = array::concat(observations, $newObs), updatedAt = $updatedAt WHERE name = $name",
            {
              name: obs.entityName,
              newObs: newObservations,
              updatedAt: timestamp
            }
          );
          
          results.push({
            entityName: obs.entityName,
            addedObservations: newObservations,
          });
        } else {
          results.push({
            entityName: obs.entityName,
            addedObservations: [],
          });
        }
      } catch (error) {
        log(`Error adding observations: ${error.message}`);
      }
    }
    
    return results;
  }
  
  // Delete entities
  async deleteEntities(entityNames) {
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
      
      return { success: true, message: "Entities deleted successfully" };
    } catch (error) {
      log(`Error deleting entities: ${error.message}`);
      return { success: false, message: `Error: ${error.message}` };
    }
  }
  
  // Delete observations
  async deleteObservations(deletions) {
    try {
      for (const deletion of deletions) {
        // Get current entity
        const existing = await db.query(
          "SELECT * FROM entity WHERE name = $name",
          { name: deletion.entityName }
        );
        
        if (!existing[0] || existing[0].length === 0) continue;
        
        const entity = existing[0][0];
        if (!entity || !entity.observations) continue;
        
        // Filter out observations that match the ones to delete
        const updatedObservations = entity.observations.filter(obs => {
          const obsText = typeof obs === 'string' ? obs : obs.text;
          return !deletion.observations.includes(obsText);
        });
        
        // Update entity with filtered observations
        const timestamp = new Date().toISOString();
        await db.query(
          "UPDATE entity SET observations = $observations, updatedAt = $updatedAt WHERE name = $name",
          {
            name: deletion.entityName,
            observations: updatedObservations,
            updatedAt: timestamp
          }
        );
      }
      
      return { success: true, message: "Observations deleted successfully" };
    } catch (error) {
      log(`Error deleting observations: ${error.message}`);
      return { success: false, message: `Error: ${error.message}` };
    }
  }
  
  // Delete relations
  async deleteRelations(relations) {
    try {
      for (const relation of relations) {
        await db.query(
          "DELETE FROM relation WHERE from = $from AND to = $to AND relationType = $relationType",
          {
            from: relation.from,
            to: relation.to,
            relationType: relation.relationType,
          }
        );
      }
      
      return { success: true, message: "Relations deleted successfully" };
    } catch (error) {
      log(`Error deleting relations: ${error.message}`);
      return { success: false, message: `Error: ${error.message}` };
    }
  }
}

// Create knowledge graph manager
const knowledgeGraphManager = new KnowledgeGraphManager();

// Create the MCP server
const server = new Server({
  name: "knowledge-graph-sdk",
  version: "1.0.0",
}, {
  capabilities: {
    tools: {},
  },
});

// Register tool list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "read_graph",
        description: "Read the entire knowledge graph",
        inputSchema: {
          type: "object",
          properties: {},
        }
      },
      {
        name: "search_nodes",
        description: "Search for nodes in the knowledge graph based on a query",
        inputSchema: {
          type: "object",
          properties: {
            query: { 
              type: "string", 
              description: "The search query to match against entity names, types, and observation content" 
            },
          },
          required: ["query"],
        }
      },
      {
        name: "open_nodes",
        description: "Open specific nodes in the knowledge graph by their names",
        inputSchema: {
          type: "object",
          properties: {
            names: {
              type: "array",
              items: { type: "string" },
              description: "An array of entity names to retrieve",
            },
          },
          required: ["names"],
        }
      },
      {
        name: "create_entities",
        description: "Create multiple new entities in the knowledge graph",
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
                    description: "The name of the entity" 
                  },
                  entityType: { 
                    type: "string", 
                    description: "The type of the entity" 
                  },
                  observations: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "An array of observation contents associated with the entity"
                  },
                },
                required: ["name", "entityType", "observations"],
              },
            },
          },
          required: ["entities"],
        }
      },
      {
        name: "create_relations",
        description: "Create multiple new relations between entities in the knowledge graph",
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
                    description: "The name of the entity where the relation starts" 
                  },
                  to: { 
                    type: "string", 
                    description: "The name of the entity where the relation ends" 
                  },
                  relationType: { 
                    type: "string", 
                    description: "The type of the relation" 
                  },
                },
                required: ["from", "to", "relationType"],
              },
            },
          },
          required: ["relations"],
        }
      },
      {
        name: "add_observations",
        description: "Add new observations to existing entities in the knowledge graph",
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
                    description: "The name of the entity to add the observations to" 
                  },
                  contents: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "An array of observation contents to add"
                  },
                },
                required: ["entityName", "contents"],
              },
            },
          },
          required: ["observations"],
        }
      },
      {
        name: "delete_entities",
        description: "Delete multiple entities and their associated relations from the knowledge graph",
        inputSchema: {
          type: "object",
          properties: {
            entityNames: { 
              type: "array", 
              items: { type: "string" },
              description: "An array of entity names to delete" 
            },
          },
          required: ["entityNames"],
        }
      },
      {
        name: "delete_observations",
        description: "Delete specific observations from entities in the knowledge graph",
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
                    description: "The name of the entity containing the observations" 
                  },
                  observations: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "An array of observations to delete"
                  },
                },
                required: ["entityName", "observations"],
              },
            },
          },
          required: ["deletions"],
        }
      },
      {
        name: "delete_relations",
        description: "Delete multiple relations from the knowledge graph",
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
                    description: "The name of the entity where the relation starts" 
                  },
                  to: { 
                    type: "string", 
                    description: "The name of the entity where the relation ends" 
                  },
                  relationType: { 
                    type: "string", 
                    description: "The type of the relation" 
                  },
                },
                required: ["from", "to", "relationType"],
              },
              description: "An array of relations to delete" 
            },
          },
          required: ["relations"],
        }
      }
    ],
  };
});

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (!args) {
    throw new Error(`No arguments provided for tool: ${name}`);
  }
  
  log(`Handling tool call: ${name} with args: ${JSON.stringify(args)}`);
  
  switch (name) {
    case "read_graph":
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify(await knowledgeGraphManager.readGraph(), null, 2) 
        }] 
      };
      
    case "search_nodes":
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify(await knowledgeGraphManager.searchNodes(args.query), null, 2) 
        }] 
      };
      
    case "open_nodes":
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify(await knowledgeGraphManager.openNodes(args.names), null, 2) 
        }] 
      };
      
    case "create_entities":
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify(await knowledgeGraphManager.createEntities(args.entities), null, 2) 
        }] 
      };
      
    case "create_relations":
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify(await knowledgeGraphManager.createRelations(args.relations), null, 2) 
        }] 
      };
      
    case "add_observations":
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify(await knowledgeGraphManager.addObservations(args.observations), null, 2) 
        }] 
      };
      
    case "delete_entities":
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify(await knowledgeGraphManager.deleteEntities(args.entityNames), null, 2) 
        }] 
      };
      
    case "delete_observations":
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify(await knowledgeGraphManager.deleteObservations(args.deletions), null, 2) 
        }] 
      };
      
    case "delete_relations":
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify(await knowledgeGraphManager.deleteRelations(args.relations), null, 2) 
        }] 
      };
      
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Main function
async function main() {
  try {
    // Connect to the database
    await connectToDb();
    
    // Create and connect the server
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    log("Knowledge Graph MCP Server running with SDK on stdio");
  } catch (error) {
    log(`Fatal error: ${error.stack || error.message}`);
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  log(`Unhandled exception: ${error.stack || error.message}`);
  process.exit(1);
});