#!/usr/bin/env node
/**
 * Migration tool to add timestamps to existing database records
 * and convert observations from strings to objects with timestamps
 */
import Surreal from 'surrealdb';
import * as dotenv from 'dotenv';
// Load environment variables
dotenv.config();
// Connect to SurrealDB
async function connectToDatabase() {
    const SURREALDB_URL = process.env.SURREALDB_URL || "http://localhost:8070";
    const SURREALDB_USER = process.env.SURREALDB_USER || "root";
    const SURREALDB_PASS = process.env.SURREALDB_PASS || "root";
    const SURREALDB_NS = process.env.SURREALDB_NS || "test";
    const SURREALDB_DB = process.env.SURREALDB_DB || "knowledge";
    console.log(`Connecting to SurrealDB at ${SURREALDB_URL}...`);
    // Create a new instance of the Surreal client
    const db = new Surreal();
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
    console.log(`Connected to SurrealDB at ${SURREALDB_URL}`);
    return db;
}
// Update database schema to add timestamp fields
async function updateSchema(db) {
    console.log("Updating database schema...");
    await db.query(`
    // Add timestamp fields to entity table
    DEFINE FIELD IF NOT EXISTS createdAt ON entity TYPE datetime;
    DEFINE FIELD IF NOT EXISTS updatedAt ON entity TYPE datetime;
    
    // Add timestamp field to relation table
    DEFINE FIELD IF NOT EXISTS createdAt ON relation TYPE datetime;
  `);
    console.log("Schema updated successfully.");
}
// Migrate observations from strings to objects with timestamps
async function migrateObservations(db) {
    try {
        console.log("Migrating observations to include timestamps...");
        // Get all entities
        const entitiesResult = await db.query("SELECT * FROM entity");
        if (!entitiesResult[0] || entitiesResult[0].length === 0) {
            console.log("No entities found to migrate.");
            return;
        }
        const entities = entitiesResult[0];
        console.log(`Found ${entities.length} entities to process.`);
        const timestamp = new Date().toISOString();
        let migratedCount = 0;
        for (const entity of entities) {
            // Skip entities without observations
            if (!entity.observations || entity.observations.length === 0) {
                continue;
            }
            // Check if observations are already in the new format
            const needsMigration = entity.observations.some(obs => typeof obs === 'string');
            if (needsMigration) {
                // Convert string observations to objects with timestamps
                const migratedObservations = entity.observations.map(obs => {
                    if (typeof obs === 'string') {
                        return {
                            text: obs,
                            createdAt: "time::now()" // Using SurrealDB's time function
                        };
                    }
                    return obs; // Already an object, keep as is
                });
                // Update the entity with migrated observations
                await db.query("UPDATE entity SET observations = $observations WHERE id = $id", {
                    id: entity.id,
                    observations: migratedObservations
                });
                migratedCount++;
            }
        }
        console.log(`Observation migration complete. Migrated observations for ${migratedCount} entities.`);
    }
    catch (error) {
        console.error("Error migrating observations:", error);
        throw error;
    }
}
// Add default timestamps to existing records
async function addDefaultTimestamps(db) {
    console.log("Adding default timestamps to existing records...");
    // Update entities
    const entityResult = await db.query(`
    UPDATE entity 
    SET 
      createdAt = time::now(),
      updatedAt = time::now()
    WHERE 
      createdAt = NONE OR updatedAt = NONE
    RETURN count()
  `);
    const entitiesUpdated = entityResult[0][0].count;
    // Update relations
    const relationResult = await db.query(`
    UPDATE relation
    SET
      createdAt = time::now()
    WHERE
      createdAt = NONE
    RETURN count()
  `);
    const relationsUpdated = relationResult[0][0].count;
    console.log(`Updated timestamps for ${entitiesUpdated} entities and ${relationsUpdated} relations.`);
}
// Run the complete migration
async function runMigration() {
    let db = null;
    try {
        db = await connectToDatabase();
        // Step 1: Update the schema
        await updateSchema(db);
        // Step 2: Migrate observations to the new format
        await migrateObservations(db);
        // Step 3: Add default timestamps to existing records
        await addDefaultTimestamps(db);
        console.log("Timestamp migration completed successfully!");
    }
    catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
    finally {
        if (db)
            await db.close();
    }
}
// Run the migration
runMigration();
