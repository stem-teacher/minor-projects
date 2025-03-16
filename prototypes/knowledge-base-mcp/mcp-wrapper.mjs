#!/usr/bin/env node

/**
 * Simple MCP Wrapper for SurrealDB Knowledge Graph
 * 
 * This handles the MCP handshake protocol for Claude Desktop
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
  
  const mainPath = path.join(__dirname, 'build', 'index.mjs');
  trace.info(`Main process path: ${mainPath}`);
  
  const mainProcess = spawn('node', [mainPath], {
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
    
    // Read from stdin and forward to the main process
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
          return;
        }
        
        // Handle initialized notification
        if (parsedMessage.method === 'initialized') {
          trace.info('Received initialized notification');
          // No response needed
          return;
        }
        
        // Forward all other messages to the main process
        mainProcess.stdin.write(Buffer.from(message + '\n'));
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