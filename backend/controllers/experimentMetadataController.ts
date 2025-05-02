import { Request, Response } from 'express';
import { bigQueryClient } from '../dbConfig';

/**
 * Fetch time range and available sensors for experiments.
 */
export const getExperimentMetadata = async (req: Request, res: Response) => {
  const { experiments } = req.body;

  // Validate that experiments is an array
  if (!experiments || !Array.isArray(experiments)) {
    return res.status(400).json({
      success: false,
      message: 'Valid experiments array is required',
    });
  }

  // Iterate over the experiments and validate each one
  const invalidExperiments = experiments.filter((experiment, index) => {
    const { project_id, dataset_name, table_id, experiment_name } = experiment;

    // Check if any required field is missing
    const isValid =
      project_id &&
      dataset_name &&
      table_id &&
      experiment_name;

    // Log invalid experiments for debugging
    if (!isValid) {
      console.warn(`Invalid experiment at index ${index}:`, experiment);
    }
    return !isValid;
  });

  // If there are invalid experiments, return a 400 response
  if (invalidExperiments.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Some experiments are missing required fields',
      invalidExperiments,
    });
  }

  try {
    // Fetch time range and available sensors for each experiment
    const metadataResults = await Promise.all(
      experiments.map(async (experiment) => {
        const { project_id, dataset_name, table_id, experiment_name, mac_address } = experiment;

        console.log(
          `Fetching metadata for experiment: ${experiment_name} in table: ${table_id}`
        );

        // Step 1: Fetch the table schema
        let schema;
        try {
          const [table] = await bigQueryClient.dataset(dataset_name).table(table_id).getMetadata();
          schema = table.schema.fields;
        } catch (error) {
          console.error("Error fetching table schema:", error);
          throw new Error(`Failed to fetch schema for table ${table_id}`);
        }

        // Step 2: Identify all 'SensorData_' columns
        const sensorColumns = schema
          .filter((field: { name: string }) => field.name.startsWith("SensorData_"))
          .map((field: { name: string }) => field.name);

                // Step 3: Query for non-null sensor columns
          const sensorCheckQuery = `
          SELECT ${sensorColumns
            .map((col: string) => `IF(COUNTIF(${col} IS NOT NULL) > 0, '${col}', NULL) AS ${col}`)
            .join(", ")}
          FROM \`${project_id}.${dataset_name}.${table_id}\`
          WHERE ExperimentData_Exp_name = @experiment_name
          ${mac_address ? "AND ExperimentData_MAC_address = @mac_address" : ""}
          `;
        const sensorCheckParams = {
          experiment_name,
          ...(mac_address && { mac_address }),
        };

        let sensorCheckResults;
        try {
          [sensorCheckResults] = await bigQueryClient.query({
            query: sensorCheckQuery,
            params: sensorCheckParams,
          });
        } catch (error) {
          console.error("Error executing sensor check query:", error);
          throw new Error(`Failed to fetch available sensors for ${experiment_name}`);
        }

        // Extract non-null columns as available sensors
        const availableSensors = Object.keys(sensorCheckResults[0])
          .filter((key) => sensorCheckResults[0][key] !== null);

        // Step 4: Fetch time range
        const timeRangeQuery = `
          SELECT 
            MIN(TimeStamp) as first_timestamp,
            MAX(TimeStamp) as last_timestamp
          FROM \`${project_id}.${dataset_name}.${table_id}\`
          WHERE ExperimentData_Exp_name = @experiment_name
          ${mac_address ? "AND ExperimentData_MAC_address = @mac_address" : ""}
        `;

        let timeRangeResults;
        try {
          [timeRangeResults] = await bigQueryClient.query({
            query: timeRangeQuery,
            params: sensorCheckParams,
          });
        } catch (error) {
          console.error('Error executing time range query:', error);
          throw new Error(`Failed to fetch time range for ${experiment_name}`);
        }

        const timeRange = {
          first_timestamp: timeRangeResults[0]?.first_timestamp || null,
          last_timestamp: timeRangeResults[0]?.last_timestamp || null,
        };

        return {
          table_id,
          experiment_name,
          mac_address: mac_address || null,
          time_range: timeRange,
          available_sensors: availableSensors,
        };
      })
    );

    // Send the metadata results as a response
    res.status(200).json({
      success: true,
      metadata: metadataResults,
    });
  } catch (error: any) {
    console.error('Error fetching experiment metadata:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch experiment metadata',
      error: error.message || 'Unknown error',
    });
  }
};