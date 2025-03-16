#!/usr/bin/env node
/**
 * Direct MCP Handler for SurrealDB Knowledge Graph
 *
 * This is a standalone implementation that works with Claude Desktop
 * without requiring the full MCP SDK. It directly handles the JSON-RPC
 * protocol that Claude Desktop expects.
 */
import Surreal from 'surrealdb/dist/index.mjs';
import * as dotenv from 'dotenv';
// Load environment variables
dotenv.config();
// Set up logging
const TRACE_LEVEL = process.env.TRACE_LEVEL || "INFO";
const trace = {
    debug: (...args) => TRACE_LEVEL === "DEBUG" && console.error('[DEBUG]', ...args),
    info: (...args) => (TRACE_LEVEL === "DEBUG" || TRACE_LEVEL === "INFO") && console.error('[INFO]', ...args),
    error: (...args) => console.error('[ERROR]', ...args)
};
// Define SurrealDB connection details
const SURREALDB_URL = process.env.SURREALDB_URL || "http://localhost:8070";
const SURREALDB_USER = process.env.SURREALDB_USER || "root";
const SURREALDB_PASS = process.env.SURREALDB_PASS || "root";
const SURREALDB_NS = process.env.SURREALDB_NS || "test";
const SURREALDB_DB = process.env.SURREALDB_DB || "knowledge";
// The KnowledgeGraphManager class handles SurrealDB operations
class KnowledgeGraphManager {
    db;
    /**
     * Initialize SurrealDB database and schema
     */
    async initialize() {
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
        }
        catch (error) {
            trace.error("Failed to initialize SurrealDB:", error);
            throw error;
        }
    }
    /**
     * Set up the database schema for entities and relations
     */
    async setupSchema() {
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
            }
            else {
                trace.info("Schema already exists, skipping setup.");
            }
        }
        catch (error) {
            trace.error("Error setting up schema:", error);
            throw error;
        }
    }
    /**
     * Create multiple entities in the knowledge graph
     */
    async createEntities(entities) {
        const createdEntities = [];
        for (const entity of entities) {
            try {
                // Check if entity already exists
                const existing = await this.db.query("SELECT * FROM entity WHERE name = $name", { name: entity.name });
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
                            name: created.name,
                            entityType: created.entityType,
                            observations: created.observations || [],
                        });
                    }
                }
            }
            catch (error) {
                trace.error(`Error creating entity ${entity.name}:`, error);
            }
        }
        return createdEntities;
    }
    /**
     * Create multiple relations in the knowledge graph
     */
    async createRelations(relations) {
        const createdRelations = [];
        for (const relation of relations) {
            try {
                // Check if relation already exists
                const existing = await this.db.query("SELECT * FROM relation WHERE from = $from AND to = $to AND relationType = $relationType", {
                    from: relation.from,
                    to: relation.to,
                    relationType: relation.relationType,
                });
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
                            from: created.from,
                            to: created.to,
                            relationType: created.relationType,
                        });
                    }
                }
            }
            catch (error) {
                trace.error(`Error creating relation from ${relation.from} to ${relation.to}:`, error);
            }
        }
        return createdRelations;
    }
    /**
     * Add observations to existing entities
     */
    async addObservations(observations) {
        const results = [];
        for (const obs of observations) {
            try {
                // Get current entity
                const existing = await this.db.query("SELECT * FROM entity WHERE name = $name", { name: obs.entityName });
                if (!existing[0] || existing[0].length === 0) {
                    throw new Error(`Entity with name ${obs.entityName} not found`);
                }
                const entity = existing[0][0];
                if (!entity || !entity.observations) {
                    throw new Error(`Invalid entity data for ${obs.entityName}`);
                }
                const currentObservations = new Set(entity.observations);
                const newObservations = obs.contents.filter((content) => !currentObservations.has(content));
                if (newObservations.length > 0) {
                    // Update entity with new observations
                    await this.db.query("UPDATE entity SET observations = array::concat(observations, $newObs) WHERE name = $name", {
                        name: obs.entityName,
                        newObs: newObservations,
                    });
                    results.push({
                        entityName: obs.entityName,
                        addedObservations: newObservations,
                    });
                }
                else {
                    results.push({
                        entityName: obs.entityName,
                        addedObservations: [],
                    });
                }
            }
            catch (error) {
                trace.error(`Error adding observations to ${obs.entityName}:`, error);
                throw error;
            }
        }
        return results;
    }
    /**
     * Delete entities from the knowledge graph
     */
    async deleteEntities(entityNames) {
        try {
            // Delete entities
            await this.db.query("DELETE FROM entity WHERE name IN $names", { names: entityNames });
            // Delete related relations
            await this.db.query("DELETE FROM relation WHERE from IN $names OR to IN $names", { names: entityNames });
            return { success: true, message: "Entities deleted successfully" };
        }
        catch (error) {
            trace.error("Error deleting entities:", error);
            throw error;
        }
    }
    /**
     * Delete specific observations from entities
     */
    async deleteObservations(deletions) {
        try {
            for (const deletion of deletions) {
                // Get current entity
                const existing = await this.db.query("SELECT * FROM entity WHERE name = $name", { name: deletion.entityName });
                if (!existing[0] || existing[0].length === 0) {
                    continue; // Skip if entity doesn't exist
                }
                const entity = existing[0][0];
                if (!entity || !entity.observations) {
                    continue;
                }
                const updatedObservations = entity.observations.filter((obs) => !deletion.observations.includes(obs));
                // Update entity with filtered observations
                await this.db.query("UPDATE entity SET observations = $observations WHERE name = $name", {
                    name: deletion.entityName,
                    observations: updatedObservations,
                });
            }
            return { success: true, message: "Observations deleted successfully" };
        }
        catch (error) {
            trace.error("Error deleting observations:", error);
            throw error;
        }
    }
    /**
     * Delete relations from the knowledge graph
     */
    async deleteRelations(relations) {
        try {
            for (const relation of relations) {
                await this.db.query("DELETE FROM relation WHERE from = $from AND to = $to AND relationType = $relationType", {
                    from: relation.from,
                    to: relation.to,
                    relationType: relation.relationType,
                });
            }
            return { success: true, message: "Relations deleted successfully" };
        }
        catch (error) {
            trace.error("Error deleting relations:", error);
            throw error;
        }
    }
    /**
     * Read the entire knowledge graph
     */
    async readGraph() {
        try {
            // Get all entities
            const entitiesResult = await this.db.query("SELECT * FROM entity");
            // Extract and convert to Entity array
            const entities = !entitiesResult[0] ? [] :
                entitiesResult[0].map((entity) => ({
                    name: entity.name,
                    entityType: entity.entityType,
                    observations: entity.observations || []
                }));
            // Get all relations
            const relationsResult = await this.db.query("SELECT * FROM relation");
            // Extract and convert to Relation array
            const relations = !relationsResult[0] ? [] :
                relationsResult[0].map((relation) => ({
                    from: relation.from,
                    to: relation.to,
                    relationType: relation.relationType
                }));
            return { entities, relations };
        }
        catch (error) {
            trace.error("Error reading graph:", error);
            throw error;
        }
    }
    /**
     * Search the knowledge graph for entities matching a query
     */
    async searchNodes(query) {
        try {
            // Search for entities
            const entitiesResult = await this.db.query(`
        SELECT * FROM entity 
        WHERE 
          string::lowercase(name) CONTAINS string::lowercase($query) 
          OR string::lowercase(entityType) CONTAINS string::lowercase($query) 
          OR array::filter(observations, function($observation) {
              return string::lowercase($observation) CONTAINS string::lowercase($query);
          }) != []
        `, { query });
            // Extract and convert to Entity array
            const entities = !entitiesResult[0] ? [] :
                entitiesResult[0].map((entity) => ({
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
            const relationsResult = await this.db.query(`
        SELECT * FROM relation 
        WHERE 
          from IN $names AND to IN $names
        `, { names: entityNames });
            // Extract and convert to Relation array
            const relations = !relationsResult[0] ? [] :
                relationsResult[0].map((relation) => ({
                    from: relation.from,
                    to: relation.to,
                    relationType: relation.relationType
                }));
            return { entities, relations };
        }
        catch (error) {
            trace.error("Error searching nodes:", error);
            throw error;
        }
    }
    /**
     * Open specific nodes in the knowledge graph
     */
    async openNodes(names) {
        try {
            // Get specified entities
            const entitiesResult = await this.db.query("SELECT * FROM entity WHERE name IN $names", { names });
            // Extract and convert to Entity array
            const entities = !entitiesResult[0] ? [] :
                entitiesResult[0].map((entity) => ({
                    name: entity.name,
                    entityType: entity.entityType,
                    observations: entity.observations || []
                }));
            // Get relations between these entities
            const relationsResult = await this.db.query("SELECT * FROM relation WHERE from IN $names AND to IN $names", { names });
            // Extract and convert to Relation array
            const relations = !relationsResult[0] ? [] :
                relationsResult[0].map((relation) => ({
                    from: relation.from,
                    to: relation.to,
                    relationType: relation.relationType
                }));
            return { entities, relations };
        }
        catch (error) {
            trace.error("Error opening nodes:", error);
            throw error;
        }
    }
}
// Initialize the knowledge graph manager
const knowledgeGraphManager = new KnowledgeGraphManager();
// Main function to set up the system
async function main() {
    try {
        // Initialize SurrealDB connection and schema
        await knowledgeGraphManager.initialize();
        // Set up the JSON-RPC message handler
        process.stdin.on('data', async (data) => {
            try {
                const message = data.toString().trim();
                if (message) {
                    trace.info("DIRECT: Message received:", message);
                    const parsedMessage = JSON.parse(message);
                    if (parsedMessage.method === 'mcp.listTools') {
                        trace.info("DIRECT: Handling listTools request");
                        // Create a complete response with all tools
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
                                    {
                                        name: "search_nodes",
                                        description: "Search for nodes in the knowledge graph based on a query",
                                        inputSchema: {
                                            type: "object",
                                            properties: {
                                                query: {
                                                    type: "string",
                                                    description: "The search query to match against entity names, types, and observation content",
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
                                                                description: "An array of observation contents associated with the entity",
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
                                                                description: "The name of the entity where the relation starts",
                                                            },
                                                            to: {
                                                                type: "string",
                                                                description: "The name of the entity where the relation ends",
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
                                                                description: "The name of the entity to add the observations to",
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
                                        description: "Delete multiple entities and their associated relations from the knowledge graph",
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
                                                                description: "The name of the entity containing the observations",
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
                                                                description: "The name of the entity where the relation starts",
                                                            },
                                                            to: {
                                                                type: "string",
                                                                description: "The name of the entity where the relation ends",
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
                                    }
                                ]
                            }
                        };
                        trace.info("DIRECT: Sending response");
                        console.log(JSON.stringify(response));
                    }
                    else if (parsedMessage.method === 'mcp.callTool') {
                        trace.info("DIRECT: Handling callTool request");
                        // Extract tool name and arguments
                        const toolName = parsedMessage.params?.name;
                        const toolArgs = parsedMessage.params?.arguments || {};
                        trace.info(`DIRECT: Call to tool: ${toolName}`);
                        trace.debug("DIRECT: Tool arguments:", JSON.stringify(toolArgs));
                        try {
                            let result;
                            // Handle all the tools
                            switch (toolName) {
                                case "read_graph":
                                    result = await knowledgeGraphManager.readGraph();
                                    break;
                                case "search_nodes":
                                    result = await knowledgeGraphManager.searchNodes(toolArgs.query);
                                    break;
                                case "open_nodes":
                                    result = await knowledgeGraphManager.openNodes(toolArgs.names);
                                    break;
                                case "create_entities":
                                    result = await knowledgeGraphManager.createEntities(toolArgs.entities);
                                    break;
                                case "create_relations":
                                    result = await knowledgeGraphManager.createRelations(toolArgs.relations);
                                    break;
                                case "add_observations":
                                    result = await knowledgeGraphManager.addObservations(toolArgs.observations);
                                    break;
                                case "delete_entities":
                                    result = await knowledgeGraphManager.deleteEntities(toolArgs.entityNames);
                                    break;
                                case "delete_observations":
                                    result = await knowledgeGraphManager.deleteObservations(toolArgs.deletions);
                                    break;
                                case "delete_relations":
                                    result = await knowledgeGraphManager.deleteRelations(toolArgs.relations);
                                    break;
                                default:
                                    throw new Error(`Unknown tool: ${toolName}`);
                            }
                            // Create success response
                            const response = {
                                jsonrpc: "2.0",
                                id: parsedMessage.id,
                                result: {
                                    content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
                                }
                            };
                            trace.info("DIRECT: Sending response");
                            console.log(JSON.stringify(response));
                        }
                        catch (error) {
                            trace.error(`DIRECT: Error executing tool ${toolName}:`, error);
                            // Create error response
                            const errorResponse = {
                                jsonrpc: "2.0",
                                id: parsedMessage.id,
                                error: {
                                    code: -32000,
                                    message: `Error executing tool ${toolName}: ${error instanceof Error ? error.message : String(error)}`
                                }
                            };
                            console.log(JSON.stringify(errorResponse));
                        }
                    }
                }
            }
            catch (error) {
                trace.error("DIRECT: Error processing message:", error);
            }
        });
        trace.info("MCP server direct handler ready for messages");
    }
    catch (error) {
        trace.error("Fatal error during startup:", error);
        process.exit(1);
    }
}
// Start the server
main().catch(error => {
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
