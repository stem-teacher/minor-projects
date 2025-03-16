import { 
  KnowledgeGraphManager, 
  Entity, 
  Relation, 
  createDatabaseClient 
} from '../src/database.js';
import { jest, describe, beforeEach, it, expect } from '@jest/globals';

// Create storage for the mock database
const mockStorage = {
  entities: [] as any[],
  relations: [] as any[]
};

// Create fully mocked implementation
const mockDb = {
  connect: jest.fn().mockResolvedValue(undefined),
  use: jest.fn().mockResolvedValue(undefined),
  query: jest.fn().mockImplementation((query, params) => {
    // Handle INFO FOR TABLE queries
    if (query.includes('INFO FOR TABLE')) {
      return Promise.resolve([[{ name: 'test' }]]);
    }
    
    // Handle schema queries
    if (query.includes('DEFINE TABLE')) {
      return Promise.resolve([[{ status: 'OK' }]]);
    }
    
    // Handle entity selection
    if (query.includes('SELECT * FROM entity')) {
      if (params?.name) {
        const entity = mockStorage.entities.find(e => e.name === params.name);
        return Promise.resolve(entity ? [[entity]] : [[]]);
      }
      
      if (params?.names) {
        const entities = mockStorage.entities.filter(e => params.names.includes(e.name));
        return Promise.resolve(entities.length > 0 ? [entities] : [[]]);
      }
      
      // Return all entities for plain SELECT
      return Promise.resolve(mockStorage.entities.length > 0 ? [mockStorage.entities] : [[]]);
    }
    
    // Handle search queries
    if (query.includes('string::lowercase') && params?.query) {
      const entities = mockStorage.entities.filter(e => 
        e.name.toLowerCase().includes(params.query.toLowerCase()) ||
        e.entityType.toLowerCase().includes(params.query.toLowerCase())
      );
      return Promise.resolve(entities.length > 0 ? [entities] : [[]]);
    }
    
    // Handle relation queries
    if (query.includes('SELECT * FROM relation')) {
      if (params?.from && params?.to && params?.relationType) {
        const relation = mockStorage.relations.find(r => 
          r.from === params.from && r.to === params.to && r.relationType === params.relationType
        );
        return Promise.resolve(relation ? [[relation]] : [[]]);
      }
      
      if (params?.names) {
        const relations = mockStorage.relations.filter(r => 
          params.names.includes(r.from) && params.names.includes(r.to)
        );
        return Promise.resolve(relations.length > 0 ? [relations] : [[]]);
      }
      
      return Promise.resolve(mockStorage.relations.length > 0 ? [mockStorage.relations] : [[]]);
    }
    
    // Handle relation creation
    if (query.includes('CREATE relation')) {
      const relation = {
        from: params.from,
        to: params.to,
        relationType: params.relationType,
        createdAt: params.createdAt
      };
      mockStorage.relations.push(relation);
      return Promise.resolve([[relation]]);
    }
    
    // Handle update queries
    if (query.includes('UPDATE entity')) {
      const entity = mockStorage.entities.find(e => e.name === params.name);
      if (entity) {
        if (query.includes('observations = array::concat')) {
          entity.observations = [...entity.observations, ...params.newObs];
        } else if (query.includes('observations =')) {
          entity.observations = params.observations;
        }
        entity.updatedAt = params.updatedAt;
        return Promise.resolve([[entity]]);
      }
      return Promise.resolve([[]]);
    }
    
    // Handle delete queries
    if (query.includes('DELETE FROM entity')) {
      mockStorage.entities = mockStorage.entities.filter(e => !params.names.includes(e.name));
      return Promise.resolve([[{ status: 'OK' }]]);
    }
    
    if (query.includes('DELETE FROM relation')) {
      if (params?.names) {
        mockStorage.relations = mockStorage.relations.filter(r => 
          !params.names.includes(r.from) && !params.names.includes(r.to)
        );
      } else if (params?.from) {
        mockStorage.relations = mockStorage.relations.filter(r => 
          !(r.from === params.from && r.to === params.to && r.relationType === params.relationType)
        );
      }
      return Promise.resolve([[{ status: 'OK' }]]);
    }
    
    return Promise.resolve([[]]);
  }),
  create: jest.fn().mockImplementation((table, data) => {
    if (table === 'entity') {
      mockStorage.entities.push(data);
      return Promise.resolve(data);
    }
    return Promise.resolve(null);
  })
};

// Mock the database client factory
jest.unstable_mockModule('../src/database.js', () => {
  const actual = jest.requireActual('../src/database.js');
  return {
    ...actual,
    createDatabaseClient: jest.fn().mockReturnValue(mockDb)
  };
});

describe('KnowledgeGraphManager', () => {
  let knowledgeGraphManager: KnowledgeGraphManager;

  beforeEach(async () => {
    // Reset mock storage
    mockStorage.entities = [];
    mockStorage.relations = [];
    
    // Reset all mock functions
    jest.clearAllMocks();
    
    // Create a new KnowledgeGraphManager instance
    knowledgeGraphManager = new KnowledgeGraphManager();
    await knowledgeGraphManager.initialize();
  });

  describe('initialize', () => {
    it('should connect to the database and setup schema', async () => {
      // Check that connection was established properly
      expect(knowledgeGraphManager.db).toBeDefined();
      expect(mockDb.connect).toHaveBeenCalled();
      expect(mockDb.use).toHaveBeenCalled();
      expect(mockDb.query).toHaveBeenCalled();
    });
  });

  describe('createEntities', () => {
    it('should create multiple entities with observations', async () => {
      const testEntities: Entity[] = [
        {
          name: 'TestEntity1',
          entityType: 'TestType',
          observations: ['Observation1', 'Observation2']
        },
        {
          name: 'TestEntity2',
          entityType: 'AnotherType',
          observations: ['Another observation']
        }
      ];

      const createdEntities = await knowledgeGraphManager.createEntities(testEntities);
      
      // Check we got the entities back
      // Check they were returned correctly
      expect(createdEntities).toHaveLength(2);
      expect(createdEntities[0].name).toBe('TestEntity1');
      expect(createdEntities[1].name).toBe('TestEntity2');
      
      // Check observations were properly formatted
      expect(Array.isArray(createdEntities[0].observations)).toBe(true);
      expect(createdEntities[0].observations).toHaveLength(2);
      const observation = createdEntities[0].observations[0];
      expect(typeof (observation as any).text).toBe('string');
      expect(typeof (observation as any).createdAt).toBe('string');
    });

    it('should handle empty observations array', async () => {
      const testEntities: Entity[] = [
        {
          name: 'EmptyObsEntity',
          entityType: 'TestType',
          observations: []
        }
      ];

      const createdEntities = await knowledgeGraphManager.createEntities(testEntities);
      
      expect(createdEntities).toHaveLength(1);
      expect(createdEntities[0].name).toBe('EmptyObsEntity');
      
      expect(createdEntities).toHaveLength(1);
      expect(createdEntities[0].observations).toHaveLength(0);
    });
  });

  describe('createRelations', () => {
    it('should create relations between existing entities', async () => {
      // First, create the entities
      await knowledgeGraphManager.createEntities([
        {
          name: 'EntityA',
          entityType: 'TestType',
          observations: ['Observation']
        },
        {
          name: 'EntityB',
          entityType: 'TestType',
          observations: ['Observation']
        }
      ]);

      const testRelations: Relation[] = [
        {
          from: 'EntityA',
          to: 'EntityB',
          relationType: 'CONNECTS_TO'
        }
      ];

      const createdRelations = await knowledgeGraphManager.createRelations(testRelations);
      
      expect(createdRelations).toHaveLength(1);
      expect(createdRelations[0].from).toBe('EntityA');
      expect(createdRelations[0].to).toBe('EntityB');
      expect(createdRelations[0].relationType).toBe('CONNECTS_TO');
    });

    it('should not create relations if entities do not exist', async () => {
      const testRelations: Relation[] = [
        {
          from: 'NonExistentA',
          to: 'NonExistentB',
          relationType: 'CONNECTS_TO'
        }
      ];

      const createdRelations = await knowledgeGraphManager.createRelations(testRelations);
      
      expect(createdRelations).toHaveLength(0);
    });
  });

  describe('readGraph', () => {
    it('should read the entire knowledge graph', async () => {
      // Create test data
      await knowledgeGraphManager.createEntities([
        { name: 'Entity1', entityType: 'Type1', observations: ['Obs1'] },
        { name: 'Entity2', entityType: 'Type2', observations: ['Obs2'] }
      ]);
      
      await knowledgeGraphManager.createRelations([
        { from: 'Entity1', to: 'Entity2', relationType: 'RELATES_TO' }
      ]);

      const graph = await knowledgeGraphManager.readGraph();
      
      expect(graph.entities).toHaveLength(2);
      expect(graph.relations).toHaveLength(1);
      expect(graph.entities[0].name).toBe('Entity1');
      expect(graph.relations[0].from).toBe('Entity1');
      expect(graph.relations[0].to).toBe('Entity2');
    });

    it('should return empty arrays if no data exists', async () => {
      const graph = await knowledgeGraphManager.readGraph();
      
      expect(graph.entities).toHaveLength(0);
      expect(graph.relations).toHaveLength(0);
    });
  });

  describe('searchNodes', () => {
    beforeEach(async () => {
      // Set up test data
      await knowledgeGraphManager.createEntities([
        { name: 'TestApple', entityType: 'Fruit', observations: ['Red and sweet'] },
        { name: 'TestBanana', entityType: 'Fruit', observations: ['Yellow and sweet'] },
        { name: 'TestCarrot', entityType: 'Vegetable', observations: ['Orange and crunchy'] }
      ]);
      
      await knowledgeGraphManager.createRelations([
        { from: 'TestApple', to: 'TestBanana', relationType: 'SIMILAR_TO' },
        { from: 'TestBanana', to: 'TestCarrot', relationType: 'DIFFERENT_FROM' }
      ]);
    });

    it('should find entities matching a query by name', async () => {
      const result = await knowledgeGraphManager.searchNodes('Apple');
      
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].name).toBe('TestApple');
    });

    it('should find entities matching a query by type', async () => {
      const result = await knowledgeGraphManager.searchNodes('Fruit');
      
      expect(result.entities).toHaveLength(2);
      expect(result.entities.map(e => e.name)).toContain('TestApple');
      expect(result.entities.map(e => e.name)).toContain('TestBanana');
    });

    it('should find relations between matched entities', async () => {
      const result = await knowledgeGraphManager.searchNodes('Fruit');
      
      expect(result.relations).toHaveLength(1);
      expect(result.relations[0].from).toBe('TestApple');
      expect(result.relations[0].to).toBe('TestBanana');
    });

    it('should return empty results for non-matching queries', async () => {
      const result = await knowledgeGraphManager.searchNodes('NonExistent');
      
      expect(result.entities).toHaveLength(0);
      expect(result.relations).toHaveLength(0);
    });
  });

  describe('openNodes', () => {
    beforeEach(async () => {
      // Set up test data
      await knowledgeGraphManager.createEntities([
        { name: 'Node1', entityType: 'Type1', observations: ['Obs1'] },
        { name: 'Node2', entityType: 'Type2', observations: ['Obs2'] },
        { name: 'Node3', entityType: 'Type3', observations: ['Obs3'] }
      ]);
      
      await knowledgeGraphManager.createRelations([
        { from: 'Node1', to: 'Node2', relationType: 'CONNECTS' },
        { from: 'Node2', to: 'Node3', relationType: 'CONNECTS' }
      ]);
    });

    it('should retrieve specific nodes by name', async () => {
      const result = await knowledgeGraphManager.openNodes(['Node1', 'Node2']);
      
      expect(result.entities).toHaveLength(2);
      expect(result.entities.map(e => e.name)).toContain('Node1');
      expect(result.entities.map(e => e.name)).toContain('Node2');
    });

    it('should retrieve relations between the specified nodes', async () => {
      const result = await knowledgeGraphManager.openNodes(['Node1', 'Node2']);
      
      expect(result.relations).toHaveLength(1);
      expect(result.relations[0].from).toBe('Node1');
      expect(result.relations[0].to).toBe('Node2');
    });

    it('should handle non-existent nodes gracefully', async () => {
      const result = await knowledgeGraphManager.openNodes(['NonExistent']);
      
      expect(result.entities).toHaveLength(0);
      expect(result.relations).toHaveLength(0);
    });
  });

  describe('addObservations', () => {
    beforeEach(async () => {
      // Create a test entity
      await knowledgeGraphManager.createEntities([
        { name: 'ObsTestEntity', entityType: 'TestType', observations: ['Initial observation'] }
      ]);
    });

    it('should add new observations to an existing entity', async () => {
      const observationsToAdd = [
        {
          entityName: 'ObsTestEntity',
          contents: ['New observation 1', 'New observation 2']
        }
      ];

      const result = await knowledgeGraphManager.addObservations(observationsToAdd);
      
      expect(result).toHaveLength(1);
      expect(result[0].entityName).toBe('ObsTestEntity');
      expect(result[0].addedObservations).toHaveLength(2);
      
      // Check the entity has updated observations
      const entity = (await knowledgeGraphManager.openNodes(['ObsTestEntity'])).entities[0];
      expect(entity.observations).toHaveLength(3); // 1 initial + 2 new
    });

    it('should not add duplicate observations', async () => {
      const observationsToAdd = [
        {
          entityName: 'ObsTestEntity',
          contents: ['Initial observation', 'New unique observation']
        }
      ];

      const result = await knowledgeGraphManager.addObservations(observationsToAdd);
      
      expect(result).toHaveLength(1);
      expect(result[0].addedObservations).toHaveLength(1); // Only the new unique one
      
      const entity = (await knowledgeGraphManager.openNodes(['ObsTestEntity'])).entities[0];
      expect(entity.observations).toHaveLength(2); // 1 initial + 1 new unique
    });

    it('should throw an error for non-existent entities', async () => {
      const observationsToAdd = [
        {
          entityName: 'NonExistentEntity',
          contents: ['New observation']
        }
      ];

      await expect(knowledgeGraphManager.addObservations(observationsToAdd))
        .rejects.toThrow('Entity with name NonExistentEntity not found');
    });
  });

  describe('deleteEntities', () => {
    beforeEach(async () => {
      // Set up test data
      await knowledgeGraphManager.createEntities([
        { name: 'DeleteEntity1', entityType: 'Type1', observations: ['Obs1'] },
        { name: 'DeleteEntity2', entityType: 'Type2', observations: ['Obs2'] },
        { name: 'KeepEntity', entityType: 'Type3', observations: ['Obs3'] }
      ]);
      
      await knowledgeGraphManager.createRelations([
        { from: 'DeleteEntity1', to: 'DeleteEntity2', relationType: 'CONNECTS' },
        { from: 'DeleteEntity1', to: 'KeepEntity', relationType: 'CONNECTS' }
      ]);
    });

    it('should delete specified entities', async () => {
      const result = await knowledgeGraphManager.deleteEntities(['DeleteEntity1', 'DeleteEntity2']);
      
      expect(result.success).toBe(true);
      
      const remainingEntities = (await knowledgeGraphManager.readGraph()).entities;
      expect(remainingEntities).toHaveLength(1);
      expect(remainingEntities[0].name).toBe('KeepEntity');
    });

    it('should delete relations associated with deleted entities', async () => {
      await knowledgeGraphManager.deleteEntities(['DeleteEntity1']);
      
      const graph = await knowledgeGraphManager.readGraph();
      expect(graph.relations).toHaveLength(0); // Both relations included DeleteEntity1
    });

    it('should handle deletion of non-existent entities gracefully', async () => {
      const result = await knowledgeGraphManager.deleteEntities(['NonExistentEntity']);
      
      expect(result.success).toBe(true);
      
      // Make sure the original entities are still there
      const graph = await knowledgeGraphManager.readGraph();
      expect(graph.entities).toHaveLength(3);
    });
  });

  describe('deleteObservations', () => {
    beforeEach(async () => {
      // Create a test entity with multiple observations
      await knowledgeGraphManager.createEntities([
        { 
          name: 'ObsDeletionEntity', 
          entityType: 'TestType', 
          observations: ['Keep this observation', 'Delete this observation', 'Also delete this']
        }
      ]);
    });

    it('should delete specific observations from an entity', async () => {
      const observationsToDelete = [
        {
          entityName: 'ObsDeletionEntity',
          observations: ['Delete this observation']
        }
      ];

      const result = await knowledgeGraphManager.deleteObservations(observationsToDelete);
      
      expect(result.success).toBe(true);
      
      const entity = (await knowledgeGraphManager.openNodes(['ObsDeletionEntity'])).entities[0];
      expect(entity.observations).toHaveLength(2);
      expect(entity.observations.some((obs: any) => 
        obs.text === 'Delete this observation' || obs === 'Delete this observation'
      )).toBe(false);
    });

    it('should delete multiple observations', async () => {
      const observationsToDelete = [
        {
          entityName: 'ObsDeletionEntity',
          observations: ['Delete this observation', 'Also delete this']
        }
      ];

      await knowledgeGraphManager.deleteObservations(observationsToDelete);
      
      const entity = (await knowledgeGraphManager.openNodes(['ObsDeletionEntity'])).entities[0];
      expect(entity.observations).toHaveLength(1);
      
      // Handle both string and Observation type for the observation
      const observation = entity.observations[0];
      const obsText = typeof observation === 'string' ? observation : observation.text;
      expect(obsText).toBe('Keep this observation');
    });

    it('should handle non-existent entities gracefully', async () => {
      const observationsToDelete = [
        {
          entityName: 'NonExistentEntity',
          observations: ['Some observation']
        }
      ];

      const result = await knowledgeGraphManager.deleteObservations(observationsToDelete);
      
      expect(result.success).toBe(true);
      
      // Original entity should remain unchanged
      const entity = (await knowledgeGraphManager.openNodes(['ObsDeletionEntity'])).entities[0];
      expect(entity.observations).toHaveLength(3);
    });
  });

  describe('deleteRelations', () => {
    beforeEach(async () => {
      // Set up test data
      await knowledgeGraphManager.createEntities([
        { name: 'RelEntity1', entityType: 'Type1', observations: ['Obs1'] },
        { name: 'RelEntity2', entityType: 'Type2', observations: ['Obs2'] },
        { name: 'RelEntity3', entityType: 'Type3', observations: ['Obs3'] }
      ]);
      
      await knowledgeGraphManager.createRelations([
        { from: 'RelEntity1', to: 'RelEntity2', relationType: 'CONNECTS' },
        { from: 'RelEntity2', to: 'RelEntity3', relationType: 'REFERENCES' },
        { from: 'RelEntity1', to: 'RelEntity3', relationType: 'DEPENDS_ON' }
      ]);
    });

    it('should delete specific relations', async () => {
      const relationsToDelete: Relation[] = [
        { from: 'RelEntity1', to: 'RelEntity2', relationType: 'CONNECTS' }
      ];

      const result = await knowledgeGraphManager.deleteRelations(relationsToDelete);
      
      expect(result.success).toBe(true);
      
      const graph = await knowledgeGraphManager.readGraph();
      expect(graph.relations).toHaveLength(2);
      expect(graph.relations.every(r => 
        r.from !== 'RelEntity1' || 
        r.to !== 'RelEntity2' || 
        r.relationType !== 'CONNECTS'
      )).toBe(true);
    });

    it('should delete multiple relations', async () => {
      const relationsToDelete: Relation[] = [
        { from: 'RelEntity1', to: 'RelEntity2', relationType: 'CONNECTS' },
        { from: 'RelEntity1', to: 'RelEntity3', relationType: 'DEPENDS_ON' }
      ];

      await knowledgeGraphManager.deleteRelations(relationsToDelete);
      
      const graph = await knowledgeGraphManager.readGraph();
      expect(graph.relations).toHaveLength(1);
      expect(graph.relations[0].from).toBe('RelEntity2');
      expect(graph.relations[0].to).toBe('RelEntity3');
    });

    it('should handle non-existent relations gracefully', async () => {
      const relationsToDelete: Relation[] = [
        { from: 'RelEntity1', to: 'RelEntity2', relationType: 'NON_EXISTENT_TYPE' }
      ];

      const result = await knowledgeGraphManager.deleteRelations(relationsToDelete);
      
      expect(result.success).toBe(true);
      
      // Original relations should remain unchanged
      const graph = await knowledgeGraphManager.readGraph();
      expect(graph.relations).toHaveLength(3);
    });
  });
});