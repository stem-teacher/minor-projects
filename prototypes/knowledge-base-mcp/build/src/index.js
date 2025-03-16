#!/usr/bin/env node
/**
 * Knowledge Graph MCP Server
 *
 * This is the main entry point for the knowledge graph MCP server.
 * It implements the Model Context Protocol (MCP) for Claude Desktop
 * integration, handles JSON-RPC requests, and routes them to the
 * KnowledgeGraphManager for database operations.
 *
 * The server exposes tools for creating, reading, updating, and
 * deleting entities, relations, and observations in the knowledge graph.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { KnowledgeGraphManager, trace } from './database.js';
import * as dotenv from 'dotenv';
// Load environment variables
dotenv.config();
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
        // Create the MCP server with proper capabilities
        const server = new Server({
            name: "knowledge-graph-mcp",
            version: "1.0.0",
        }, {
            capabilities: {
                tools: {
                    supportedMethodNames: tools.map(tool => tool.name)
                },
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
