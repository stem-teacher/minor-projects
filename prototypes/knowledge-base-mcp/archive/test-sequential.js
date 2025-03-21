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
  processNextStep();
});

server.stderr.on('data', (data) => {
  console.error(`[ERROR]: ${data.toString().trim()}`);
});

// Handle server exit
server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

// Sequence of messages to send
const steps = [
  {
    message: { 
      method: 'initialize', 
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      },
      jsonrpc: '2.0',
      id: 1
    },
    description: "Initializing server"
  },
  {
    message: {
      method: 'mcp.listTools',
      params: {},
      jsonrpc: '2.0',
      id: 2
    },
    description: "Getting list of tools"
  },
  {
    // First let's clean up any existing entities
    message: {
      method: 'mcp.callTool',
      params: {
        name: 'read_graph',
        arguments: {}
      },
      jsonrpc: '2.0',
      id: 3
    },
    description: "Reading initial graph state"
  },
  {
    message: {
      method: 'mcp.callTool',
      params: {
        name: 'create_entities',
        arguments: {
          entities: [
            {
              name: 'AI',
              entityType: 'Technology',
              observations: ['Artificial intelligence is a rapidly advancing field']
            }
          ]
        }
      },
      jsonrpc: '2.0',
      id: 4
    },
    description: "Creating first entity: AI"
  },
  {
    message: {
      method: 'mcp.callTool',
      params: {
        name: 'create_entities',
        arguments: {
          entities: [
            {
              name: 'Machine Learning',
              entityType: 'Technology',
              observations: ['A subset of AI focused on learning from data']
            }
          ]
        }
      },
      jsonrpc: '2.0',
      id: 5
    },
    description: "Creating second entity: Machine Learning"
  },
  {
    message: {
      method: 'mcp.callTool',
      params: {
        name: 'read_graph',
        arguments: {}
      },
      jsonrpc: '2.0',
      id: 6
    },
    description: "Verifying entities were created"
  },
  {
    message: {
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
      id: 7
    },
    description: "Creating relation between entities"
  },
  {
    message: {
      method: 'mcp.callTool',
      params: {
        name: 'read_graph',
        arguments: {}
      },
      jsonrpc: '2.0',
      id: 8
    },
    description: "Verifying relation was created"
  },
  {
    message: {
      method: 'mcp.callTool',
      params: {
        name: 'add_observations',
        arguments: {
          observations: [
            {
              entityName: 'AI',
              contents: ['AI is being applied to many fields including healthcare and finance']
            }
          ]
        }
      },
      jsonrpc: '2.0',
      id: 9
    },
    description: "Adding observation to AI entity"
  },
  {
    message: {
      method: 'mcp.callTool',
      params: {
        name: 'read_graph',
        arguments: {}
      },
      jsonrpc: '2.0',
      id: 10
    },
    description: "Verifying observation was added"
  },
  {
    message: {
      method: 'mcp.callTool',
      params: {
        name: 'search_nodes',
        arguments: {
          query: "Machine"
        }
      },
      jsonrpc: '2.0',
      id: 11
    },
    description: "Searching for 'Machine'"
  },
  {
    message: {
      method: 'mcp.callTool',
      params: {
        name: 'delete_entities',
        arguments: {
          entityNames: ["AI", "Machine Learning"]
        }
      },
      jsonrpc: '2.0',
      id: 12
    },
    description: "Cleaning up by deleting all entities"
  },
  {
    message: {
      method: 'shutdown',
      params: {},
      jsonrpc: '2.0',
      id: 13
    },
    description: "Shutting down server"
  }
];

// Track which step to send next
let currentStep = 0;
let waitForResponse = true;

// Send the next message in the sequence
function processNextStep() {
  if (waitForResponse) {
    // Wait for the next call to processNextStep
    waitForResponse = false;
    return;
  }
  
  if (currentStep < steps.length) {
    const step = steps[currentStep++];
    console.log(`\n----- STEP ${currentStep}: ${step.description} -----`);
    console.log(`[SENDING]: ${JSON.stringify(step.message)}`);
    server.stdin.write(JSON.stringify(step.message) + '\n');
    waitForResponse = true;
  } else {
    console.log('\nAll steps completed');
  }
}

// Start by sending the first message
console.log('Starting sequential test...');
processNextStep();