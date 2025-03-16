#!/usr/bin/env node

// A minimal test of the MCP SDK
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { RequestSchema } from "@modelcontextprotocol/sdk/types.js";
import * as fs from 'fs';

// Set up logging
const logFile = '/tmp/minimal-test.log';
fs.writeFileSync(logFile, `Minimal MCP Test Started at ${new Date().toISOString()}\n`);

function log(message) {
  try {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`);
  } catch (error) {
    // Silent catch
  }
}

// Create a minimal server with tools capability
const server = new Server(
  { name: "minimal-test", version: "1.0.0" },
  { 
    capabilities: { 
      tools: {
        supportedMethodNames: ["test_tool"]
      }
    } 
  }
);

// Define a test tool
const tools = [
  {
    name: "test_tool",
    description: "A test tool that echoes back its input",
    inputSchema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "Message to echo"
        }
      },
      required: ["message"]
    }
  }
];

// Start the server
async function main() {
  try {
    log("Initializing server...");
    const transport = new StdioServerTransport();
    await server.connect(transport);
    log("Server started and connected successfully");
  } catch (error) {
    log(`Error starting server: ${error.message}`);
  }
}

main().catch(error => {
  log(`Unhandled error: ${error.message}`);
});