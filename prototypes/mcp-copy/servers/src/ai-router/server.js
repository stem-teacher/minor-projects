#!/usr/bin/env node

// Import necessary modules
const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load environment variables from .env file
if (fs.existsSync('.env')) {
  fs.readFileSync('.env', 'utf8')
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
}

console.error('AI Router MCP Server starting up...');

// Rest of your index.ts code, converted to CommonJS format
// ...

// Run the server
const server = new Server(/* ...server config... */);
// ... register handlers ...

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("AI Router MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
