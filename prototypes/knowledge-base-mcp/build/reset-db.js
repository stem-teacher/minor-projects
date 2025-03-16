#!/usr/bin/env node
/**
 * Reset database script - drops and recreates tables with timestamp support
 */
import Surreal from 'surrealdb';
import * as dotenv from 'dotenv';
// Load environment variables
dotenv.config();
async function resetDatabase() {
    // Set up connection details
    const SURREALDB_URL = process.env.SURREALDB_URL || "http://localhost:8070";
    const SURREALDB_USER = process.env.SURREALDB_USER || "root";
    const SURREALDB_PASS = process.env.SURREALDB_PASS || "root";
    const SURREALDB_NS = process.env.SURREALDB_NS || "test";
    const SURREALDB_DB = process.env.SURREALDB_DB || "knowledge";
    console.log(`Connecting to SurrealDB at ${SURREALDB_URL}...`);
    // Create a new instance of the Surreal client
    const db = new Surreal();
    try {
        // Connect to the database
        await db.connect(SURREALDB_URL, {
            auth: {
                username: SURREALDB_USER,
                password: SURREALDB_PASS
            }
        });
        // Set the namespace and database
        await db.use({
            namespace: SURREALDB_NS,
            database: SURREALDB_DB
        });
        console.log("Connected to SurrealDB successfully.");
        // Ask for confirmation
        console.log("WARNING: This will delete all data in the database!");
        console.log(`Database: ${SURREALDB_NS}/${SURREALDB_DB}`);
        // Proceed with reset
        console.log("Dropping existing tables...");
        // Drop tables
        await db.query("REMOVE TABLE entity");
        await db.query("REMOVE TABLE relation");
        console.log("Creating new tables with timestamp support...");
        // Create entity table with timestamp support
        await db.query(`
      DEFINE TABLE entity SCHEMAFULL;
      DEFINE FIELD name ON entity TYPE string;
      DEFINE FIELD entityType ON entity TYPE string;
      DEFINE FIELD observations ON entity TYPE array;
      DEFINE FIELD createdAt ON entity TYPE datetime;
      DEFINE FIELD updatedAt ON entity TYPE datetime;
      DEFINE INDEX entity_name ON entity COLUMNS name UNIQUE;
    `);
        // Create relation table with timestamp support
        await db.query(`
      DEFINE TABLE relation SCHEMAFULL;
      DEFINE FIELD from ON relation TYPE string;
      DEFINE FIELD to ON relation TYPE string;
      DEFINE FIELD relationType ON relation TYPE string;
      DEFINE FIELD createdAt ON relation TYPE datetime;
      DEFINE INDEX relation_unique ON relation COLUMNS from, to, relationType UNIQUE;
    `);
        console.log("Database reset complete!");
    }
    catch (error) {
        console.error("Error resetting database:", error);
        process.exit(1);
    }
    finally {
        // Close database connection
        await db.close();
    }
}
// Run the reset
resetDatabase();
