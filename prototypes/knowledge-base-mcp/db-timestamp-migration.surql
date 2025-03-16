
  // Add timestamp fields to entity table
  DEFINE FIELD IF NOT EXISTS createdAt ON entity TYPE datetime;
  DEFINE FIELD IF NOT EXISTS updatedAt ON entity TYPE datetime;
  
  // Add timestamp field to relation table
  DEFINE FIELD IF NOT EXISTS createdAt ON relation TYPE datetime;
  
  // Set default timestamps for existing records
  LET current_time = time::now();
  
  // Update entities
  UPDATE entity 
  SET 
    createdAt = $current_time,
    updatedAt = $current_time
  WHERE 
    createdAt = NONE OR updatedAt = NONE;
  
  // Update relations
  UPDATE relation
  SET
    createdAt = $current_time
  WHERE
    createdAt = NONE;
  
  // Update observations format (handle this in the application code)
  // This is a placeholder for the code that will convert observations 
  // from strings to objects with text and createdAt
  