// backend/migrations/001_initial_schema.ts
import { Connection } from 'mysql2/promise';

export async function up(connection: Connection): Promise<void> {
  // Create users table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS users (
      email VARCHAR(255) PRIMARY KEY,
      hashed_password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP NULL
    )
  `);

  // Create mac_address_mapping table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS mac_address_mapping (
      mac_address VARCHAR(50) PRIMARY KEY,
      dataset_name VARCHAR(255),
      description TEXT,
      owner VARCHAR(255)
    )
  `);

  // Create permissions table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS permissions (
      permission_id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      owner VARCHAR(255),
      mac_address VARCHAR(50) NOT NULL,
      experiment VARCHAR(255) NOT NULL,
      is_admin BOOLEAN DEFAULT FALSE,
      valid_from TIMESTAMP NULL,
      valid_until TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (email) REFERENCES users(email),
      FOREIGN KEY (mac_address) REFERENCES mac_address_mapping(mac_address)
    )
  `);
}

export async function down(connection: Connection): Promise<void> {
  // Drop tables in reverse order (due to foreign key constraints)
  await connection.execute('DROP TABLE IF EXISTS permissions');
  await connection.execute('DROP TABLE IF EXISTS mac_address_mapping');
  await connection.execute('DROP TABLE IF EXISTS users');
}
