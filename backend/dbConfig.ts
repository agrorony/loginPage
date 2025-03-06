import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

// Database configuration using environment variables with fallbacks
export const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'research_permissions',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306
};