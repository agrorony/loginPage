// backend/database/DatabaseService.ts

import { DatabaseAdapter } from './adapters/DatabaseAdapter';
//import { MySQLAdapter } from './adapters/MySQLAdapter';
//import { BigQueryAdapter } from './adapters/BigQueryAdapter';

export class DatabaseService {
  private static adapter: DatabaseAdapter;

  public static getAdapter(): DatabaseAdapter {
    if (!DatabaseService.adapter) {
      // Determine which adapter to use based on environment
      const dbType = process.env.DB_TYPE || 'mysql';
      
      if (dbType.toLowerCase() === 'bigquery') {
        DatabaseService.adapter = new BigQueryAdapter();
      } else {
        DatabaseService.adapter = new MySQLAdapter();
      }
    }
    
    return DatabaseService.adapter;
  }
}