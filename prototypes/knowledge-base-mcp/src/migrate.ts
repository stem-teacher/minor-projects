#!/usr/bin/env node

/**
 * Migration tool to import knowledge graph data from a JSON file into SurrealDB
 */

import Surreal from "surrealdb";
import fs from "fs/promises";
import dotenv from "dotenv";
import { program } from "commander";

// Load environment variables
dotenv.config();

// Define types
interface Entity {
  name: string;
  entityType: string;
  observations: string[];
}

interface Relation {
  from: string;
  to: string;
  relationType: string;
}

interface KnowledgeGraph {
  entities: Entity[];
  relations: Relation[];
}

// Define SurrealDB connection details
const SURREALDB_URL = process.env.SURREALDB_URL || "http://localhost:8070";
const SURREALDB_USER = process.env.SURREALDB_USER || "root";
const SURREALDB_PASS = process.env.SURREALDB_PASS || "root";
const SURREALDB_NS = process.env.SURREALDB_NS || "test";
const SURREALDB_DB = process.env.SURREALDB_DB || "knowledge";

// Initialize SurrealDB client
const db = new Surreal();

async function setupSchema() {
  try {
    // Check if 'entity' table exists
    const entityCheck = await db.query(`
      INFO FOR TABLE entity;
    `).catch(() => null); // Catch and return null if table doesn't exist
    
    // Check if 'relation' table exists
    const relationCheck = await db.query(`
      INFO FOR TABLE relation;
    `).catch(() => null); // Catch and return null if table doesn't exist
    
    const setupRequired = !entityCheck || !relationCheck;
    
    if (setupRequired) {
      console.log("Setting up schema...");
      
      // Use IF NOT EXISTS to prevent errors if tables already exist
      await db.query(`
        DEFINE TABLE IF NOT EXISTS entity SCHEMAFULL;
        DEFINE FIELD IF NOT EXISTS name ON entity TYPE string;
        DEFINE FIELD IF NOT EXISTS entityType ON entity TYPE string;
        DEFINE FIELD IF NOT EXISTS observations ON entity TYPE array;
        DEFINE INDEX IF NOT EXISTS entity_name ON entity COLUMNS name UNIQUE;
      `);

      await db.query(`
        DEFINE TABLE IF NOT EXISTS relation SCHEMAFULL;
        DEFINE FIELD IF NOT EXISTS from ON relation TYPE string;
        DEFINE FIELD IF NOT EXISTS to ON relation TYPE string;
        DEFINE FIELD IF NOT EXISTS relationType ON relation TYPE string;
        DEFINE INDEX IF NOT EXISTS relation_unique ON relation COLUMNS from, to, relationType UNIQUE;
      `);
      
      console.log("Schema setup complete.");
    } else {
      console.log("Schema already exists, skipping setup.");
    }
  } catch (error) {
    console.error("Error setting up schema:", error);
    throw error;
  }
}

async function importEntities(entities: Entity[]) {
  let success = 0;
  let errors = 0;

  for (const entity of entities) {
    try {
      await db.create("entity", {
        name: entity.name,
        entityType: entity.entityType,
        observations: entity.observations,
      });
      success++;
    } catch (error) {
      console.error(`Error importing entity ${entity.name}:`, error);
      errors++;
    }
  }

  return { success, errors };
}

async function importRelations(relations: Relation[]) {
  let success = 0;
  let errors = 0;

  for (const relation of relations) {
    try {
      await db.create("relation", {
        from: relation.from,
        to: relation.to,
        relationType: relation.relationType,
      });
      success++;
    } catch (error) {
      console.error(
        `Error importing relation from ${relation.from} to ${relation.to}:`,
        error
      );
      errors++;
    }
  }

  return { success, errors };
}

async function migrate(inputFile: string, clearDb: boolean = false) {
  try {
    console.log(`Connecting to SurrealDB at ${SURREALDB_URL}...`);
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

    console.log("Setting up schema...");
    await setupSchema();

    // Clear database if requested
    if (clearDb) {
      console.log("Clearing existing data...");
      await db.query("DELETE FROM entity");
      await db.query("DELETE FROM relation");
    }

    // Read and parse the input file
    console.log(`Reading data from ${inputFile}...`);
    const data = await fs.readFile(inputFile, "utf-8");
    const graph = JSON.parse(data) as KnowledgeGraph;

    console.log(`Found ${graph.entities.length} entities and ${graph.relations.length} relations.`);

    // Import entities
    console.log("Importing entities...");
    const entityResult = await importEntities(graph.entities);
    console.log(`Imported ${entityResult.success} entities (${entityResult.errors} errors).`);

    // Import relations
    console.log("Importing relations...");
    const relationResult = await importRelations(graph.relations);
    console.log(`Imported ${relationResult.success} relations (${relationResult.errors} errors).`);

    console.log("Migration complete!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Parse command line arguments
program
  .requiredOption("-i, --input <file>", "Input JSON file with knowledge graph data")
  .option("-c, --clear", "Clear existing data before importing", false)
  .parse(process.argv);

const options = program.opts();

migrate(options.input, options.clear);