#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import Surreal from "surrealdb";
import dotenv from "dotenv";
import { trace } from "./trace.js";

// Load environment variables
dotenv.config();

// Define SurrealDB connection details
const SURREALDB_URL = process.env.SURREALDB_URL || "http://localhost:8070";
const SURREALDB_USER = process.env.SURREALDB_USER || "root";
const SURREALDB_PASS = process.env.SURREALDB_PASS || "root";
const SURREALDB_NS = process.env.SURREALDB_NS || "test";
const SURREALDB_DB = process.env.SURREALDB_DB || "knowledge";

// Enhanced debugging
trace.info("Server starting with MCP SDK");
trace.debug("Using ListToolsRequestSchema for tools listing");
trace.debug("Using CallToolRequestSchema for tool execution");

// Define types for knowledge graph
interface Entity {
  name: string;
  entityType: string;
  observations: string[];
}

interface Relation {
  from: string;
  to: string;
  relationType: string;
}

// Define Zod schemas for validation
const EntitySchema = z.object({
  name: z.string(),
  entityType: z.string(),
  observations: z.array(z.string()),
});

const RelationSchema = z.object({
  from: z.string(),
  to: z.string(),
  relationType: z.string(),
});

// The KnowledgeGraphManager class handles SurrealDB operations
class KnowledgeGraphManager {
  db: any;

  /**
   * Initialize SurrealDB database and schema
   */
  async initialize(): Promise<void> {
    try {
      trace.info("Initializing SurrealDB connection to", SURREALDB_URL);
      
      // Create a new instance of the Surreal client
      const db = new Surreal();

      // Connect to the database
      await db.connect(SURREALDB_URL, {
        auth: {
          username: SURREALDB_USER,
          password: SURREALDB_PASS
        }
      });
      
      // Set the namespace and database
      await db.use({
        namespace: SURREALDB_NS,
        database: SURREALDB_DB
      });

      trace.info(`Connected to SurrealDB at ${SURREALDB_URL}`);
      
      // Store the DB connection
      this.db = db;

      // Set up database schema if needed
      await this.setupSchema();
    } catch (error) {
      trace.error("Failed to initialize SurrealDB:", error);
      throw error;
    }
  }

  /**
   * Set up the database schema for entities and relations
   */
  private async setupSchema(): Promise<void> {
    try {
      // Check if 'entity' table exists
      const entityCheck = await this.db.query(`
        INFO FOR TABLE entity;
      `).catch(() => null); // Catch and return null if table doesn't exist
      
      // Check if 'relation' table exists
      const relationCheck = await this.db.query(`
        INFO FOR TABLE relation;
      `).catch(() => null); // Catch and return null if table doesn't exist
      
      const setupRequired = !entityCheck || !relationCheck;
      
      if (setupRequired) {
        trace.info("Setting up schema...");
        
        // Use IF NOT EXISTS to prevent errors if tables already exist
        await this.db.query(`
          DEFINE TABLE IF NOT EXISTS entity SCHEMAFULL;
          DEFINE FIELD IF NOT EXISTS name ON entity TYPE string;
          DEFINE FIELD IF NOT EXISTS entityType ON entity TYPE string;
          DEFINE FIELD IF NOT EXISTS observations ON entity TYPE array;
          DEFINE INDEX IF NOT EXISTS entity_name ON entity COLUMNS name UNIQUE;
        `);

        await this.db.query(`
          DEFINE TABLE IF NOT EXISTS relation SCHEMAFULL;
          DEFINE FIELD IF NOT EXISTS from ON relation TYPE string;
          DEFINE FIELD IF NOT EXISTS to ON relation TYPE string;
          DEFINE FIELD IF NOT EXISTS relationType ON relation TYPE string;
          DEFINE INDEX IF NOT EXISTS relation_unique ON relation COLUMNS from, to, relationType UNIQUE;
        `);
        
        trace.info("Schema setup complete.");
      } else {
        trace.info("Schema already exists, skipping setup.");
      }
    } catch (error) {
      trace.error("Error setting up schema:", error);
      throw error;
    }
  }

  /**
   * Create multiple entities in the knowledge graph
   */
  async createEntities(entities: Entity[]): Promise<Entity[]> {
    const createdEntities: Entity[] = [];

    for (const entity of entities) {
      try {
        // Check if entity already exists
        const existing = await this.db.query(
          "SELECT * FROM entity WHERE name = $name",
          { name: entity.name }
        );

        if (!existing[0] || existing[0].length === 0) {
          // Create new entity
          const result = await this.db.create("entity", {
            name: entity.name,
            entityType: entity.entityType,
            observations: entity.observations,
          });

          // SurrealDB might return an array or a single object
          const created = Array.isArray(result) ? result[0] : result;

          if (created && typeof created === 'object' && 'name' in created) {
            createdEntities.push({
              name: created.name as string,
              entityType: created.entityType as string,
              observations: created.observations as string[],
            });
          }
        }
      } catch (error) {
        trace.error(`Error creating entity ${entity.name}:`, error);
      }
    }

    return createdEntities;
  }

  /**
   * Create multiple relations in the knowledge graph
   */
  async createRelations(relations: Relation[]): Promise<Relation[]> {
    const createdRelations: Relation[] = [];

    for (const relation of relations) {
      try {
        // Check if relation already exists
        const existing = await this.db.query(
          "SELECT * FROM relation WHERE from = $from AND to = $to AND relationType = $relationType",
          {
            from: relation.from,
            to: relation.to,
            relationType: relation.relationType,
          }
        );

        if (!existing[0] || existing[0].length === 0) {
          // Create new relation
          const result = await this.db.create("relation", {
            from: relation.from,
            to: relation.to,
            relationType: relation.relationType,
          });

          // SurrealDB might return an array or a single object
          const created = Array.isArray(result) ? result[0] : result;

          if (created && typeof created === 'object' && 'from' in created) {
            createdRelations.push({
              from: created.from as string,
              to: created.to as string,
              relationType: created.relationType as string,
            });
          }
        }
      } catch (error) {
        trace.error(
          `Error creating relation from ${relation.from} to ${relation.to}:`,
          error
        );
      }
    }

    return createdRelations;
  }

  /**
   * Add observations to existing entities
   */
  async addObservations(
    observations: { entityName: string; contents: string[] }[]
  ): Promise<{ entityName: string; addedObservations: string[] }[]> {
    const results: { entityName: string; addedObservations: string[] }[] = [];

    for (const obs of observations) {
      try {
        // Get current entity
        const existing = await this.db.query(
          "SELECT * FROM entity WHERE name = $name",
          { name: obs.entityName }
        );

        if (!existing[0] || existing[0].length === 0) {
          throw new Error(`Entity with name ${obs.entityName} not found`);
        }

        const entity = existing[0][0];
        if (!entity || !entity.observations) {
          throw new Error(`Invalid entity data for ${obs.entityName}`);
        }

        const currentObservations = new Set(entity.observations);
        const newObservations = obs.contents.filter(
          (content) => !currentObservations.has(content)
        );

        if (newObservations.length > 0) {
          // Update entity with new observations
          await this.db.query(
            "UPDATE entity SET observations = array::concat(observations, $newObs) WHERE name = $name",
            {
              name: obs.entityName,
              newObs: newObservations,
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
        trace.error(
          `Error adding observations to ${obs.entityName}:`,
          error
        );
        throw error;
      }
    }

    return results;
  }

  /**
   * Delete entities from the knowledge graph
   */
  async deleteEntities(entityNames: string[]): Promise<void> {
    try {
      // Delete entities
      await this.db.query(
        "DELETE FROM entity WHERE name IN $names",
        { names: entityNames }
      );

      // Delete related relations
      await this.db.query(
        "DELETE FROM relation WHERE from IN $names OR to IN $names",
        { names: entityNames }
      );
    } catch (error) {
      trace.error("Error deleting entities:", error);
      throw error;
    }
  }

  /**
   * Delete specific observations from entities
   */
  async deleteObservations(
    deletions: { entityName: string; observations: string[] }[]
  ): Promise<void> {
    for (const deletion of deletions) {
      try {
        // Get current entity
        const existing = await this.db.query(
          "SELECT * FROM entity WHERE name = $name",
          { name: deletion.entityName }
        );

        if (!existing[0] || existing[0].length === 0) {
          continue; // Skip if entity doesn't exist
        }

        const entity = existing[0][0];
        if (!entity || !entity.observations) {
          continue;
        }

        const updatedObservations = entity.observations.filter(
          (obs: string) => !deletion.observations.includes(obs)
        );

        // Update entity with filtered observations
        await this.db.query(
          "UPDATE entity SET observations = $observations WHERE name = $name",
          {
            name: deletion.entityName,
            observations: updatedObservations,
          }
        );
      } catch (error) {
        trace.error(
          `Error deleting observations from ${deletion.entityName}:`,
          error
        );
      }
    }
  }

  /**
   * Delete relations from the knowledge graph
   */
  async deleteRelations(relations: Relation[]): Promise<void> {
    for (const relation of relations) {
      try {
        await this.db.query(
          "DELETE FROM relation WHERE from = $from AND to = $to AND relationType = $relationType",
          {
            from: relation.from,
            to: relation.to,
            relationType: relation.relationType,
          }
        );
      } catch (error) {
        trace.error(
          `Error deleting relation from ${relation.from} to ${relation.to}:`,
          error
        );
      }
    }
  }

  /**
   * Read the entire knowledge graph
   */
  async readGraph(): Promise<{ entities: Entity[]; relations: Relation[] }> {
    try {
      // Get all entities
      const entitiesResult = await this.db.query(
        "SELECT * FROM entity"
      );
      
      // Extract and convert to Entity array
      const entities: Entity[] = !entitiesResult[0] ? [] : 
        entitiesResult[0].map((entity: any) => ({
          name: entity.name,
          entityType: entity.entityType,
          observations: entity.observations || []
        }));

      // Get all relations
      const relationsResult = await this.db.query(
        "SELECT * FROM relation"
      );
      
      // Extract and convert to Relation array
      const relations: Relation[] = !relationsResult[0] ? [] :
        relationsResult[0].map((relation: any) => ({
          from: relation.from,
          to: relation.to,
          relationType: relation.relationType
        }));

      return { entities, relations };
    } catch (error) {
      trace.error("Error reading graph:", error);
      throw error;
    }
  }

  /**
   * Search the knowledge graph for entities matching a query
   */
  async searchNodes(
    query: string
  ): Promise<{ entities: Entity[]; relations: Relation[] }> {
    try {
      // Search for entities
      const entitiesResult = await this.db.query(
        `
        SELECT * FROM entity 
        WHERE 
          string::lowercase(name) CONTAINS string::lowercase($query) 
          OR string::lowercase(entityType) CONTAINS string::lowercase($query) 
          OR array::filter(observations, function($observation) {
              return string::lowercase($observation) CONTAINS string::lowercase($query);
          }) != []
        `,
        { query }
      );
      
      // Extract and convert to Entity array
      const entities: Entity[] = !entitiesResult[0] ? [] :
        entitiesResult[0].map((entity: any) => ({
          name: entity.name,
          entityType: entity.entityType,
          observations: entity.observations || []
        }));

      // Get entity names for relation filtering
      const entityNames = entities.map((e) => e.name);

      // No entities found, return empty results
      if (entityNames.length === 0) {
        return { entities: [], relations: [] };
      }

      // Get relations between found entities
      const relationsResult = await this.db.query(
        `
        SELECT * FROM relation 
        WHERE 
          from IN $names AND to IN $names
        `,
        { names: entityNames }
      );
      
      // Extract and convert to Relation array
      const relations: Relation[] = !relationsResult[0] ? [] :
        relationsResult[0].map((relation: any) => ({
          from: relation.from,
          to: relation.to,
          relationType: relation.relationType
        }));

      return { entities, relations };
    } catch (error) {
      trace.error("Error searching nodes:", error);
      throw error;
    }
  }

  /**
   * Open specific nodes in the knowledge graph
   */
  async openNodes(
    names: string[]
  ): Promise<{ entities: Entity[]; relations: Relation[] }> {
    try {
      // Get specified entities
      const entitiesResult = await this.db.query(
        "SELECT * FROM entity WHERE name IN $names",
        { names }
      );
      
      // Extract and convert to Entity array
      const entities: Entity[] = !entitiesResult[0] ? [] :
        entitiesResult[0].map((entity: any) => ({
          name: entity.name,
          entityType: entity.entityType,
          observations: entity.observations || []
        }));

      // Get relations between these entities
      const relationsResult = await this.db.query(
        "SELECT * FROM relation WHERE from IN $names AND to IN $names",
        { names }
      );
      
      // Extract and convert to Relation array
      const relations: Relation[] = !relationsResult[0] ? [] :
        relationsResult[0].map((relation: any) => ({
          from: relation.from,
          to: relation.to,
          relationType: relation.relationType
        }));

      return { entities, relations };
    } catch (error) {
      trace.error("Error opening nodes:", error);
      throw error;
    }
  }
}

// Create knowledge graph manager instance
const knowledgeGraphManager = new KnowledgeGraphManager();

// Create server instance with enhanced tracing
trace.info("Creating MCP server instance");
const server = new Server(
  {
    name: "knowledge-base-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
    // Server will use default method names
  }
);

// Enhanced trace logging for request handlers
trace.info("Registering ListToolsRequestSchema handler");

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async (request) => {
  trace.info("ListToolsRequestSchema handler called");
  trace.info("===== HANDLER TRIGGERED =====");
  trace.debug("Request:", JSON.stringify(request));
  
  return {
    tools: [
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
                    description: "The name of the entity",
                  },
                  entityType: {
                    type: "string",
                    description: "The type of the entity",
                  },
                  observations: {
                    type: "array",
                    items: { type: "string" },
                    description:
                      "An array of observation contents associated with the entity",
                  },
                },
                required: ["name", "entityType", "observations"],
              },
            },
          },
          required: ["entities"],
        },
      },
      {
        name: "create_relations",
        description:
          "Create multiple new relations between entities in the knowledge graph",
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
                    description:
                      "The name of the entity where the relation starts",
                  },
                  to: {
                    type: "string",
                    description:
                      "The name of the entity where the relation ends",
                  },
                  relationType: {
                    type: "string",
                    description: "The type of the relation",
                  },
                },
                required: ["from", "to", "relationType"],
              },
            },
          },
          required: ["relations"],
        },
      },
      {
        name: "add_observations",
        description:
          "Add new observations to existing entities in the knowledge graph",
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
                    description:
                      "The name of the entity to add the observations to",
                  },
                  contents: {
                    type: "array",
                    items: { type: "string" },
                    description: "An array of observation contents to add",
                  },
                },
                required: ["entityName", "contents"],
              },
            },
          },
          required: ["observations"],
        },
      },
      {
        name: "delete_entities",
        description:
          "Delete multiple entities and their associated relations from the knowledge graph",
        inputSchema: {
          type: "object",
          properties: {
            entityNames: {
              type: "array",
              items: { type: "string" },
              description: "An array of entity names to delete",
            },
          },
          required: ["entityNames"],
        },
      },
      {
        name: "delete_observations",
        description:
          "Delete specific observations from entities in the knowledge graph",
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
                    description:
                      "The name of the entity containing the observations",
                  },
                  observations: {
                    type: "array",
                    items: { type: "string" },
                    description: "An array of observations to delete",
                  },
                },
                required: ["entityName", "observations"],
              },
            },
          },
          required: ["deletions"],
        },
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
                    description:
                      "The name of the entity where the relation starts",
                  },
                  to: {
                    type: "string",
                    description:
                      "The name of the entity where the relation ends",
                  },
                  relationType: {
                    type: "string",
                    description: "The type of the relation",
                  },
                },
                required: ["from", "to", "relationType"],
              },
              description: "An array of relations to delete",
            },
          },
          required: ["relations"],
        },
      },
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
        description: "Search for nodes in the knowledge graph based on a query",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description:
                "The search query to match against entity names, types, and observation content",
            },
          },
          required: ["query"],
        },
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
        },
      },
    ],
  };
});

trace.info("Registering CallToolRequestSchema handler");

// Handle tool requests with enhanced tracing
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  trace.info(`CallToolRequestSchema handler called for tool: ${name}`);
  trace.info("===== CALL HANDLER TRIGGERED =====");
  trace.debug("Tool arguments:", args);

  if (!args) {
    trace.error(`No arguments provided for tool: ${name}`);
    throw new Error(`No arguments provided for tool: ${name}`);
  }

  try {
    switch (name) {
      case "create_entities": {
        const entities = args.entities as Entity[];
        const result = await knowledgeGraphManager.createEntities(
          entities.map((e) => EntitySchema.parse(e))
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "create_relations": {
        const relations = args.relations as Relation[];
        const result = await knowledgeGraphManager.createRelations(
          relations.map((r) => RelationSchema.parse(r))
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "add_observations": {
        const observations = args.observations as {
          entityName: string;
          contents: string[];
        }[];
        const result = await knowledgeGraphManager.addObservations(observations);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "delete_entities": {
        await knowledgeGraphManager.deleteEntities(args.entityNames as string[]);
        return {
          content: [{ type: "text", text: "Entities deleted successfully" }],
        };
      }

      case "delete_observations": {
        await knowledgeGraphManager.deleteObservations(
          args.deletions as { entityName: string; observations: string[] }[]
        );
        return {
          content: [
            { type: "text", text: "Observations deleted successfully" },
          ],
        };
      }

      case "delete_relations": {
        await knowledgeGraphManager.deleteRelations(args.relations as Relation[]);
        return {
          content: [{ type: "text", text: "Relations deleted successfully" }],
        };
      }

      case "read_graph": {
        const graph = await knowledgeGraphManager.readGraph();
        return {
          content: [{ type: "text", text: JSON.stringify(graph, null, 2) }],
        };
      }

      case "search_nodes": {
        const result = await knowledgeGraphManager.searchNodes(
          args.query as string
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "open_nodes": {
        const result = await knowledgeGraphManager.openNodes(
          args.names as string[]
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Invalid arguments: ${error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", ")}`
      );
    }
    throw error;
  }
});

// Let the SDK's StdioServerTransport handle message processing

// Debug function to inspect the server object
function debugServerObject(server: any) {
  try {
    trace.info("DEBUG: Inspecting server object");
    
    // Check for handler registration
    if (server._handlers) {
      trace.info("DEBUG: Server has handlers defined");
      trace.info(`DEBUG: Number of handlers: ${Object.keys(server._handlers).length}`);
      Object.keys(server._handlers).forEach(key => {
        trace.info(`DEBUG: Handler registered for: ${key}`);
        
        // Try to identify schema names
        try {
          const handler = server._handlers[key];
          if (handler && handler.schema) {
            trace.info(`DEBUG: Handler schema: ${JSON.stringify(handler.schema)}`);
          }
        } catch (e) {
          trace.error("Error inspecting handler schema:", e);
        }
      });
    } else {
      trace.info("DEBUG: No handlers found in server._handlers");
    }
    
    // Check for other relevant properties
    if (server._transport) {
      trace.info("DEBUG: Server has transport defined");
      trace.info(`DEBUG: Transport type: ${server._transport.constructor.name}`);
    }
    
    if (server._methodRegistry) {
      trace.info("DEBUG: Server has method registry");
      trace.info(`DEBUG: Method registry entries: ${Object.keys(server._methodRegistry).length}`);
      Object.keys(server._methodRegistry).forEach(method => {
        trace.info(`DEBUG: Method registered: ${method}`);
      });
    }
    
    // Log ListToolsRequestSchema and CallToolRequestSchema info
    try {
      trace.info("DEBUG: ListToolsRequestSchema properties:");
      trace.info(`DEBUG: Type: ${typeof ListToolsRequestSchema}`);
      trace.info(`DEBUG: To String: ${ListToolsRequestSchema.toString()}`);
      
      trace.info("DEBUG: CallToolRequestSchema properties:");
      trace.info(`DEBUG: Type: ${typeof CallToolRequestSchema}`);
      trace.info(`DEBUG: To String: ${CallToolRequestSchema.toString()}`);
    } catch (e) {
      trace.error("Error inspecting schema properties:", e);
    }
  } catch (error) {
    trace.error("Error in debugServerObject:", error);
  }
}

// Create a custom transport that doesn't actually use stdin
// This prevents the SDK from competing with our direct handler
class DummyTransport {
  onRequest: ((message: string) => void) | null = null;
  onError: ((err: Error) => void) | null = null;

  async connect(): Promise<void> {
    trace.info("Dummy transport connected");
    // Don't actually connect to stdin
  }

  async disconnect(): Promise<void> {
    trace.info("Dummy transport disconnected");
    // Nothing to disconnect from
  }

  async send(message: string): Promise<void> {
    // Just log, don't actually send
    trace.debug("Dummy transport would send:", message);
  }

  setRequestHandler(handler: (message: string) => void): void {
    this.onRequest = handler;
    trace.debug("Dummy transport handler set");
  }

  setErrorHandler(handler: (err: Error) => void): void {
    this.onError = handler;
    trace.debug("Dummy transport error handler set");
  }
}

// Main function with enhanced error handling
async function main() {
  try {
    // Initialize SurrealDB connection and schema
    await knowledgeGraphManager.initialize();

    // Very simple direct handler - just respond to messages directly
    process.stdin.on('data', (data) => {
      try {
        const message = data.toString().trim();
        if (message) {
          trace.info("DIRECT: Raw message received:", message);
          const parsedMessage = JSON.parse(message);
          
          // Add extremely simple handling for mcp.listTools and mcp.callTool
          if (parsedMessage.method === 'mcp.listTools') {
            trace.info("DIRECT: Handling listTools request");
            
            // Create a minimal response
            const response = {
              jsonrpc: "2.0",
              id: parsedMessage.id,
              result: {
                tools: [
                  {
                    name: "read_graph",
                    description: "Read the entire knowledge graph",
                    inputSchema: {
                      type: "object",
                      properties: {},
                    },
                  },
                  // Just include a few tools for simplicity
                ]
              }
            };
            
            trace.info("DIRECT: Sending response:", JSON.stringify(response));
            // Write to stdout AND console.log to ensure it's showing up
            console.log(JSON.stringify(response));
          }
          else if (parsedMessage.method === 'mcp.callTool') {
            trace.info("DIRECT: Handling callTool request");
            
            // Create a minimal response
            const response = {
              jsonrpc: "2.0",
              id: parsedMessage.id,
              result: {
                content: [{ type: "text", text: JSON.stringify({ success: true }, null, 2) }]
              }
            };
            
            trace.info("DIRECT: Sending response:", JSON.stringify(response));
            // Write to stdout AND console.log to ensure it's showing up
            console.log(JSON.stringify(response));
          }
        }
      } catch (error) {
        trace.error("DIRECT: Error processing message:", error);
      }
    });

    trace.info("Server ready to receive messages");
  } catch (error) {
    trace.error("Fatal error during startup:", error);
    process.exit(1);
  }
}

// Run the server with global error handler
main().catch((error) => {
  trace.error("Fatal error in main():", error);
  process.exit(1);
});

// Add unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  trace.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Add uncaught exception handler
process.on('uncaughtException', (error) => {
  trace.error('Uncaught Exception:', error);
});