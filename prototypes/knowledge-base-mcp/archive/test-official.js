import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the server script
const serverPath = join(__dirname, 'official-mcp.mjs');

// Spawn the server process
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Handle server output
server.stdout.on('data', (data) => {
  console.log(`[RECEIVED]: ${data.toString().trim()}`);
  handleResponse(data.toString());
});

server.stderr.on('data', (data) => {
  console.error(`[ERROR]: ${data.toString().trim()}`);
});

// Handle server exit
server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

// Sequence of messages to send
const messages = [
  { 
    method: 'initialize', 
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' }
    },
    jsonrpc: '2.0',
    id: 1
  },
  {
    method: 'mcp.listTools',
    params: {},
    jsonrpc: '2.0',
    id: 2
  },
  {
    method: 'mcp.callTool',
    params: {
      name: 'read_graph',
      arguments: {}
    },
    jsonrpc: '2.0',
    id: 3
  },
  {
    method: 'mcp.callTool',
    params: {
      name: 'create_entities',
      arguments: {
        entities: [
          {
            name: 'AI',
            entityType: 'Technology',
            observations: ['Artificial intelligence is a rapidly advancing field']
          },
          {
            name: 'Machine Learning',
            entityType: 'Technology',
            observations: ['A subset of AI focused on learning from data']
          }
        ]
      }
    },
    jsonrpc: '2.0',
    id: 4
  },
  {
    method: 'mcp.callTool',
    params: {
      name: 'create_relations',
      arguments: {
        relations: [
          {
            from: 'Machine Learning',
            to: 'AI',
            relationType: 'is_a_subset_of'
          }
        ]
      }
    },
    jsonrpc: '2.0',
    id: 5
  },
  {
    method: 'mcp.callTool',
    params: {
      name: 'read_graph',
      arguments: {}
    },
    jsonrpc: '2.0',
    id: 6
  },
  {
    method: 'shutdown',
    params: {},
    jsonrpc: '2.0',
    id: 7
  }
];

// Track which message to send next
let messageIndex = 0;

// Process responses and send the next message
function handleResponse(data) {
  try {
    // Wait for a moment, then send the next message
    if (messageIndex < messages.length) {
      const nextMessage = messages[messageIndex++];
      console.log(`[SENDING]: ${JSON.stringify(nextMessage)}`);
      server.stdin.write(JSON.stringify(nextMessage) + '\n');
    } else {
      console.log('All messages sent');
    }
  } catch (error) {
    console.error('Error handling response:', error);
  }
}

// Start by sending the first message
console.log('Starting test...');
handleResponse();