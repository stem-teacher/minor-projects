#!/usr/bin/env node

/**
 * Comprehensive Test for Claude Desktop Knowledge Graph Integration
 * 
 * This test script performs a full test of all knowledge graph operations:
 * 1. List available tools
 * 2. Read initial graph state
 * 3. Create test entities
 * 4. Add observations to entities
 * 5. Create relations between entities
 * 6. Search for entities
 * 7. Open specific entities
 * 8. Delete observations
 * 9. Delete relations
 * 10. Delete entities
 * 11. Verify final state
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
  console.log("Starting Comprehensive Knowledge Graph Test...");
  
  const nodePath = getNodePath();
  console.log(`Using Node.js from: ${nodePath}`);
  
  // Start the MCP server
  console.log("\nStarting MCP server as a child process...");
  const mcp = spawn(nodePath, [
    '/Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/knowledge-base-mcp/build/index.mjs'
  ], {
    env: {
      SURREALDB_URL: "http://localhost:8070",
      SURREALDB_USER: "root",
      SURREALDB_PASS: "root",
      SURREALDB_NS: "test",
      SURREALDB_DB: "knowledge_test",
      TRACE_LEVEL: "DEBUG",
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
  await wait(3000);
  
  // Test results tracking
  const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
  };
  
  // Add test result
  const addTestResult = (name, passed, message = "") => {
    testResults.total++;
    if (passed) {
      testResults.passed++;
      console.log(`✅ ${name}: PASSED ${message ? '- ' + message : ''}`);
    } else {
      testResults.failed++;
      console.log(`❌ ${name}: FAILED ${message ? '- ' + message : ''}`);
    }
    
    testResults.tests.push({
      name,
      passed,
      message
    });
  };
  
  try {
    // 1. Test list tools
    console.log("\n=== Testing listTools ===");
    const listToolsResponse = await sendRequest('mcp.listTools', { _meta: {} });
    
    const hasTools = listToolsResponse?.result?.tools?.length > 0;
    addTestResult('listTools', hasTools, `Found ${hasTools ? listToolsResponse.result.tools.length : 0} tools`);
    
    // 2. Read initial graph state
    console.log("\n=== Testing read_graph (initial state) ===");
    const initialReadResponse = await callTool('read_graph');
    
    let initialGraphContent;
    try {
      initialGraphContent = JSON.parse(initialReadResponse.result.content[0].text);
      addTestResult('read_graph initial', true, 
        `Found ${initialGraphContent.entities.length} entities and ${initialGraphContent.relations.length} relations`);
    } catch (error) {
      addTestResult('read_graph initial', false, `Failed to parse response: ${error.message}`);
      initialGraphContent = { entities: [], relations: [] };
    }
    
    // 3. Create test entities
    console.log("\n=== Testing create_entities ===");
    const testEntities = [
      {
        name: "Test_Entity_1",
        entityType: "TestType",
        observations: ["This is the first test entity"]
      },
      {
        name: "Test_Entity_2",
        entityType: "TestType",
        observations: ["This is the second test entity"]
      },
      {
        name: "Test_Entity_3",
        entityType: "AnotherType",
        observations: ["This is a different type of entity"]
      }
    ];
    
    const createEntitiesResponse = await callTool('create_entities', {
      entities: testEntities
    });
    
    let createdEntities;
    try {
      createdEntities = JSON.parse(createEntitiesResponse.result.content[0].text);
      const expected = testEntities.length;
      const actual = createdEntities.length;
      addTestResult('create_entities', actual === expected, 
        `Created ${actual}/${expected} entities`);
    } catch (error) {
      addTestResult('create_entities', false, `Failed to parse response: ${error.message}`);
    }
    
    // 4. Add observations to entities
    console.log("\n=== Testing add_observations ===");
    const observationsToAdd = [
      {
        entityName: "Test_Entity_1",
        contents: ["Additional observation for entity 1", "Another note about entity 1"]
      },
      {
        entityName: "Test_Entity_2",
        contents: ["Additional observation for entity 2"]
      }
    ];
    
    const addObservationsResponse = await callTool('add_observations', {
      observations: observationsToAdd
    });
    
    let addedObservations;
    try {
      addedObservations = JSON.parse(addObservationsResponse.result.content[0].text);
      const expected = observationsToAdd.length;
      const actual = addedObservations.length;
      addTestResult('add_observations', actual === expected, 
        `Added observations to ${actual}/${expected} entities`);
    } catch (error) {
      addTestResult('add_observations', false, `Failed to parse response: ${error.message}`);
    }
    
    // 5. Create relations between entities
    console.log("\n=== Testing create_relations ===");
    const relationsToCreate = [
      {
        from: "Test_Entity_1",
        to: "Test_Entity_2",
        relationType: "CONNECTS_TO"
      },
      {
        from: "Test_Entity_2",
        to: "Test_Entity_3",
        relationType: "REFERENCES"
      }
    ];
    
    // Create new relation
    const createRelationsResponse = await callTool('create_relations', {
      relations: relationsToCreate
        });
        
        // Verify creation success
        console.log("\n=== Confirming relation creation ===>");
        const relationVerifyResponse = await callTool('read_graph');
        let verifyGraphContent;
        try {
          verifyGraphContent = JSON.parse(relationVerifyResponse.result.content[0].text);
          console.log(`Verification found ${verifyGraphContent.entities.length} entities and ${verifyGraphContent.relations.length} relations`);
        } catch (error) {
          console.log(`Verification failed: ${error.message}`);
        }
    
    let createdRelations;
    try {
      createdRelations = JSON.parse(createRelationsResponse.result.content[0].text);
      const expected = relationsToCreate.length;
      const actual = createdRelations.length;
      addTestResult('create_relations', actual === expected, 
        `Created ${actual}/${expected} relations`);
    } catch (error) {
      addTestResult('create_relations', false, `Failed to parse response: ${error.message}`);
    }
    
    // 6. Search for entities
    console.log("\n=== Testing search_nodes ===");
    const searchResponse = await callTool('search_nodes', {
      query: "TestType"
    });
    
    let searchResults;
    try {
      searchResults = JSON.parse(searchResponse.result.content[0].text);
      const foundEntities = searchResults.entities.length;
      addTestResult('search_nodes', foundEntities >= 2, 
        `Found ${foundEntities} entities with search term "TestType"`);
    } catch (error) {
      addTestResult('search_nodes', false, `Failed to parse response: ${error.message}`);
    }
    
    // 7. Open specific nodes
    console.log("\n=== Testing open_nodes ===");
    const nodesToOpen = ["Test_Entity_1", "Test_Entity_3"];
    const openNodesResponse = await callTool('open_nodes', {
      names: nodesToOpen
    });
    
    let openedNodes;
    try {
      openedNodes = JSON.parse(openNodesResponse.result.content[0].text);
      const expected = nodesToOpen.length;
      const actual = openedNodes.entities.length;
      addTestResult('open_nodes', actual === expected, 
        `Opened ${actual}/${expected} requested entities`);
    } catch (error) {
      addTestResult('open_nodes', false, `Failed to parse response: ${error.message}`);
    }
    
    // 8. Delete observations
    console.log("\n=== Testing delete_observations ===");
    const observationsToDelete = [
      {
        entityName: "Test_Entity_1",
        observations: ["Additional observation for entity 1"]
      }
    ];
    
    const deleteObsResponse = await callTool('delete_observations', {
      deletions: observationsToDelete
    });
    
    let deletedObs;
    try {
      deletedObs = JSON.parse(deleteObsResponse.result.content[0].text);
      addTestResult('delete_observations', deletedObs.success === true, 
        `${deletedObs.message || 'Unknown result'}`);
    } catch (error) {
      addTestResult('delete_observations', false, `Failed to parse response: ${error.message}`);
    }
    
    // 9. Delete relations
    console.log("\n=== Testing delete_relations ===");
    const relationsToDelete = [
      {
        from: "Test_Entity_1",
        to: "Test_Entity_2",
        relationType: "CONNECTS_TO"
      }
    ];
    
    const deleteRelResponse = await callTool('delete_relations', {
      relations: relationsToDelete
    });
    
    let deletedRel;
    try {
      deletedRel = JSON.parse(deleteRelResponse.result.content[0].text);
      addTestResult('delete_relations', deletedRel.success === true, 
        `${deletedRel.message || 'Unknown result'}`);
    } catch (error) {
      addTestResult('delete_relations', false, `Failed to parse response: ${error.message}`);
    }
    
    // 10. Delete entities
    console.log("\n=== Testing delete_entities ===");
    const entitiesToDelete = ["Test_Entity_3"];
    
    const deleteEntResponse = await callTool('delete_entities', {
      entityNames: entitiesToDelete
    });
    
    let deletedEnt;
    try {
      deletedEnt = JSON.parse(deleteEntResponse.result.content[0].text);
      addTestResult('delete_entities', deletedEnt.success === true, 
        `${deletedEnt.message || 'Unknown result'}`);
    } catch (error) {
      addTestResult('delete_entities', false, `Failed to parse response: ${error.message}`);
    }
    
    // 11. Verify final state
    console.log("\n=== Testing read_graph (final state) ===");
    const finalReadResponse = await callTool('read_graph');
    
    let finalGraphContent;
    try {
      finalGraphContent = JSON.parse(finalReadResponse.result.content[0].text);
      
      // We should have 2 entities left (deleted 1 of 3)
      const expectedEntities = 2;
      const actualEntities = finalGraphContent.entities.length;
      
      // We should have 0 relations left because:
      // - First relation (Test_Entity_1 -> Test_Entity_2) was explicitly deleted
      // - Second relation (Test_Entity_2 -> Test_Entity_3) is implicitly deleted when Test_Entity_3 was deleted
      const expectedRelations = 0;
      const actualRelations = finalGraphContent.relations.length;
      
      addTestResult('read_graph final', 
        actualEntities === expectedEntities && actualRelations === expectedRelations, 
        `Found ${actualEntities}/${expectedEntities} entities and ${actualRelations}/${expectedRelations} relations`);
    } catch (error) {
      addTestResult('read_graph final', false, `Failed to parse response: ${error.message}`);
    }
    
    // 12. Clean up - delete all remaining test entities
    console.log("\n=== Cleaning up test data ===");
    const remainingEntities = ["Test_Entity_1", "Test_Entity_2"];
    
    const cleanupResponse = await callTool('delete_entities', {
      entityNames: remainingEntities
    });
    
    try {
      const cleanupResult = JSON.parse(cleanupResponse.result.content[0].text);
      console.log(`Cleanup: ${cleanupResult.success ? 'Successful' : 'Failed'} - ${cleanupResult.message || ''}`);
    } catch (error) {
      console.log(`Cleanup failed: ${error.message}`);
    }
    
  } catch (error) {
    console.error("\nTest execution error:", error.message);
  }
  
  // Print final test results
  console.log("\n===== COMPREHENSIVE TEST RESULTS =====");
  console.log(`Tests: ${testResults.total}, Passed: ${testResults.passed}, Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);
  
  if (testResults.failed > 0) {
    console.log("\nFailed Tests:");
    testResults.tests
      .filter(t => !t.passed)
      .forEach(test => {
        console.log(`- ${test.name}: ${test.message}`);
      });
  }
  
  // Cleanup
  console.log("\nShutting down test environment...");
  rl.close();
  mcp.stdin.end();
  mcp.kill();
  
  console.log("Test complete.");
  
  return testResults.failed === 0;
}

runTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error("Test failed with exception:", error);
    process.exit(1);
  });
