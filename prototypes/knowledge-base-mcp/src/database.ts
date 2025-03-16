#!/usr/bin/env node

/**
 * Knowledge Graph Database Layer
 * 
 * This module handles all database operations for the knowledge graph,
 * providing CRUD operations for entities, relations, and observations.
 * It uses SurrealDB as the backend database.
 * 
 * The KnowledgeGraphManager class encapsulates all database operations
 * and provides a clean interface for the MCP server to use.
 */

import Surreal from 'surrealdb';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Set up logging
const TRACE_LEVEL = process.env.TRACE_LEVEL || "INFO";
export const trace = {
  debug: (...args: any[]) => TRACE_LEVEL === "DEBUG" && console.error('[DEBUG]', ...args),
  info: (...args: any[]) => (TRACE_LEVEL === "DEBUG" || TRACE_LEVEL === "INFO") && console.error('[INFO]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args)
};

// Define SurrealDB connection details with export for testing
export const SURREALDB_URL = process.env.SURREALDB_URL || "http://localhost:8070";
export const SURREALDB_USER = process.env.SURREALDB_USER || "root";
export const SURREALDB_PASS = process.env.SURREALDB_PASS || "root";
export const SURREALDB_NS = process.env.SURREALDB_NS || "development";
export const SURREALDB_DB = process.env.SURREALDB_DB || "knowledge";

// Export database client factory for testing
export const createDatabaseClient = () => new Surreal();

// Define types for knowledge graph
export interface Observation {
  text: string;
  createdAt: string;
}

export interface Entity {
  name: string;
  entityType: string;
  observations: Observation[] | string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Relation {
  from: string;
  to: string;
  relationType: string;
  createdAt?: string;
}

export interface KnowledgeGraph {
  entities: Entity[];
  relations: Relation[];
}

// The KnowledgeGraphManager class handles SurrealDB operations
export class KnowledgeGraphManager {
  db: any;

  /**
   * Initialize SurrealDB database and schema
   */
  async initialize(): Promise<void> {
    try {
      trace.info("Initializing SurrealDB connection to", SURREALDB_URL);
      
      // Create a new instance of the Surreal client using the factory
      const db = createDatabaseClient();

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

      trace.info(`Connected to SurrealDB at ${SURREALDB_URL}`);
      
      // Store the DB connection
      this.db = db;

      // Set up database schema if needed
      await this.setupSchema();
    } catch (error) {
      trace.error("Failed to initialize SurrealDB:", error);
      throw error;
    }
  }

  /**
   * Set up the database schema for entities and relations
   */
  private async setupSchema(): Promise<void> {
    try {
      // Check if 'entity' table exists
      const entityCheck = await this.db.query(`
        INFO FOR TABLE entity;
      `).catch(() => null); // Catch and return null if table doesn't exist
      
      // Check if 'relation' table exists
      const relationCheck = await this.db.query(`
        INFO FOR TABLE relation;
      `).catch(() => null); // Catch and return null if table doesn't exist
      
      const setupRequired = !entityCheck || !relationCheck;
      
      if (setupRequired) {
        trace.info("Setting up schema...");
        
        // Use IF NOT EXISTS to prevent errors if tables already exist
        await this.db.query(`
          DEFINE TABLE IF NOT EXISTS entity SCHEMAFULL;
          DEFINE FIELD IF NOT EXISTS name ON entity TYPE string;
          DEFINE FIELD IF NOT EXISTS entityType ON entity TYPE string;
          DEFINE FIELD IF NOT EXISTS observations ON entity TYPE array;
          DEFINE FIELD IF NOT EXISTS createdAt ON entity TYPE datetime;
          DEFINE FIELD IF NOT EXISTS updatedAt ON entity TYPE datetime;
          DEFINE INDEX IF NOT EXISTS entity_name ON entity COLUMNS name UNIQUE;
        `);

        await this.db.query(`
          DEFINE TABLE IF NOT EXISTS relation SCHEMAFULL;
          DEFINE FIELD IF NOT EXISTS from ON relation TYPE string;
          DEFINE FIELD IF NOT EXISTS to ON relation TYPE string;
          DEFINE FIELD IF NOT EXISTS relationType ON relation TYPE string;
          DEFINE FIELD IF NOT EXISTS createdAt ON relation TYPE datetime;
          DEFINE INDEX IF NOT EXISTS relation_unique ON relation COLUMNS from, to, relationType UNIQUE;
        `);
        
        trace.info("Schema setup complete.");
      } else {
        trace.info("Schema already exists, skipping setup.");
      }
    } catch (error) {
      trace.error("Error setting up schema:", error);
      throw error;
    }
  }

  /**
   * Create multiple entities in the knowledge graph
   */
  async createEntities(entities: Entity[]): Promise<Entity[]> {
    const createdEntities: Entity[] = [];

    for (const entity of entities) {
      try {
        // Check if entity already exists
        const existing = await this.db.query(
          "SELECT * FROM entity WHERE name = $name",
          { name: entity.name }
        );

        if (!existing[0] || existing[0].length === 0) {
          // Prepare observation objects with timestamps
          const observationsWithTimestamps = entity.observations.map(obs => {
            // Handle both string and Observation types for backward compatibility
            if (typeof obs === 'string') {
              return {
                text: obs,
                createdAt: new Date().toISOString()
              };
            } else {
              return obs;
            }
          });
          
          // No longer using JavaScript timestamp
          
          // Create new entity with SurrealDB time::now() function for datetime
          const result = await this.db.query(
            `CREATE entity CONTENT {
              name: $name,
              entityType: $entityType,
              observations: $observations,
              createdAt: time::now(),
              updatedAt: time::now()
            }`,
            {
              name: entity.name,
              entityType: entity.entityType,
              observations: observationsWithTimestamps,
            }
          );

          // Handle result from query - result is in the first array element
          const resultData = result[0];
          const created = resultData && resultData.length ? resultData[0] : null;

          if (created && typeof created === 'object' && 'name' in created) {
            createdEntities.push({
              name: created.name as string,
              entityType: created.entityType as string,
              observations: created.observations as Observation[] || [],
              createdAt: created.createdAt ? created.createdAt.toString() : '',
              updatedAt: created.updatedAt ? created.updatedAt.toString() : ''
            });
          }
        }
      } catch (error) {
        trace.error(`Error creating entity ${entity.name}:`, error);
      }
    }

    return createdEntities;
  }

  /**
   * Create multiple relations in the knowledge graph
   */
  async createRelations(relations: Relation[]): Promise<Relation[]> {
    const createdRelations: Relation[] = [];

    for (const relation of relations) {
      try {
        trace.debug(`Creating relation: ${relation.from} --[${relation.relationType}]--> ${relation.to}`);
        
        // First, ensure both referenced entities exist
        const fromEntity = await this.db.query(
          "SELECT * FROM entity WHERE name = $name",
          { name: relation.from }
        );
        
        const toEntity = await this.db.query(
          "SELECT * FROM entity WHERE name = $name",
          { name: relation.to }
        );
        
        if (!fromEntity[0] || fromEntity[0].length === 0) {
          trace.error(`From entity '${relation.from}' does not exist`);
          continue;
        }
        
        if (!toEntity[0] || toEntity[0].length === 0) {
          trace.error(`To entity '${relation.to}' does not exist`);
          continue;
        }
        
        // Check if relation already exists
        const existing = await this.db.query(
          "SELECT * FROM relation WHERE from = $from AND to = $to AND relationType = $relationType",
          {
            from: relation.from,
            to: relation.to,
            relationType: relation.relationType,
          }
        );

        if (!existing[0] || existing[0].length === 0) {
          // Create new relation using CREATE with time::now() for datetime
          const result = await this.db.query(
            `CREATE relation SET from = $from, to = $to, relationType = $relationType, createdAt = time::now()`,
            {
              from: relation.from,
              to: relation.to,
              relationType: relation.relationType
            }
          );

          trace.debug(`Relation creation raw result: ${JSON.stringify(result)}`);
          
          if (result && result[0] && result[0].length > 0) {
            const created = result[0][0];
            trace.debug(`Created relation: ${JSON.stringify(created)}`);
            createdRelations.push({
              from: created.from,
              to: created.to,
              relationType: created.relationType,
              createdAt: created.createdAt
            });
            trace.debug(`Successfully created relation and added to results`);
          } else {
            trace.error(`Failed to create relation: ${relation.from} --[${relation.relationType}]--> ${relation.to}`);
          }
        } else {
          trace.debug(`Relation already exists: ${relation.from} --[${relation.relationType}]--> ${relation.to}`);
        }
      } catch (error) {
        trace.error(
          `Error creating relation from ${relation.from} to ${relation.to}:`,
          error
        );
      }
    }

    return createdRelations;
  }

  /**
   * Add observations to existing entities
   */
  async addObservations(
    observations: { entityName: string; contents: string[] }[]
  ): Promise<{ entityName: string; addedObservations: Observation[] }[]> {
    const results: { entityName: string; addedObservations: Observation[] }[] = [];

    for (const obs of observations) {
      try {
        // Get current entity
        const existing = await this.db.query(
          "SELECT * FROM entity WHERE name = $name",
          { name: obs.entityName }
        );

        if (!existing[0] || existing[0].length === 0) {
          throw new Error(`Entity with name ${obs.entityName} not found`);
        }

        const entity = existing[0][0];
        if (!entity || !entity.observations) {
          throw new Error(`Invalid entity data for ${obs.entityName}`);
        }

        // Convert existing observations to a set of text values for comparison
        const currentObservationTexts = new Set(entity.observations.map((o: any) => 
          typeof o === 'string' ? o : o.text
        ));
        
        // Create observations
        const newObservationsWithTimestamps = obs.contents
          .filter((content) => !currentObservationTexts.has(content))
          .map(content => ({
            text: content,
            // Let's keep the JavaScript timestamp for observations since they're stored as an array
            // and not directly as a field that's defined as DATETIME in the schema
            createdAt: new Date().toISOString()
          }));

        if (newObservationsWithTimestamps.length > 0) {
          // Update entity with new observations and update the updatedAt timestamp with time::now()
          await this.db.query(
            "UPDATE entity SET observations = array::concat(observations, $newObs), updatedAt = time::now() WHERE name = $name",
            {
              name: obs.entityName,
              newObs: newObservationsWithTimestamps
            }
          );

          results.push({
            entityName: obs.entityName,
            addedObservations: newObservationsWithTimestamps,
          });
        } else {
          results.push({
            entityName: obs.entityName,
            addedObservations: [],
          });
        }
      } catch (error) {
        trace.error(
          `Error adding observations to ${obs.entityName}:`,
          error
        );
        throw error;
      }
    }

    return results;
  }

  /**
   * Delete entities from the knowledge graph
   */
  async deleteEntities(entityNames: string[]): Promise<{success: boolean, message: string}> {
    try {
      // Delete entities
      await this.db.query(
        "DELETE FROM entity WHERE name IN $names",
        { names: entityNames }
      );

      // Delete related relations
      await this.db.query(
        "DELETE FROM relation WHERE from IN $names OR to IN $names",
        { names: entityNames }
      );

      return { success: true, message: "Entities deleted successfully" };
    } catch (error) {
      trace.error("Error deleting entities:", error);
      throw error;
    }
  }

  /**
   * Delete specific observations from entities
   */
  async deleteObservations(
    deletions: { entityName: string; observations: string[] }[]
  ): Promise<{success: boolean, message: string}> {
    try {
      for (const deletion of deletions) {
        // Get current entity
        const existing = await this.db.query(
          "SELECT * FROM entity WHERE name = $name",
          { name: deletion.entityName }
        );

        if (!existing[0] || existing[0].length === 0) {
          continue; // Skip if entity doesn't exist
        }

        const entity = existing[0][0];
        if (!entity || !entity.observations) {
          continue;
        }

        const updatedObservations = entity.observations.filter(
          (obs: any) => {
            const obsText = typeof obs === 'string' ? obs : obs.text;
            return !deletion.observations.includes(obsText);
          }
        );

        // Update entity with filtered observations and update the updatedAt timestamp using time::now()
        await this.db.query(
          "UPDATE entity SET observations = $observations, updatedAt = time::now() WHERE name = $name",
          {
            name: deletion.entityName,
            observations: updatedObservations
          }
        );
      }
      
      return { success: true, message: "Observations deleted successfully" };
    } catch (error) {
      trace.error("Error deleting observations:", error);
      throw error;
    }
  }

  /**
   * Delete relations from the knowledge graph
   */
  async deleteRelations(relations: Relation[]): Promise<{success: boolean, message: string}> {
    try {
      for (const relation of relations) {
        trace.debug(`Deleting relation: ${relation.from} --[${relation.relationType}]--> ${relation.to}`);
        
        const result = await this.db.query(
          "DELETE FROM relation WHERE from = $from AND to = $to AND relationType = $relationType",
          {
            from: relation.from,
            to: relation.to,
            relationType: relation.relationType,
          }
        );
        
        trace.debug(`Delete relation result: ${JSON.stringify(result)}`);
      }
      
      // Verify the deletion worked
      const verification = await this.db.query(
        "SELECT count() FROM relation"
      );
      trace.debug(`After deletion, relation count: ${JSON.stringify(verification)}`);
      
      return { success: true, message: "Relations deleted successfully" };
    } catch (error) {
      trace.error("Error deleting relations:", error);
      throw error;
    }
  }

  /**
   * Read the entire knowledge graph
   */
  async readGraph(): Promise<KnowledgeGraph> {
    try {
      // Get all entities
      const entitiesResult = await this.db.query(
        "SELECT * FROM entity"
      );
      
      // Extract and convert to Entity array
      const entities: Entity[] = [];
      if (entitiesResult && entitiesResult[0] && entitiesResult[0].length > 0) {
        for (const entity of entitiesResult[0]) {
          entities.push({
            name: entity.name,
            entityType: entity.entityType,
            observations: entity.observations || [],
            createdAt: entity.createdAt,
            updatedAt: entity.updatedAt
          });
        }
      }

      trace.debug(`Found ${entities.length} entities`);

      // Get all relations using direct SQL approach for more reliable results
      const relationsResult = await this.db.query(
        "SELECT * FROM relation"
      );
      
      trace.debug(`Relations query result: ${JSON.stringify(relationsResult)}`);
      
      // Extract and convert to Relation array with simplified handling
      const relations: Relation[] = [];
      
      if (relationsResult && Array.isArray(relationsResult) && relationsResult.length > 0 && Array.isArray(relationsResult[0])) {
        for (const rel of relationsResult[0]) {
          if (rel && typeof rel === 'object' && 'from' in rel && 'to' in rel && 'relationType' in rel) {
            relations.push({
              from: rel.from,
              to: rel.to,
              relationType: rel.relationType,
              createdAt: rel.createdAt
            });
            trace.debug(`Added relation: ${rel.from} --[${rel.relationType}]--> ${rel.to}`);
          }
        }
      }
      
      trace.debug(`Found ${relations.length} relations`);

      return { entities, relations };
    } catch (error) {
      trace.error("Error reading graph:", error);
      throw error;
    }
  }

  /**
   * Search the knowledge graph for entities matching a query
   */
  async searchNodes(
    query: string
  ): Promise<KnowledgeGraph> {
    try {
      // Search for entities by name or type (without using JavaScript functions)
      const entitiesResultByNameType = await this.db.query(
        `
        SELECT * FROM entity 
        WHERE 
          string::lowercase(name) CONTAINS string::lowercase($query) 
          OR string::lowercase(entityType) CONTAINS string::lowercase($query) 
        `,
        { query }
      );
      
      // Search for entities with matching observations (using a separate approach without JS functions)
      const entitiesResultByObservations = await this.db.query(
        `
        SELECT * FROM entity 
        WHERE 
          array::join(observations, ' ') CONTAINS $query
        `,
        { query }
      );
      
      // Combine results and deduplicate
      let allEntities: any[] = [];
      
      // Add entities from first query
      if (entitiesResultByNameType[0] && entitiesResultByNameType[0].length > 0) {
        allEntities = [...entitiesResultByNameType[0]];
      }
      
      // Add entities from second query if not already included
      if (entitiesResultByObservations[0] && entitiesResultByObservations[0].length > 0) {
        for (const entity of entitiesResultByObservations[0]) {
          if (!allEntities.some(e => e.name === entity.name)) {
            allEntities.push(entity);
          }
        }
      }
      
      // Extract and convert to Entity array
      const entities: Entity[] = allEntities.map((entity: any) => ({
        name: entity.name,
        entityType: entity.entityType,
        observations: entity.observations || [],
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt
      }));

      // Get entity names for relation filtering
      const entityNames = entities.map((e) => e.name);

      // No entities found, return empty results
      if (entityNames.length === 0) {
        return { entities: [], relations: [] };
      }

      // Get relations between found entities
      const relationsResult = await this.db.query(
        `
        SELECT * FROM relation 
        WHERE 
          from IN $names AND to IN $names
        `,
        { names: entityNames }
      );
      
      // Extract and convert to Relation array
      const relations: Relation[] = !relationsResult[0] ? [] :
        relationsResult[0].map((relation: any) => ({
          from: relation.from,
          to: relation.to,
          relationType: relation.relationType,
          createdAt: relation.createdAt
        }));

      return { entities, relations };
    } catch (error) {
      trace.error("Error searching nodes:", error);
      throw error;
    }
  }

  /**
   * Open specific nodes in the knowledge graph
   */
  async openNodes(
    names: string[]
  ): Promise<{ entities: Entity[]; relations: Relation[] }> {
    try {
      // Get specified entities
      const entitiesResult = await this.db.query(
        "SELECT * FROM entity WHERE name IN $names",
        { names }
      );
      
      // Extract and convert to Entity array
      const entities: Entity[] = !entitiesResult[0] ? [] :
        entitiesResult[0].map((entity: any) => ({
          name: entity.name,
          entityType: entity.entityType,
          observations: entity.observations || [],
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt
        }));

      // Get relations between these entities
      const relationsResult = await this.db.query(
        "SELECT * FROM relation WHERE from IN $names AND to IN $names",
        { names }
      );
      
      // Extract and convert to Relation array
      const relations: Relation[] = !relationsResult[0] ? [] :
        relationsResult[0].map((relation: any) => ({
          from: relation.from,
          to: relation.to,
          relationType: relation.relationType,
          createdAt: relation.createdAt
        }));

      return { entities, relations };
    } catch (error) {
      trace.error("Error opening nodes:", error);
      throw error;
    }
  }
}