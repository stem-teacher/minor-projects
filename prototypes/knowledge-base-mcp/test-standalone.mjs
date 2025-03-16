#!/usr/bin/env node

/**
 * Test for the standalone MCP implementation that works with Claude Desktop
 */

import { spawn } from 'child_process';
import readline from 'readline';
import { execSync } from 'child_process';

// Helper function to wait
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Get the full path to node executable
const getNodePath = () => {
  try {
    // Try to get the path to the node executable
    return execSync('which node').toString().trim();
  } catch (error) {
    // Fallback to some common locations
    for (const path of [
      '/usr/local/bin/node',
      '/usr/bin/node',
      '/opt/homebrew/bin/node',
      process.execPath // Use the current node executable path
    ]) {
      try {
        if (execSync(`ls ${path}`).toString().trim()) {
          return path;
        }
      } catch (e) {
        // Path doesn't exist, try next one
      }
    }
    // If all else fails, just use 'node' and hope PATH is set correctly
    return 'node';
  }
};

async function runTest() {
  console.log("Starting Standalone MCP Integration Test...");
  
  const nodePath = getNodePath();
  console.log(`Using Node.js from: ${nodePath}`);
  
  // Start the MCP server
  console.log("\nStarting MCP server as a child process...");
  const mcp = spawn(nodePath, [
    './standalone-mcp.mjs'
  ], {
    env: {
      PATH: process.env.PATH // Pass the current PATH
    },
    stdio: ['pipe', 'pipe', 'inherit'] // stdin, stdout, stderr
  });
  
  // Set up readline to process responses
  const rl = readline.createInterface({
    input: mcp.stdout,
    terminal: false
  });
  
  const responses = [];
  let requestId = 0;
  
  // Process responses
  rl.on('line', (line) => {
    if (line.trim()) {
      console.log(`RECEIVED: ${line}`);
      try {
        const json = JSON.parse(line);
        responses.push(json);
      } catch (error) {
        // Not JSON, probably trace output
      }
    }
  });
  
  // Send a request and wait for response
  const sendRequest = async (method, params) => {
    requestId++;
    const request = {
      jsonrpc: "2.0",
      id: requestId,
      method: method,
      params: params
    };
    
    console.log(`\nSENDING ${method} request:`);
    console.log(JSON.stringify(request, null, 2));
    
    const responseIndex = responses.length;
    mcp.stdin.write(JSON.stringify(request) + '\n');
    
    // Wait for response (with timeout)
    for (let i = 0; i < 30; i++) {
      await wait(100);
      if (responses.length > responseIndex) {
        return responses[responses.length - 1];
      }
    }
    
    throw new Error(`No response received for request ID ${requestId}`);
  };
  
  // Function to call a specific tool
  const callTool = async (toolName, args = {}) => {
    return sendRequest('mcp.callTool', {
      name: toolName,
      arguments: args,
      _meta: {}
    });
  };
  
  // Wait for server to start
  console.log("Waiting for server initialization...");
  await wait(1000);
  
  // Initialize the server
  console.log("\n=== Sending initialize request ===");
  await sendRequest('initialize', {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: {
      name: "test-client",
      version: "1.0.0"
    }
  });
  
  // Get the list of tools
  console.log("\n=== Testing listTools ===");
  const listToolsResponse = await sendRequest('mcp.listTools', { _meta: {} });
  console.log("\nTools available:");
  if (listToolsResponse?.result?.tools) {
    listToolsResponse.result.tools.forEach(tool => {
      console.log(`- ${tool.name}: ${tool.description}`);
    });
  }
  
  // Test creating an entity
  console.log("\n=== Creating test entity ===");
  const createResponse = await callTool('create_entity', {
    name: "Test Entity",
    entityType: "TestType",
    observations: ["This is a test entity created by the test script"]
  });
  console.log("\nCreate entity response:");
  console.log(JSON.stringify(createResponse.result, null, 2));
  
  // Read the graph
  console.log("\n=== Reading graph ===");
  const readResponse = await callTool('read_graph');
  console.log("\nCurrent graph state:");
  console.log(readResponse.result.content[0].text);
  
  // Test creating a relation (first create another entity)
  console.log("\n=== Creating second entity ===");
  await callTool('create_entity', {
    name: "Related Entity",
    entityType: "TestType",
    observations: ["This is a related entity"]
  });
  
  console.log("\n=== Creating relation ===");
  const relationResponse = await callTool('create_relation', {
    from: "Test Entity",
    to: "Related Entity",
    relationType: "CONNECTED_TO"
  });
  console.log("\nCreate relation response:");
  console.log(JSON.stringify(relationResponse.result, null, 2));
  
  // Search for entities
  console.log("\n=== Searching for entities ===");
  const searchResponse = await callTool('search_nodes', {
    query: "test"
  });
  console.log("\nSearch results:");
  console.log(searchResponse.result.content[0].text);
  
  // Print test summary
  console.log("\n===== TEST SUMMARY =====");
  console.log(`Total requests sent: ${requestId}`);
  console.log(`Total responses received: ${responses.length}`);
  
  // Cleanup
  console.log("\nShutting down server...");
  rl.close();
  mcp.stdin.end();
  mcp.kill();
  
  console.log("Test complete.");
}

runTest().catch(error => {
  console.error("Test failed:", error);
  process.exit(1);
});