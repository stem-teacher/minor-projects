#!/usr/bin/env node

/**
 * Script to reset the SurrealDB schema and tables
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

async function main() {
  console.log(`Connecting to SurrealDB at ${SURREALDB_URL}...`);
  
  try {
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
    
    console.log("Connected to SurrealDB successfully");
    
    // Delete existing tables
    console.log("Removing existing tables and data...");
    
    try {
      await db.query(`REMOVE TABLE entity`);
    } catch (e) {
      console.log("Table 'entity' does not exist, continuing...");
    }
    
    try {
      await db.query(`REMOVE TABLE relation`);
    } catch (e) {
      console.log("Table 'relation' does not exist, continuing...");
    }
    
    try {
      await db.query(`REMOVE TABLE observation`);
    } catch (e) {
      console.log("Table 'observation' does not exist, continuing...");
    }
    
    // Create tables with updated schema
    console.log("Creating updated schema...");
    
    // Entity table without observations - we'll store those in a separate table
    await db.query(`
      DEFINE TABLE entity SCHEMAFULL;
      DEFINE FIELD name ON entity TYPE string;
      DEFINE FIELD entityType ON entity TYPE string;
      DEFINE FIELD createdAt ON entity TYPE datetime;
      DEFINE FIELD updatedAt ON entity TYPE datetime;
      DEFINE INDEX entity_name ON entity COLUMNS name UNIQUE;
    `);
    
    // Relation table
    await db.query(`
      DEFINE TABLE relation SCHEMAFULL;
      DEFINE FIELD from ON relation TYPE string;
      DEFINE FIELD to ON relation TYPE string;
      DEFINE FIELD relationType ON relation TYPE string;
      DEFINE FIELD createdAt ON relation TYPE datetime;
      DEFINE INDEX relation_unique ON relation COLUMNS from, to, relationType UNIQUE;
    `);
    
    // New table for observations
    await db.query(`
      DEFINE TABLE observation SCHEMAFULL;
      DEFINE FIELD entityName ON observation TYPE string;
      DEFINE FIELD text ON observation TYPE string;
      DEFINE FIELD createdAt ON observation TYPE datetime;
      DEFINE INDEX observation_entity ON observation COLUMNS entityName;
    `);
    
    console.log("Schema reset completed successfully");
    
    // Test creating an entity with observations
    console.log("\nTesting entity creation with observations...");
    
    // Create entity
    const entityResult = await db.query(`
      CREATE entity CONTENT {
        name: 'TestEntity',
        entityType: 'test',
        createdAt: time::now(),
        updatedAt: time::now()
      }
    `);
    
    console.log("Created test entity:", JSON.stringify(entityResult[0][0], null, 2));
    
    // Add observations for the entity
    const observationsResult = await db.query(`
      CREATE observation CONTENT {
        entityName: 'TestEntity',
        text: 'First observation',
        createdAt: time::now()
      };
      CREATE observation CONTENT {
        entityName: 'TestEntity',
        text: 'Second observation',
        createdAt: time::now()
      };
    `);
    
    console.log("Added observations:", JSON.stringify(observationsResult, null, 2));
    
    // Read the entity and its observations
    console.log("\nReading test entity and observations...");
    const entityQueryResult = await db.query(`SELECT * FROM entity WHERE name = 'TestEntity'`);
    const observationsQueryResult = await db.query(`SELECT * FROM observation WHERE entityName = 'TestEntity'`);
    
    console.log("Entity read result:", JSON.stringify(entityQueryResult[0][0], null, 2));
    console.log("Observations read result:", JSON.stringify(observationsQueryResult[0], null, 2));
    
    // Clean up test entity and observations
    console.log("\nCleaning up test data...");
    await db.query(`DELETE FROM entity WHERE name = 'TestEntity'`);
    await db.query(`DELETE FROM observation WHERE entityName = 'TestEntity'`);
    
    console.log("\nSchema reset and test completed successfully");
  } catch (error) {
    console.error("Error:", error);
  }
}

main();