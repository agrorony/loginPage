// backend/migrations/migrationRunner.ts
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { dbConfig } from '../dbConfig';

// Interface for migration metadata
interface MigrationRecord {
  id: number;
  name: string;
  applied_at: Date;
}

async function runMigrations() {
  console.log('Starting database migrations...');
  
  // Create connection pool
  const connection = await mysql.createConnection({
    ...dbConfig,
    multipleStatements: true // Allow multiple statements for migrations
  });

  try {
    // Ensure migrations table exists
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get list of applied migrations
    const [rows] = await connection.execute('SELECT name FROM migrations');
    const appliedMigrations = (rows as MigrationRecord[]).map(row => row.name);

    // Get all migration files
    const migrationsDir = path.join(__dirname);
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js') || file.endsWith('.ts'))
      .filter(file => file !== 'migrationRunner.ts' && file !== 'migrationRunner.js')
      .sort(); // Ensure migrations run in order

    // Run migrations that haven't been applied yet
    for (const file of migrationFiles) {
      if (!appliedMigrations.includes(file)) {
        console.log(`Running migration: ${file}`);
        
        // Import the migration file
        const migrationPath = path.join(migrationsDir, file);
        const migration = require(migrationPath);
        
        // Run the migration
        if (typeof migration.up === 'function') {
          await migration.up(connection);
          
          // Record the migration as applied
          await connection.execute(
            'INSERT INTO migrations (name) VALUES (?)',
            [file]
          );
          
          console.log(`Migration ${file} applied successfully`);
        } else {
          console.error(`Migration ${file} does not have an 'up' function`);
        }
      }
    }
    
    console.log('Database migrations completed');
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Allow this to be run directly or imported
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migration process finished');
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
} else {
  module.exports = { runMigrations };
}
