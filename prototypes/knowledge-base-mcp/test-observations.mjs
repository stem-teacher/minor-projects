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
    // Connect to SurrealDB
    console.log(`Connecting to SurrealDB at ${SURREALDB_URL}...`);
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
    console.log('Connected!');
    
    // Delete any existing test entity
    await db.query(`DELETE FROM entity WHERE name = 'TestObservations'`);
    
    console.log('\nCreating entity with string observations...');
    const result1 = await db.query(`
      CREATE entity CONTENT {
        name: 'TestObservations',
        entityType: 'test',
        observations: ['Observation 1', 'Observation 2'],
        createdAt: time::now(),
        updatedAt: time::now()
      }
    `);
    
    console.log('Created entity:', JSON.stringify(result1[0][0], null, 2));
    
    // Read the entity to see what's stored
    console.log('\nQuerying the entity...');
    const queryResult = await db.query(`SELECT * FROM entity WHERE name = 'TestObservations'`);
    console.log('Query result:', JSON.stringify(queryResult[0][0], null, 2));
    
    // Add more observations
    console.log('\nAdding observations...');
    await db.query(`
      UPDATE entity 
      SET observations = array::concat(observations, ['Observation 3', 'Observation 4']), 
      updatedAt = time::now() 
      WHERE name = 'TestObservations'
    `);
    
    // Read again
    console.log('\nQuerying after update...');
    const queryResult2 = await db.query(`SELECT * FROM entity WHERE name = 'TestObservations'`);
    console.log('After update:', JSON.stringify(queryResult2[0][0], null, 2));
    
    // Clean up
    await db.query(`DELETE FROM entity WHERE name = 'TestObservations'`);
    
    console.log('\nTest completed and cleaned up.');
  } catch (error) {
    console.error('Error:', error);
  }
};

main();