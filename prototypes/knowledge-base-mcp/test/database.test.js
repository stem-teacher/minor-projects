#!/usr/bin/env node

/**
 * Simple test for KnowledgeGraphManager using Node.js test runner
 * No mocks, simple validation of existence and basic functionality
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { KnowledgeGraphManager, createDatabaseClient } from '../src/database.js';

// Run a simple test to verify the KnowledgeGraphManager class exists and its methods work
test('KnowledgeGraphManager basic functionality', async (t) => {
  // Test that the class and factory exist
  await t.test('class and factory exist', () => {
    assert.strictEqual(typeof KnowledgeGraphManager, 'function', 'KnowledgeGraphManager class should exist');
    assert.strictEqual(typeof createDatabaseClient, 'function', 'createDatabaseClient function should exist');
  });
  
  // Test instance creation
  await t.test('can create instance', () => {
    const manager = new KnowledgeGraphManager();
    assert.ok(manager instanceof KnowledgeGraphManager, 'Should be able to create instance');
    assert.strictEqual(typeof manager.initialize, 'function', 'initialize method should exist');
    assert.strictEqual(typeof manager.readGraph, 'function', 'readGraph method should exist');
    assert.strictEqual(typeof manager.createEntities, 'function', 'createEntities method should exist');
    assert.strictEqual(typeof manager.createRelations, 'function', 'createRelations method should exist');
    assert.strictEqual(typeof manager.addObservations, 'function', 'addObservations method should exist');
    assert.strictEqual(typeof manager.searchNodes, 'function', 'searchNodes method should exist');
    assert.strictEqual(typeof manager.openNodes, 'function', 'openNodes method should exist');
    assert.strictEqual(typeof manager.deleteEntities, 'function', 'deleteEntities method should exist');
    assert.strictEqual(typeof manager.deleteObservations, 'function', 'deleteObservations method should exist');
    assert.strictEqual(typeof manager.deleteRelations, 'function', 'deleteRelations method should exist');
  });
});