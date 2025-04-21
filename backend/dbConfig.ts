import dotenv from 'dotenv';
import { BigQuery } from '@google-cloud/bigquery';

// Ensure environment variables are loaded
dotenv.config();

// Export BigQuery instance for database interactions
export const bigQueryClient = new BigQuery({
  projectId: process.env.GCP_PROJECT_ID, // Google Cloud Project ID
  keyFilename: process.env.GCP_KEY_FILE, // Path to the service account key file
});

// Define the dataset and table names
export const bigQueryConfig = {
  projectId: process.env.GCP_PROJECT_ID || 'iucc-f4d', // Add projectId with default fallback
  dataset: process.env.GCP_DATASET || 'your_dataset_name', // Replace with default dataset name
  userTable: process.env.GCP_USER_TABLE || 'user_table', // Replace with default table name
};