import { BigQuery } from '@google-cloud/bigquery';

export class ExperimentDataService {
  private bigQueryClient: BigQuery;

  constructor() {
    this.bigQueryClient = new BigQuery();
  }

  /**
   * Fetch timestamps of the first and last record for each experiment.
   * @param datasetName - The BigQuery dataset name.
   * @param tableName - The BigQuery table name.
   * @returns An array of objects containing experiment name, first record timestamp, and last record timestamp.
   */
  public async getExperimentTimestamps(datasetName: string, tableName: string): Promise<any[]> {
    const query = `
      SELECT
        ExperimentData_Exp_name AS experimentName,
        MIN(timestamp) AS firstRecord,
        MAX(timestamp) AS lastRecord
      FROM \`${datasetName}.${tableName}\`
      GROUP BY ExperimentData_Exp_name
    `;

    const [rows] = await this.bigQueryClient.query({ query });
    return rows;
  }

  /**
   * Fetch sensors that are functional (non-null) for each experiment.
   * @param datasetName - The BigQuery dataset name.
   * @param tableName - The BigQuery table name.
   * @returns An array of objects containing experiment name and the list of functional sensors.
   */
  public async getFunctionalSensors(datasetName: string, tableName: string): Promise<any[]> {
    const query = `
      SELECT
        ExperimentData_Exp_name AS experimentName,
        ARRAY_AGG(sensorField IGNORE NULLS) AS functionalSensors
      FROM \`${datasetName}.${tableName}\`,
      UNNEST([sensor1, sensor2, sensor3, sensor4]) AS sensorField
      WHERE sensorField IS NOT NULL
      GROUP BY ExperimentData_Exp_name
    `;

    const [rows] = await this.bigQueryClient.query({ query });
    return rows.map(row => ({
      experimentName: row.experimentName,
      functionalSensors: row.functionalSensors,
    }));
  }
}