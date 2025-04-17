// backend/database/DatabaseService.ts

import { BigQuery } from '@google-cloud/bigquery';

export class DatabaseService {
  private static instance: BigQuery;

  public static getInstance(): BigQuery {
    if (!DatabaseService.instance) {
      // Initialize the BigQuery client
      DatabaseService.instance = new BigQuery();
    }
    return DatabaseService.instance;
  }
}