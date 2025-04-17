// backend/setupExperimentDb.ts
import mysql from 'mysql2/promise';
import { experimentDbConfig } from './experimentDbConfig';

export async function setupExperimentDatabase(): Promise<void> {
  try {
    // Create connection without specifying database
    const connection = await mysql.createConnection({
      host: experimentDbConfig.host,
      user: experimentDbConfig.user,
      password: experimentDbConfig.password,
      port: experimentDbConfig.port
    });

    // Create database if it doesn't exist
    await connection.execute(
      `CREATE DATABASE IF NOT EXISTS ${experimentDbConfig.database}`
    );
    
    console.log(`Experiment database "${experimentDbConfig.database}" ensured.`);
    await connection.end();
  } catch (error) {
    console.error('Error setting up experiment database:', error);
    throw error;
  }
}