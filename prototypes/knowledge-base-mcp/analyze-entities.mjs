#!/usr/bin/env node

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
    console.log("Analyzing SurrealDB entity structure...");
    
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
    
    // Create a test entity with observations
    console.log("\nCreating test entity...");
    await db.query(`
      CREATE entity SET 
        name = 'TestAnalysis', 
        entityType = 'test', 
        observations = [
          { text: 'Test observation 1', createdAt: time::now() },
          { text: 'Test observation 2', createdAt: time::now() }
        ], 
        createdAt = time::now(), 
        updatedAt = time::now()
    `);
    
    // Query the test entity to examine its structure
    console.log("\nQuerying test entity...");
    const result = await db.query(`SELECT * FROM entity WHERE name = 'TestAnalysis'`);
    
    if (result && result[0] && result[0].length > 0) {
      const entity = result[0][0];
      console.log("Entity found:", entity.name);
      console.log("Entity structure:", JSON.stringify(entity, null, 2));
      
      // Inspect the observations field specifically
      console.log("\nObservations field type:", typeof entity.observations);
      console.log("Observations is array:", Array.isArray(entity.observations));
      
      if (Array.isArray(entity.observations)) {
        console.log("Observations length:", entity.observations.length);
        
        for (let i = 0; i < entity.observations.length; i++) {
          const obs = entity.observations[i];
          console.log(`\nObservation ${i + 1} type:`, typeof obs);
          console.log(`Observation ${i + 1} structure:`, JSON.stringify(obs, null, 2));
        }
      }
    } else {
      console.log("Test entity not found");
    }
    
    // Clean up by deleting the test entity
    console.log("\nCleaning up...");
    await db.query(`DELETE FROM entity WHERE name = 'TestAnalysis'`);
    console.log("Test entity deleted");
    
    console.log("\nAnalysis complete!");
  } catch (error) {
    console.error("Error during analysis:", error);
  }
};

main();