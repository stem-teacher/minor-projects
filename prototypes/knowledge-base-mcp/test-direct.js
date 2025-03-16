#!/usr/bin/env node

/**
 * Test Claude Desktop Integration using the direct implementation
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
  console.log("Starting Claude Desktop Integration Test...");
  
  const nodePath = getNodePath();
  console.log(`Using Node.js from: ${nodePath}`);
  
  // Start the MCP server the same way Claude Desktop would
  console.log("\nStarting MCP server as a child process...");
  const mcp = spawn(nodePath, [
    '/Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/knowledge-base-mcp/standalone-mcp.mjs'
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
  
  // Wait for server to start
  console.log("Waiting for server initialization...");
  await wait(3000);
  
  console.log("\nSending listTools request (as Claude Desktop would)...");
  
  // Format exactly as Claude Desktop would - inspected from Claude Desktop source
  const listToolsRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "mcp.listTools",
    params: {
      _meta: {}
    }
  };
  
  console.log(`SENDING: ${JSON.stringify(listToolsRequest, null, 2)}`);
  mcp.stdin.write(JSON.stringify(listToolsRequest) + '\n');
  
  // Wait for response
  await wait(3000);
  
  // If we got a response, try a tool call
  if (responses.length > 0) {
    console.log("\nSending callTool request for read_graph...");
    
    const callToolRequest = {
      jsonrpc: "2.0",
      id: 2,
      method: "mcp.callTool",
      params: {
        name: "read_graph",
        arguments: {},
        _meta: {}
      }
    };
    
    console.log(`SENDING: ${JSON.stringify(callToolRequest, null, 2)}`);
    mcp.stdin.write(JSON.stringify(callToolRequest) + '\n');
    
    // Wait for response
    await wait(3000);
  }
  
  // Analyze results
  console.log("\n===== TEST RESULTS =====");
  console.log(`Total responses received: ${responses.length}`);
  
  if (responses.length > 0) {
    console.log("\nResponses received:");
    for (const [index, response] of responses.entries()) {
      console.log(`\nResponse #${index + 1}:`);
      console.log(JSON.stringify(response, null, 2));
    }
  } else {
    console.log("\nNo responses received. The MCP server might not be communicating properly over stdio.");
  }
  
  console.log("\nTest complete.");
  
  // Cleanup
  rl.close();
  mcp.stdin.end();
  mcp.kill();
}

runTest().catch(error => {
  console.error("Test failed:", error);
  process.exit(1);
});
