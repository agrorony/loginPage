        // backend/experimentDbConfig.ts
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

// Experiment data database configuration with fallbacks
export const experimentDbConfig = {
  host: process.env.EXPERIMENT_DB_HOST || process.env.DB_HOST || '127.0.0.1',
  user: process.env.EXPERIMENT_DB_USER || process.env.DB_USER || 'root',
  password: process.env.EXPERIMENT_DB_PASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.EXPERIMENT_DB_NAME || 'research_experiments',
  port: process.env.EXPERIMENT_DB_PORT ? parseInt(process.env.EXPERIMENT_DB_PORT) : 
        process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306
};