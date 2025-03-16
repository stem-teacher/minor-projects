#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import Surreal from 'surrealdb';
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
const SURREALDB_NS = process.env.SURREALDB_NS || "development";
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
          DEFINE FIELD IF NOT EXISTS createdAt ON entity TYPE datetime;
          DEFINE FIELD IF NOT EXISTS updatedAt ON entity TYPE datetime;
          DEFINE INDEX IF NOT EXISTS entity_name ON entity COLUMNS name UNIQUE;
        `);
                await this.db.query(`
          DEFINE TABLE IF NOT EXISTS relation SCHEMAFULL;
          DEFINE FIELD IF NOT EXISTS from ON relation TYPE string;
          DEFINE FIELD IF NOT EXISTS to ON relation TYPE string;
          DEFINE FIELD IF NOT EXISTS relationType ON relation TYPE string;
          DEFINE FIELD IF NOT EXISTS createdAt ON relation TYPE datetime;
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
                    // Prepare observation objects with timestamps
                    const observationsWithTimestamps = entity.observations.map(obs => {
                        // Handle both string and Observation types for backward compatibility
                        if (typeof obs === 'string') {
                            return {
                                text: obs,
                                createdAt: new Date().toISOString()
                            };
                        }
                        else {
                            return obs;
                        }
                    });
                    const timestamp = new Date().toISOString();
                    // Create new entity
                    const result = await this.db.create("entity", {
                        name: entity.name,
                        entityType: entity.entityType,
                        observations: observationsWithTimestamps,
                        createdAt: timestamp,
                        updatedAt: timestamp
                    });
                    // SurrealDB might return an array or a single object
                    const created = Array.isArray(result) ? result[0] : result;
                    if (created && typeof created === 'object' && 'name' in created) {
                        createdEntities.push({
                            name: created.name,
                            entityType: created.entityType,
                            observations: created.observations || [],
                            createdAt: created.createdAt,
                            updatedAt: created.updatedAt
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
                trace.debug(`Creating relation: ${relation.from} --[${relation.relationType}]--> ${relation.to}`);
                // First, ensure both referenced entities exist
                const fromEntity = await this.db.query("SELECT * FROM entity WHERE name = $name", { name: relation.from });
                const toEntity = await this.db.query("SELECT * FROM entity WHERE name = $name", { name: relation.to });
                if (!fromEntity[0] || fromEntity[0].length === 0) {
                    trace.error(`From entity '${relation.from}' does not exist`);
                    continue;
                }
                if (!toEntity[0] || toEntity[0].length === 0) {
                    trace.error(`To entity '${relation.to}' does not exist`);
                    continue;
                }
                // Check if relation already exists
                const existing = await this.db.query("SELECT * FROM relation WHERE from = $from AND to = $to AND relationType = $relationType", {
                    from: relation.from,
                    to: relation.to,
                    relationType: relation.relationType,
                });
                if (!existing[0] || existing[0].length === 0) {
                    // Create new relation using CREATE instead of INSERT INTO for more reliable operation
                    const timestamp = new Date().toISOString();
                    const result = await this.db.query(`CREATE relation SET from = $from, to = $to, relationType = $relationType, createdAt = $createdAt`, {
                        from: relation.from,
                        to: relation.to,
                        relationType: relation.relationType,
                        createdAt: timestamp
                    });
                    trace.debug(`Relation creation raw result: ${JSON.stringify(result)}`);
                    if (result && result[0] && result[0].length > 0) {
                        const created = result[0][0];
                        trace.debug(`Created relation: ${JSON.stringify(created)}`);
                        createdRelations.push({
                            from: created.from,
                            to: created.to,
                            relationType: created.relationType,
                            createdAt: created.createdAt
                        });
                        trace.debug(`Successfully created relation and added to results`);
                    }
                    else {
                        trace.error(`Failed to create relation: ${relation.from} --[${relation.relationType}]--> ${relation.to}`);
                    }
                }
                else {
                    trace.debug(`Relation already exists: ${relation.from} --[${relation.relationType}]--> ${relation.to}`);
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
                // Convert existing observations to a set of text values for comparison
                const currentObservationTexts = new Set(entity.observations.map((o) => typeof o === 'string' ? o : o.text));
                // Create timestamped observations
                const timestamp = new Date().toISOString();
                const newObservationsWithTimestamps = obs.contents
                    .filter((content) => !currentObservationTexts.has(content))
                    .map(content => ({
                    text: content,
                    createdAt: timestamp
                }));
                if (newObservationsWithTimestamps.length > 0) {
                    // Update entity with new observations and update the updatedAt timestamp
                    await this.db.query("UPDATE entity SET observations = array::concat(observations, $newObs), updatedAt = $updatedAt WHERE name = $name", {
                        name: obs.entityName,
                        newObs: newObservationsWithTimestamps,
                        updatedAt: timestamp
                    });
                    results.push({
                        entityName: obs.entityName,
                        addedObservations: newObservationsWithTimestamps,
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
                const updatedObservations = entity.observations.filter((obs) => {
                    const obsText = typeof obs === 'string' ? obs : obs.text;
                    return !deletion.observations.includes(obsText);
                });
                // Update entity with filtered observations and update the updatedAt timestamp
                const timestamp = new Date().toISOString();
                await this.db.query("UPDATE entity SET observations = $observations, updatedAt = $updatedAt WHERE name = $name", {
                    name: deletion.entityName,
                    observations: updatedObservations,
                    updatedAt: timestamp
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
                trace.debug(`Deleting relation: ${relation.from} --[${relation.relationType}]--> ${relation.to}`);
                const result = await this.db.query("DELETE FROM relation WHERE from = $from AND to = $to AND relationType = $relationType", {
                    from: relation.from,
                    to: relation.to,
                    relationType: relation.relationType,
                });
                trace.debug(`Delete relation result: ${JSON.stringify(result)}`);
            }
            // Verify the deletion worked
            const verification = await this.db.query("SELECT count() FROM relation");
            trace.debug(`After deletion, relation count: ${JSON.stringify(verification)}`);
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
            const entities = [];
            if (entitiesResult && entitiesResult[0] && entitiesResult[0].length > 0) {
                for (const entity of entitiesResult[0]) {
                    entities.push({
                        name: entity.name,
                        entityType: entity.entityType,
                        observations: entity.observations || [],
                        createdAt: entity.createdAt,
                        updatedAt: entity.updatedAt
                    });
                }
            }
            trace.debug(`Found ${entities.length} entities`);
            // Get all relations using direct SQL approach for more reliable results
            const relationsResult = await this.db.query("SELECT * FROM relation");
            trace.debug(`Relations query result: ${JSON.stringify(relationsResult)}`);
            // Extract and convert to Relation array with simplified handling
            const relations = [];
            if (relationsResult && Array.isArray(relationsResult) && relationsResult.length > 0 && Array.isArray(relationsResult[0])) {
                for (const rel of relationsResult[0]) {
                    if (rel && typeof rel === 'object' && 'from' in rel && 'to' in rel && 'relationType' in rel) {
                        relations.push({
                            from: rel.from,
                            to: rel.to,
                            relationType: rel.relationType,
                            createdAt: rel.createdAt
                        });
                        trace.debug(`Added relation: ${rel.from} --[${rel.relationType}]--> ${rel.to}`);
                    }
                }
            }
            trace.debug(`Found ${relations.length} relations`);
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
            // Search for entities by name or type (without using JavaScript functions)
            const entitiesResultByNameType = await this.db.query(`
        SELECT * FROM entity 
        WHERE 
          string::lowercase(name) CONTAINS string::lowercase($query) 
          OR string::lowercase(entityType) CONTAINS string::lowercase($query) 
        `, { query });
            // Search for entities with matching observations (using a separate approach without JS functions)
            const entitiesResultByObservations = await this.db.query(`
        SELECT * FROM entity 
        WHERE 
          array::join(observations, ' ') CONTAINS $query
        `, { query });
            // Combine results and deduplicate
            let allEntities = [];
            // Add entities from first query
            if (entitiesResultByNameType[0] && entitiesResultByNameType[0].length > 0) {
                allEntities = [...entitiesResultByNameType[0]];
            }
            // Add entities from second query if not already included
            if (entitiesResultByObservations[0] && entitiesResultByObservations[0].length > 0) {
                for (const entity of entitiesResultByObservations[0]) {
                    if (!allEntities.some(e => e.name === entity.name)) {
                        allEntities.push(entity);
                    }
                }
            }
            // Extract and convert to Entity array
            const entities = allEntities.map((entity) => ({
                name: entity.name,
                entityType: entity.entityType,
                observations: entity.observations || [],
                createdAt: entity.createdAt,
                updatedAt: entity.updatedAt
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
                    relationType: relation.relationType,
                    createdAt: relation.createdAt
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
                    observations: entity.observations || [],
                    createdAt: entity.createdAt,
                    updatedAt: entity.updatedAt
                }));
            // Get relations between these entities
            const relationsResult = await this.db.query("SELECT * FROM relation WHERE from IN $names AND to IN $names", { names });
            // Extract and convert to Relation array
            const relations = !relationsResult[0] ? [] :
                relationsResult[0].map((relation) => ({
                    from: relation.from,
                    to: relation.to,
                    relationType: relation.relationType,
                    createdAt: relation.createdAt
                }));
            return { entities, relations };
        }
        catch (error) {
            trace.error("Error opening nodes:", error);
            throw error;
        }
    }
}
// Define the tools available through the MCP interface
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
];
async function main() {
    try {
        // Initialize knowledge graph manager and connect to database
        const knowledgeGraphManager = new KnowledgeGraphManager();
        await knowledgeGraphManager.initialize();
        // Create the MCP server
        const server = new Server({
            name: "knowledge-graph-mcp",
            version: "1.0.0",
        }, {
            capabilities: {
                tools: {},
            },
        });
        // Register tools list handler
        server.setRequestHandler(ListToolsRequestSchema, async () => {
            return { tools };
        });
        // Register tool call handler
        server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            trace.info(`Tool call: ${name}`);
            trace.debug("Tool arguments:", JSON.stringify(args));
            try {
                let result;
                // Handle all the tools
                switch (name) {
                    case "read_graph":
                        result = await knowledgeGraphManager.readGraph();
                        break;
                    case "search_nodes":
                        result = await knowledgeGraphManager.searchNodes(args?.query);
                        break;
                    case "open_nodes":
                        result = await knowledgeGraphManager.openNodes(args?.names);
                        break;
                    case "create_entities":
                        result = await knowledgeGraphManager.createEntities(args?.entities);
                        break;
                    case "create_relations":
                        result = await knowledgeGraphManager.createRelations(args?.relations);
                        break;
                    case "add_observations":
                        result = await knowledgeGraphManager.addObservations(args?.observations);
                        break;
                    case "delete_entities":
                        result = await knowledgeGraphManager.deleteEntities(args?.entityNames);
                        break;
                    case "delete_observations":
                        result = await knowledgeGraphManager.deleteObservations(args?.deletions);
                        break;
                    case "delete_relations":
                        result = await knowledgeGraphManager.deleteRelations(args?.relations);
                        break;
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
                // Return result as text content
                return {
                    content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
                };
            }
            catch (error) {
                trace.error(`Error executing tool ${name}:`, error);
                throw error;
            }
        });
        // Connect the server using stdio transport
        const transport = new StdioServerTransport();
        await server.connect(transport);
        trace.info("Knowledge Graph MCP Server ready with stdio transport");
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
