/**
 * Simple tests for KnowledgeGraphManager key functionality.
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Create mock DB client before importing the module
const mockDbClient = {
  connect: jest.fn().mockResolvedValue(undefined),
  use: jest.fn().mockResolvedValue(undefined),
  query: jest.fn().mockImplementation(() => Promise.resolve([[]])),
  create: jest.fn().mockResolvedValue({})
};

// Mock the database factory function
jest.unstable_mockModule('../src/database.js', () => {
  return {
    createDatabaseClient: jest.fn(() => mockDbClient),
    // Keep the rest of the exports
    KnowledgeGraphManager: (await import('../src/database.js')).KnowledgeGraphManager,
    SURREALDB_URL: 'mock://url',
    SURREALDB_USER: 'mockuser',
    SURREALDB_PASS: 'mockpass',
    SURREALDB_NS: 'mockns',
    SURREALDB_DB: 'mockdb',
    trace: { debug: jest.fn(), info: jest.fn(), error: jest.fn() }
  };
});

// Dynamic import after mocking
let KnowledgeGraphManager;

describe('KnowledgeGraphManager', () => {
  let manager;
  let mockDb;

  beforeEach(async () => {
    // Import after mocking
    const database = await import('../src/database.js');
    KnowledgeGraphManager = database.KnowledgeGraphManager;
    
    // Create a new KnowledgeGraphManager instance
    manager = new KnowledgeGraphManager();
    
    // Initialize without actually connecting to a database
    await manager.initialize();
    
    // Get reference to the mock database
    mockDb = manager.db;
    
    // Reset mock counts
    jest.clearAllMocks();
  });

  test('initialization connects and sets up schema', () => {
    // Test that initialize() called the right database methods
    expect(mockDb.connect).toHaveBeenCalled();
    expect(mockDb.use).toHaveBeenCalled();
    expect(mockDb.query).toHaveBeenCalled();
  });
  
  test('createEntities calls create with correctly formatted data', async () => {
    // Set up mock implementation for entity creation
    mockDb.create.mockImplementation((_table, data) => Promise.resolve(data));
    mockDb.query.mockResolvedValueOnce([[]]);
    
    // Call the method
    const entities = await manager.createEntities([
      { 
        name: 'TestEntity',
        entityType: 'TestType',
        observations: ['Test observation']
      }
    ]);
    
    // Check the create method was called with expected args
    expect(mockDb.create).toHaveBeenCalled();
    const createArgs = mockDb.create.mock.calls[0];
    
    // Table name should be "entity"
    expect(createArgs[0]).toBe('entity');
    
    // Entity data should be formatted correctly
    const entityData = createArgs[1];
    expect(entityData.name).toBe('TestEntity');
    expect(entityData.entityType).toBe('TestType');
    
    // Observations should have timestamps
    expect(Array.isArray(entityData.observations)).toBe(true);
    expect(entityData.observations[0].text).toBe('Test observation');
    expect(typeof entityData.observations[0].createdAt).toBe('string');
    
    // Entity should have timestamps
    expect(typeof entityData.createdAt).toBe('string');
    expect(typeof entityData.updatedAt).toBe('string');
  });
  
  test('readGraph assembles entities and relations correctly', async () => {
    // Mock data
    const mockEntities = [
      { name: 'Entity1', entityType: 'Type1', observations: [], createdAt: '2023-01-01', updatedAt: '2023-01-01' },
      { name: 'Entity2', entityType: 'Type2', observations: [], createdAt: '2023-01-01', updatedAt: '2023-01-01' }
    ];
    
    const mockRelations = [
      { from: 'Entity1', to: 'Entity2', relationType: 'RELATES_TO', createdAt: '2023-01-01' }
    ];
    
    // Set up query responses
    mockDb.query.mockImplementation((query) => {
      if (query.includes('SELECT * FROM entity')) {
        return Promise.resolve([mockEntities]);
      } else if (query.includes('SELECT * FROM relation')) {
        return Promise.resolve([mockRelations]);
      }
      return Promise.resolve([[]]);
    });
    
    // Call the method
    const graph = await manager.readGraph();
    
    // Check results
    expect(graph.entities).toEqual(mockEntities);
    expect(graph.relations).toEqual(mockRelations);
  });
});