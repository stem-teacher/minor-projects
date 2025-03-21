#!/usr/bin/env node

/**
 * Script to fix the entity creation approach and verify observations are properly stored
 */

import Surreal from 'surrealdb';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Set up database connection details
const SURREALDB_URL = process.env.SURREALDB_URL || "http://localhost:8070";
const SURREALDB_USER = process.env.SURREALDB_USER || "root";
const SURREALDB_PASS = process.env.SURREALDB_PASS || "root";
const SURREALDB_NS = process.env.SURREALDB_NS || "test";
const SURREALDB_DB = process.env.SURREALDB_DB || "knowledge";

const main = async () => {
  try {
    console.log("Testing entity creation approaches...");
    
    // Connect to SurrealDB
    const db = new Surreal();
    await db.connect(SURREALDB_URL, {
      auth: {
        username: SURREALDB_USER,
        password: SURREALDB_PASS
      }
    });
    
    // Use the specified namespace and database
    await db.use({
      namespace: SURREALDB_NS,
      database: SURREALDB_DB
    });

    console.log(`Connected to SurrealDB at ${SURREALDB_URL}`);
    
    // First approach: using direct SQL and string values
    console.log("\nApproach 1: Using direct SQL with text values for observations");
    await db.query(`
      CREATE entity SET 
        name = 'Test1', 
        entityType = 'test', 
        observations = ['Observation 1', 'Observation 2'], 
        createdAt = time::now(), 
        updatedAt = time::now()
    `);
    
    const result1 = await db.query(`SELECT * FROM entity WHERE name = 'Test1'`);
    console.log("Entity 1 structure:", JSON.stringify(result1[0][0], null, 2));
    
    // Second approach: using direct SQL and object values
    console.log("\nApproach 2: Using direct SQL with object values for observations");
    await db.query(`
      CREATE entity SET 
        name = 'Test2', 
        entityType = 'test', 
        observations = [
          { text: 'Observation 1', createdAt: time::now() },
          { text: 'Observation 2', createdAt: time::now() }
        ], 
        createdAt = time::now(), 
        updatedAt = time::now()
    `);
    
    const result2 = await db.query(`SELECT * FROM entity WHERE name = 'Test2'`);
    console.log("Entity 2 structure:", JSON.stringify(result2[0][0], null, 2));
    
    // Third approach: using parameterized query with object array as parameter
    console.log("\nApproach 3: Using parameterized query");
    await db.query(
      `CREATE entity SET name = $name, entityType = $type, observations = $obs, createdAt = time::now(), updatedAt = time::now()`,
      { 
        name: 'Test3', 
        type: 'test',
        obs: [
          { text: 'Observation 1', createdAt: new Date().toISOString() },
          { text: 'Observation 2', createdAt: new Date().toISOString() }
        ]
      }
    );
    
    const result3 = await db.query(`SELECT * FROM entity WHERE name = 'Test3'`);
    console.log("Entity 3 structure:", JSON.stringify(result3[0][0], null, 2));
    
    // Fourth approach: using SurrealDB create method
    console.log("\nApproach 4: Using SurrealDB create method");
    await db.create("entity", {
      name: 'Test4',
      entityType: 'test',
      observations: [
        { text: 'Observation 1', createdAt: new Date().toISOString() },
        { text: 'Observation 2', createdAt: new Date().toISOString() }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    const result4 = await db.query(`SELECT * FROM entity WHERE name = 'Test4'`);
    console.log("Entity 4 structure:", JSON.stringify(result4[0][0], null, 2));
    
    // Fifth approach: using SurrealDB create method with strings
    console.log("\nApproach 5: Using SurrealDB create method with string observations");
    await db.create("entity", {
      name: 'Test5',
      entityType: 'test',
      observations: ['Observation 1', 'Observation 2'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    const result5 = await db.query(`SELECT * FROM entity WHERE name = 'Test5'`);
    console.log("Entity 5 structure:", JSON.stringify(result5[0][0], null, 2));
    
    // Clean up
    console.log("\nCleaning up...");
    await db.query(`DELETE FROM entity WHERE name IN ['Test1', 'Test2', 'Test3', 'Test4', 'Test5']`);
    console.log("Test entities deleted");
    
    console.log("\nTesting complete!");
  } catch (error) {
    console.error("Error during testing:", error);
  }
};

main();