import { Request, Response } from 'express';
import { bigQueryClient } from '../dbConfig';

export const getExperimentMetadata = async (req: Request, res: Response) => {
  const { experiments } = req.body;

  if (!experiments || !Array.isArray(experiments)) {
    return res.status(400).json({ success: false, message: 'Valid experiments array is required' });
  }

  try {
    const metadataResults = [];

    // Process each experiment to get metadata
    for (const experiment of experiments) {
      const { project_id, dataset_name, table_id, experiment_name, mac_address } = experiment;
      
      // Skip if missing required fields
      if (!project_id || !dataset_name || !table_id || !experiment_name) {
        console.warn('Skipping experiment with missing data:', experiment);
        continue;
      }

      console.log(`Fetching metadata for experiment: ${experiment_name} in table ${table_id}`);

      // Get time range (first and last timestamps)
      const timeRangeQuery = `
        SELECT 
          MIN(TimeStamp) as first_timestamp,
          MAX(TimeStamp) as last_timestamp
        FROM \`${project_id}.${dataset_name}.${table_id}\`
        WHERE ExperimentData_Exp_name = @experiment_name
        ${mac_address ? "AND ExperimentData_MAC_address = @mac_address" : ""}
      `;
      
      const timeRangeParams = {
        experiment_name,
        ...(mac_address && { mac_address })
      };

      const [timeRangeResults] = await bigQueryClient.query({
        query: timeRangeQuery,
        params: timeRangeParams
      });
      
      // Instead of using INFORMATION_SCHEMA, use a direct approach
      // Query for a sample row to check the schema
      const sampleRowQuery = `
        SELECT *
        FROM \`${project_id}.${dataset_name}.${table_id}\`
        WHERE ExperimentData_Exp_name = @experiment_name
        ${mac_address ? "AND ExperimentData_MAC_address = @mac_address" : ""}
        LIMIT 1
      `;
      
      const [sampleRows] = await bigQueryClient.query({
        query: sampleRowQuery,
        params: timeRangeParams
      });
      
      // Extract column names from the sample
      let availableSensors = [];
      
      if (sampleRows.length > 0) {
        const row = sampleRows[0];
        // Get all column names that start with SensorData_ and aren't null
        availableSensors = Object.keys(row)
          .filter(key => 
            key.startsWith('SensorData_') && 
            key !== 'SensorData_Name' &&
            key !== 'SensorData_Labels' &&
            key !== 'SensorData_LabelOptions' &&
            row[key] !== null
          );
      }
      
      // If no data was found in the sample, run a more comprehensive but slower query
      if (availableSensors.length === 0) {
        // Fetch all distinct sensor fields that have at least one non-null value
        const countQuery = `
          SELECT 
            column_name, 
            COUNT(1) as count
          FROM (
            SELECT 
              *
            FROM 
              \`${project_id}.${dataset_name}.${table_id}\`
            WHERE 
              ExperimentData_Exp_name = @experiment_name
              ${mac_address ? "AND ExperimentData_MAC_address = @mac_address" : ""}
            LIMIT 1000
          ) AS sample
          UNPIVOT (
            value FOR column_name IN (
              SensorData_temperature,
              SensorData_humidity,
              SensorData_light,
              SensorData_barometric_pressure,
              SensorData_barometric_temp,
              SensorData_battery,
              SensorData_rssi,
              SensorData_tmp107_amb,
              SensorData_tmp107_obj,
              SensorData_bmp_390_u18_pressure,
              SensorData_bmp_390_u18_temperature,
              SensorData_bmp_390_u19_pressure,
              SensorData_bmp_390_u19_temperature,
              SensorData_hdc_2010_u13_temperature,
              SensorData_hdc_2010_u13_humidity,
              SensorData_hdc_2010_u16_temperature,
              SensorData_hdc_2010_u16_humidity,
              SensorData_hdc_2010_u17_temperature,
              SensorData_hdc_2010_u17_humidity,
              SensorData_opt_3001_u1_light_intensity,
              SensorData_opt_3001_u2_light_intensity,
              SensorData_opt_3001_u3_light_intensity,
              SensorData_opt_3001_u4_light_intensity,
              SensorData_opt_3001_u5_light_intensity,
              SensorData_batmon_temperature,
              SensorData_batmon_battery_voltage,
              SensorData_co2_ppm,
              SensorData_air_velocity
            )
          )
          WHERE value IS NOT NULL
          GROUP BY column_name
        `;

        try {
          const [countResults] = await bigQueryClient.query({
            query: countQuery,
            params: timeRangeParams
          });
          
          availableSensors = countResults.map(row => row.column_name);
        } catch (error: any) { // Fix: Type the error as any to access its properties
          console.error(`Error in sensor count query: ${error.message || 'Unknown error'}`);
          // If UNPIVOT fails, we'll have to settle for an empty list
          availableSensors = [];
        }
      }

      // Format and add the metadata
      metadataResults.push({
        table_id,
        experiment_name,
        mac_address: mac_address || null,
        time_range: {
          first_timestamp: timeRangeResults[0]?.first_timestamp || null,
          last_timestamp: timeRangeResults[0]?.last_timestamp || null,
        },
        available_sensors: availableSensors
      });
    }

    return res.status(200).json({
      success: true,
      metadata: metadataResults
    });
  } catch (error: any) { // Fix: Type the error as any to access properties
    console.error('Error fetching experiment metadata:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch experiment metadata',
      error: error.message || 'Unknown error'
    });
  }
};