// backend/scripts/create-migration.js
const fs = require('fs');
const path = require('path');

// Get migration name from command line
const migrationName = process.argv[2];

if (!migrationName) {
  console.error('Please provide a migration name');
  console.error('Example: npm run migrate:create add_user_phone_number');
  process.exit(1);
}

// Create a timestamp
const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').substring(0, 14);

// Create the file name
const fileName = `${timestamp}_${migrationName}.ts`;

// Create the migrations directory if it doesn't exist
const migrationsDir = path.join(__dirname, '..', 'migrations');
if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
}

// Migration file content
const content = `import { Connection } from 'mysql2/promise';

/**
 * Migration: ${migrationName}
 * Created: ${new Date().toISOString()}
 */
export async function up(connection: Connection): Promise<void> {
  // Add your migration code here
  // Example:
  // await connection.execute(\`
  //   ALTER TABLE users
  //   ADD COLUMN phone_number VARC HAR(20)
  // \`);
}

/**
 * Rollback the migration
 */
export async function down(connection: Connection): Promise<void> {
  // Add code to roll back the migration
  // Example:
  // await connection.execute(\`
  //   ALTER TABLE users
  //   DROP COLUMN phone_number
  // \`);
}
`;

// Write the migration file
const filePath = path.join(migrationsDir, fileName);
fs.writeFileSync(filePath, content);

console.log(`Migration file created: ${filePath}`);
