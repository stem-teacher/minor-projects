#!/usr/bin/env node

/**
 * Test script for the MCP wrapper
 * Simulates the handshake and basic tool calls
 */

import { spawn } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to wait
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testWrapper() {
  console.log("Testing MCP wrapper...");
  
  // Launch the wrapper process
  const wrapper = spawn('node', [
    path.join(__dirname, 'mcp-wrapper.mjs')
  ], {
    env: {
      ...process.env,
      TRACE_LEVEL: "DEBUG"
    },
    stdio: ['pipe', 'pipe', 'inherit'] // pipe stdin/stdout, inherit stderr
  });
  
  // Set up readline interface
  const rl = createInterface({
    input: wrapper.stdout,
    terminal: false
  });
  
  // Process responses
  const responses = [];
  rl.on('line', (line) => {
    console.log(`RESPONSE: ${line}`);
    if (line.trim()) {
      try {
        responses.push(JSON.parse(line));
      } catch (e) {
        console.error(`Error parsing response: ${e.message}`);
      }
    }
  });
  
  try {
    // Step 1: Initialize
    console.log("\nSending initialize request...");
    const initializeRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test-client", version: "1.0.0" }
      }
    };
    wrapper.stdin.write(JSON.stringify(initializeRequest) + '\n');
    
    // Wait for response
    await wait(500);
    
    // Step 2: Send 'initialized' notification
    console.log("\nSending initialized notification...");
    const initializedNotification = {
      jsonrpc: "2.0",
      method: "initialized",
      params: {}
    };
    wrapper.stdin.write(JSON.stringify(initializedNotification) + '\n');
    
    // Wait a bit
    await wait(500);
    
    // Step 3: List tools
    console.log("\nSending listTools request...");
    const listToolsRequest = {
      jsonrpc: "2.0",
      id: 2,
      method: "mcp.listTools",
      params: { _meta: {} }
    };
    wrapper.stdin.write(JSON.stringify(listToolsRequest) + '\n');
    
    // Wait for response
    await wait(1000);
    
    // Check results
    if (responses.length >= 2) {
      console.log("\nTest Results:");
      console.log("✅ Initialize: Successfully received response");
      
      if (responses[1].result && responses[1].result.tools) {
        console.log(`✅ listTools: Received ${responses[1].result.tools.length} tools`);
      } else {
        console.log("❌ listTools: Failed to get tools");
      }
    } else {
      console.log("\n❌ Test failed: Not enough responses received");
    }
  } catch (error) {
    console.error("Test error:", error);
  } finally {
    // Clean up
    wrapper.kill();
    rl.close();
  }
}

// Run the test
testWrapper();