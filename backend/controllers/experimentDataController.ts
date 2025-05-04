import { Request, Response } from 'express';
import { bigQueryClient } from '../dbConfig';

/**
 * Fetch specific experiment data based on experiment name, time range, and selected fields.
 */
export const getExperimentData = async (req: Request, res: Response) => {
  const { project_id, dataset_name, table_id, experiment_name, time_range, fields } = req.body;

  console.log('Request body:', req.body);

  // Validate inputs
  if (!project_id || !dataset_name || !table_id || !experiment_name || !time_range || !fields || !Array.isArray(fields) || fields.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Project ID, dataset name, table ID, experiment name, time range, and at least one field are required.',
    });
  }

  const { start, end } = time_range;

  // Unwrap the `value` field from start and end if they are objects
  const startTime = typeof start === 'object' && 'value' in start ? start.value : start;
  const endTime = typeof end === 'object' && 'value' in end ? end.value : end;

  if (!startTime || !endTime) {
    return res.status(400).json({
      success: false,
      message: 'Both start and end times are required in the time range.',
    });
  }

  try {
    // Extract the actual table ID without project and dataset if it includes them
    let actualTableId = table_id;
    if (table_id.includes('.')) {
      // If table_id includes dots, it might contain project.dataset.table format
      // Extract just the last part which is the actual table ID
      const parts = table_id.split('.');
      actualTableId = parts[parts.length - 1];
    }
    
    // Construct the SQL query with the correct table reference
    const query = `
      SELECT TimeStamp, ${fields.join(', ')}
      FROM \`${project_id}.${dataset_name}.${actualTableId}\`
      WHERE ExperimentData_Exp_name = @experiment_name
        AND TimeStamp BETWEEN @start AND @end
    `;
    
    const options = {
      query,
      params: {
        experiment_name,
        start: startTime, // Pass the unwrapped timestamp directly
        end: endTime,     // Pass the unwrapped timestamp directly
      },
    };

    console.log('Executing query:', query);
    console.log('Query parameters:', options.params);

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