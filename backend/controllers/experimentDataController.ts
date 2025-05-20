import { Request, Response } from 'express';
import { bigQueryClient } from '../dbConfig';

/**
 * Recursively unwraps `{ value: ... }` objects to their primitive values.
 */
function unwrapValues(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(unwrapValues);
  } else if (obj && typeof obj === 'object') {
    // If the object has only one key `"value"`, return that value directly
    const keys = Object.keys(obj);
    if (keys.length === 1 && keys[0] === 'value') {
      return obj.value;
    }
    // Otherwise, process each key recursively
    const unwrapped: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        unwrapped[key] = unwrapValues(obj[key]);
      }
    }
    return unwrapped;
  }
  return obj;
}

/**
 * Fetch specific experiment data based on experiment name, time range, and selected fields.
 */
export const getExperimentData = async (req: Request, res: Response) => {
  const { project_id, dataset_name, table_id, experiment_name, time_range, fields } = req.body;

  console.log('Request body:', req.body);

  // Validate inputs
  if (
    !project_id ||
    !dataset_name ||
    !table_id ||
    !experiment_name ||
    !time_range ||
    !fields ||
    !Array.isArray(fields) ||
    fields.length === 0
  ) {
    return res.status(400).json({
      success: false,
      message:
        'Project ID, dataset name, table ID, experiment name, time range, and at least one field are required.',
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
        start: startTime,
        end: endTime,
      },
    };

    console.log('Executing query:', query);
    console.log('Query parameters:', options.params);

    // Execute the BigQuery query
    const [rows] = await bigQueryClient.query(options);

    // Unwrap each row object recursively to remove any { value: ... } wrappers
    const unwrappedRows = Array.isArray(rows) ? rows.map(row => unwrapValues(row)) : unwrapValues(rows);

    res.status(200).json({
      success: true,
      data: unwrappedRows,
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