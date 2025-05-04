import { Request, Response } from 'express';
import { bigQueryClient } from '../dbConfig';

/**
 * Fetch specific experiment data based on experiment name, time range, and selected fields.
 */
export const getExperimentData = async (req: Request, res: Response) => {
  const { project_id, dataset_name, table_id, experiment_name, time_range, fields } = req.body;

  // Validate inputs
  if (!project_id || !dataset_name || !table_id || !experiment_name || !time_range || !fields || !Array.isArray(fields) || fields.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Project ID, dataset name, table ID, experiment name, time range, and at least one field are required.',
    });
  }

  const { start, end } = time_range;
  if (!start || !end) {
    return res.status(400).json({
      success: false,
      message: 'Both start and end times are required in the time range.',
    });
  }

  try {
    // Construct the SQL query
    const query = `
      SELECT TimeStamp, ${fields.join(', ')}
      FROM \`${project_id}.${dataset_name}.${table_id}\`
      WHERE ExperimentData_Exp_name = @experiment_name
        AND TimeStamp BETWEEN @start AND @end
    `;
    const options = {
      query,
      params: {
        experiment_name,
        start,
        end,
      },
    };

    console.log('Executing query:', query, 'with params:', options.params);

    // Execute the BigQuery query
    const [rows] = await bigQueryClient.query(options);

    res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error: any) {
    console.error('Error fetching experiment data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch experiment data.',
      error: error.message || 'Unknown error',
    });
  }
};