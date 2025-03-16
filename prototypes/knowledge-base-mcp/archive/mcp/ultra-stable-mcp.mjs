#!/usr/bin/env node

/**
 * Ultra-minimal MCP Server designed to stay alive
 */

import * as fs from 'fs';
import { EOL } from 'os';

// Set up logging to file
const logFile = '/tmp/ultra-stable-mcp.log';
fs.writeFileSync(logFile, `Ultra Stable MCP Server Started at ${new Date().toISOString()}${EOL}`);

// Log function
function log(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `[${timestamp}] ${message}${EOL}`);
}

// Initialize with empty tools
const tools = [
  {
    name: "read_graph",
    description: "Read the entire knowledge graph (placeholder)",
    inputSchema: {
      type: "object",
      properties: {},
    }
  }
];

// Process stdin using an extremely simple line-based approach
process.stdin.on('data', (data) => {
  try {
    const line = data.toString().trim();
    log(`Received data: ${line}`);
    
    if (!line) return;
    
    const message = JSON.parse(line);
    log(`Parsed message: ${JSON.stringify(message)}`);
    
    // Handle initialization 
    if (message.method === 'initialize') {
      const response = {
        jsonrpc: "2.0",
        id: message.id,
        result: {
          serverInfo: {
            name: "knowledge-graph-ultra-stable",
            version: "1.0.0" 
          },
          protocolVersion: "2024-11-05"
        }
      };
      
      console.log(JSON.stringify(response));
      log(`Sent initialization response`);
      
      // Send initialized notification immediately after the response
      const notification = {
        jsonrpc: "2.0",
        method: "initialized",
        params: {}
      };
      
      console.log(JSON.stringify(notification));
      log(`Sent initialized notification`);
    }
    
    // List tools
    else if (message.method === 'mcp.listTools') {
      const response = {
        jsonrpc: "2.0",
        id: message.id,
        result: { tools }
      };
      
      console.log(JSON.stringify(response));
      log(`Sent tools list`);
    }
    
    // Handle tool calls
    else if (message.method === 'mcp.callTool') {
      const toolName = message.params?.name;
      
      // Always return empty knowledge graph
      const response = {
        jsonrpc: "2.0",
        id: message.id,
        result: {
          content: [{ 
            type: "text", 
            text: JSON.stringify({ entities: [], relations: [] }, null, 2)
          }]
        }
      };
      
      console.log(JSON.stringify(response));
      log(`Sent empty result for tool ${toolName}`);
    }
    
    // Prompts list
    else if (message.method === 'prompts/list') {
      const response = {
        jsonrpc: "2.0",
        id: message.id,
        result: { prompts: [] }
      };
      
      console.log(JSON.stringify(response));
      log('Sent empty prompts list');
    }
    
    // Shutdown
    else if (message.method === 'shutdown') {
      const response = {
        jsonrpc: "2.0",
        id: message.id,
        result: null
      };
      
      console.log(JSON.stringify(response));
      log('Received shutdown, but staying alive');
    }
    
    // Other methods with an ID
    else if (message.id) {
      const response = {
        jsonrpc: "2.0",
        id: message.id,
        error: {
          code: -32601,
          message: `Method not supported: ${message.method}`
        }
      };
      
      console.log(JSON.stringify(response));
      log(`Sent error for method: ${message.method}`);
    }
  } catch (error) {
    log(`Error processing message: ${error.stack}`);
  }
});

// Log errors but don't exit
process.on('error', (error) => {
  log(`Process error: ${error.stack}`);
});

process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error.stack}`);
});

process.on('unhandledRejection', (reason) => {
  log(`Unhandled rejection: ${reason}`);
});

process.on('SIGINT', () => {
  log('SIGINT received, but staying alive');
});

process.on('SIGTERM', () => {
  log('SIGTERM received, but staying alive');
});

process.on('exit', () => {
  log('Exit event received, but staying alive');
});

// Handle stdin ending
process.stdin.on('end', () => {
  log('stdin ended, but keeping process alive');
});

// Set stdin to flowing mode
process.stdin.resume();

// Keep process alive with multiple approaches
setInterval(() => {
  log('Keep-alive tick');
}, 300000); // Log every 5 minutes

// Additional no-op interval to keep event loop active
setInterval(() => {}, 60000);

log('Ultra-stable MCP server ready');