#!/usr/bin/env node

/**
 * Minimal MCP Server for SurrealDB Knowledge Graph
 * This version focuses on protocol compliance and stability
 */

import * as fs from 'fs';
import { EOL } from 'os';
import Surreal from 'surrealdb';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Set up logging (only to file, not console)
const logFile = '/tmp/minimal-mcp-knowledge.log';
fs.writeFileSync(logFile, `Minimal MCP Server Started at ${new Date().toISOString()}${EOL}`);

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

// Initialize database
connectToDb().catch(err => {
  log(`Database initialization error: ${err.message}`);
});

// Available tools
const tools = [
  {
    name: "read_graph",
    description: "Read the entire knowledge graph",
    inputSchema: {
      type: "object",
      properties: {},
    }
  }
];

// Basic tool implementation (just for protocol compliance initially)
async function readGraph() {
  try {
    if (!db) return { entities: [], relations: [] };
    
    // Get all entities
    const entitiesResult = await db.query('SELECT * FROM entity');
    const entities = entitiesResult[0] || [];
    
    // Get all relations
    const relationsResult = await db.query('SELECT * FROM relation');
    const relations = relationsResult[0] || [];
    
    return { entities, relations };
  } catch (error) {
    log(`Error reading graph: ${error.message}`);
    return { entities: [], relations: [] };
  }
}

// Handle JSON-RPC message
async function handleMessage(message) {
  log(`Processing message: ${JSON.stringify(message)}`);
  
  try {
    if (message.method === 'initialize') {
      // Handle initialization
      const response = {
        jsonrpc: "2.0",
        id: message.id,
        result: {
          serverInfo: {
            name: "knowledge-graph-minimal",
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
    else if (message.method === 'mcp.listTools') {
      // List tools
      const response = {
        jsonrpc: "2.0",
        id: message.id,
        result: { tools }
      };
      console.log(JSON.stringify(response));
    }
    else if (message.method === 'prompts/list') {
      // Handle prompts list (required by Claude Desktop)
      const response = {
        jsonrpc: "2.0",
        id: message.id,
        result: { prompts: [] }
      };
      console.log(JSON.stringify(response));
    }
    else if (message.method === 'mcp.callTool') {
      // Handle tool call
      const toolName = message.params?.name;
      const args = message.params?.arguments || {};
      
      let result = null;
      
      if (toolName === 'read_graph') {
        result = await readGraph();
      } else {
        throw new Error(`Unknown tool: ${toolName}`);
      }
      
      const response = {
        jsonrpc: "2.0",
        id: message.id,
        result: {
          content: [{ 
            type: "text", 
            text: JSON.stringify(result, null, 2) 
          }]
        }
      };
      console.log(JSON.stringify(response));
    }
    else if (message.method === 'shutdown') {
      // Handle shutdown
      const response = {
        jsonrpc: "2.0",
        id: message.id,
        result: null
      };
      console.log(JSON.stringify(response));
    }
    else if (message.id) {
      // Unknown method with ID - return method not found
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
  } catch (error) {
    log(`Error handling message: ${error.stack}`);
    
    // If there's an ID, send error response
    if (message.id) {
      const errorResponse = {
        jsonrpc: "2.0",
        id: message.id,
        error: {
          code: -32000,
          message: `Error: ${error.message}`
        }
      };
      console.log(JSON.stringify(errorResponse));
    }
  }
}

// Set up stdin message handling
let buffer = '';

process.stdin.on('data', (chunk) => {
  buffer += chunk.toString();
  
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  
  for (const line of lines) {
    if (line.trim()) {
      try {
        const message = JSON.parse(line.trim());
        handleMessage(message).catch(err => {
          log(`Async error: ${err.stack}`);
        });
      } catch (error) {
        log(`Parse error: ${error.message} for line: ${line}`);
      }
    }
  }
});

// Handle process events
process.on('SIGINT', () => {
  log('SIGINT received');
  // Don't exit
});

process.on('SIGTERM', () => {
  log('SIGTERM received');
  // Don't exit
});

process.stdin.on('end', () => {
  log('stdin ended, but keeping process alive');
  // Don't exit
});

// Keep the process alive
process.stdin.resume();

log('Minimal MCP server ready');