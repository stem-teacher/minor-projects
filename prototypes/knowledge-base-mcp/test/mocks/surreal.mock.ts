/**
 * SurrealDB Mock for Unit Testing
 */
export class SurrealMock {
  private entities: any[] = [];
  private relations: any[] = [];
  private connected = false;

  async connect(_url: string, _options: any): Promise<void> {
    this.connected = true;
    return Promise.resolve();
  }

  async use(_namespace: any): Promise<void> {
    return Promise.resolve();
  }

  async query(query: string, params?: any): Promise<any[][]> {
    // Handle INFO FOR TABLE queries
    if (query.includes("INFO FOR TABLE")) {
      return Promise.resolve([[{ name: "test" }]]);
    }
    
    // Handle DEFINE TABLE queries
    if (query.includes("DEFINE TABLE")) {
      return Promise.resolve([[{ status: "OK" }]]);
    }
    
    // Handle SELECT queries
    if (query.includes("SELECT * FROM entity")) {
      if (params?.name) {
        const entity = this.entities.find(e => e.name === params.name);
        return Promise.resolve(entity ? [[entity]] : [[]]);
      } 
      
      if (params?.names) {
        const filteredEntities = this.entities.filter(e => params.names.includes(e.name));
        return Promise.resolve(filteredEntities.length > 0 ? [filteredEntities] : [[]]);
      }
      
      // Search queries
      if (query.includes("CONTAINS") && params?.query) {
        const lowercaseQuery = params.query.toLowerCase();
        const results = this.entities.filter(e => 
          e.name.toLowerCase().includes(lowercaseQuery) || 
          e.entityType.toLowerCase().includes(lowercaseQuery)
        );
        return Promise.resolve(results.length > 0 ? [results] : [[]]);
      }
      
      return Promise.resolve(this.entities.length > 0 ? [this.entities] : [[]]);
    }
    
    if (query.includes("SELECT * FROM relation")) {
      if (params?.from && params?.to && params?.relationType) {
        const relation = this.relations.find(r => 
          r.from === params.from && 
          r.to === params.to && 
          r.relationType === params.relationType
        );
        return Promise.resolve(relation ? [[relation]] : [[]]);
      }
      
      if (params?.names) {
        const filteredRelations = this.relations.filter(r => 
          params.names.includes(r.from) && params.names.includes(r.to)
        );
        return Promise.resolve(filteredRelations.length > 0 ? [filteredRelations] : [[]]);
      }
      
      return Promise.resolve(this.relations.length > 0 ? [this.relations] : [[]]);
    }
    
    // Handle CREATE queries
    if (query.includes("CREATE relation")) {
      const relation = {
        from: params.from,
        to: params.to,
        relationType: params.relationType,
        createdAt: params.createdAt
      };
      this.relations.push(relation);
      return Promise.resolve([[relation]]);
    }
    
    // Handle UPDATE queries
    if (query.includes("UPDATE entity SET observations")) {
      const entity = this.entities.find(e => e.name === params.name);
      if (entity) {
        entity.observations = entity.observations.concat(params.newObs);
        entity.updatedAt = params.updatedAt;
      }
      return Promise.resolve([[entity]]);
    } 
    
    if (query.includes("UPDATE entity SET")) {
      const entity = this.entities.find(e => e.name === params.name);
      if (entity) {
        entity.observations = params.observations;
        entity.updatedAt = params.updatedAt;
      }
      return Promise.resolve([[entity]]);
    }
    
    // Handle DELETE queries
    if (query.includes("DELETE FROM entity")) {
      if (params?.names) {
        this.entities = this.entities.filter(e => !params.names.includes(e.name));
      }
      return Promise.resolve([[{ status: "OK" }]]);
    }
    
    if (query.includes("DELETE FROM relation")) {
      if (params?.from && params?.to && params?.relationType) {
        this.relations = this.relations.filter(r => 
          r.from !== params.from || 
          r.to !== params.to || 
          r.relationType !== params.relationType
        );
      } else if (params?.names) {
        this.relations = this.relations.filter(r => 
          !params.names.includes(r.from) && !params.names.includes(r.to)
        );
      }
      return Promise.resolve([[{ status: "OK" }]]);
    }
    
    // Count query for relations
    if (query.includes("SELECT count() FROM relation")) {
      return Promise.resolve([[{ count: this.relations.length }]]);
    }
    
    return Promise.resolve([[]]); 
  }

  async create(table: string, data: any): Promise<any> {
    if (table === "entity") {
      this.entities.push(data);
      return data;
    }
    return null;
  }
  
  // Helper methods for testing
  _getEntities() {
    return this.entities;
  }
  
  _getRelations() {
    return this.relations;
  }
  
  _reset() {
    this.entities = [];
    this.relations = [];
  }
}