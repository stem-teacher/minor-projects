#!/usr/bin/env node

/**
 * Simple MCP Handler for SurrealDB Knowledge Graph
 * 
 * This is a minimal implementation that works with Claude Desktop
 * without dependencies, directly handling the JSON-RPC protocol.
 */

import { spawn } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name (ES modules don't have __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up logging
const TRACE_LEVEL = process.env.TRACE_LEVEL || "INFO";
const trace = {
  debug: (...args) => TRACE_LEVEL === "DEBUG" && console.error('[DEBUG]', ...args),
  info: (...args) => (TRACE_LEVEL === "DEBUG" || TRACE_LEVEL === "INFO") && console.error('[INFO]', ...args),
  error: (...args) => console.error('[ERROR]', ...args)
};

// Launch our main process
function launchMainProcess() {
  trace.info('Launching main process...');
  
  const mainProcess = spawn('node', [
    path.join(__dirname, 'build', 'index.mjs')
  ], {
    env: {
      ...process.env,
      // Forward all environment variables
    },
    stdio: ['pipe', 'pipe', 'inherit'] // pipe stdin/stdout, inherit stderr
  });
  
  // Handle process exit
  mainProcess.on('exit', (code, signal) => {
    trace.error(`Main process exited with code ${code} and signal ${signal}`);
    process.exit(code || 0);
  });
  
  return mainProcess;
}

// Main wrapper function
async function main() {
  try {
    trace.info('Starting MCP wrapper...');
    
    // Launch the main process
    const mainProcess = launchMainProcess();
    
    // Handle initialization ourselves
    process.stdin.on('data', (data) => {
      try {
        const message = data.toString().trim();
        if (!message) return;
        
        trace.debug(`Received message: ${message}`);
        const parsedMessage = JSON.parse(message);
        
        // Handle initialization specially
        if (parsedMessage.method === 'initialize') {
          trace.info('Handling initialization');
          
          // Respond with initialization response
          const response = {
            jsonrpc: '2.0',
            id: parsedMessage.id,
            result: {
              serverInfo: {
                name: 'knowledge-graph-mcp',
                version: '1.0.0'
              },
              protocolVersion: '2024-11-05'
            }
          };
          
          console.log(JSON.stringify(response));
          
          // Simulate 'initialized' notification from client
          trace.info('Simulating initialized notification');
          setTimeout(() => {
            const initializedMessage = {
              method: 'initialized',
              params: {},
              jsonrpc: '2.0'
            };
            mainProcess.stdin.write(JSON.stringify(initializedMessage) + '\n');
          }, 100);
          
          return;
        }
        
        // Forward all other messages directly to the main process
        mainProcess.stdin.write(data);
      } catch (error) {
        trace.error('Error processing message:', error);
      }
    });
    
    // Forward responses from the main process to stdout
    mainProcess.stdout.on('data', (data) => {
      process.stdout.write(data);
    });
    
    trace.info('MCP wrapper ready');
  } catch (error) {
    trace.error('Fatal error during startup:', error);
    process.exit(1);
  }
}

// Handle errors
process.on('uncaughtException', (error) => {
  trace.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  trace.error('Unhandled rejection at:', promise, 'reason:', reason);
});

// Start the server
main().catch(error => {
  trace.error('Fatal error in main():', error);
  process.exit(1);
});