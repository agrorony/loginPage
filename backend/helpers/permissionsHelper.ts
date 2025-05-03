import { bigQueryClient } from '../dbConfig';

/**
 * Fetch and format permissions for a given email.
 * @param email The user's email to fetch permissions for.
 * @returns A promise resolving to an array of formatted permissions.
 */
export const fetchPermissions = async (email: string) => {
  console.log(`[fetchPermissions] Constructing query to fetch permissions for email: ${email}`);

  // Query BigQuery for the user permissions
  const query = `
    SELECT 
      email,
      owner,
      mac_address,
      experiment,
      role,
      valid_from,
      valid_until,
      created_at,
      table_id
    FROM \`iucc-f4d.user_device_permission.permissions\`
    WHERE email = @email
  `;

  const options = {
    query,
    params: { email },
  };

  console.log(`[fetchPermissions] Executing query: ${query} with params: ${JSON.stringify(options.params)}`);

  const [rows] = await bigQueryClient.query(options);

  console.log(`[fetchPermissions] Query executed successfully. Found ${rows.length} records for email: ${email}`);

  if (rows.length === 0) {
    console.log(`[fetchPermissions] No permissions found for email: ${email}`);
    return [];
  }

  const formattedPermissions = [];

  for (const permission of rows) {
    console.log(`[fetchPermissions] Processing permission record: ${JSON.stringify(permission)}`);

    const segments = permission.table_id.split('.');
    const projectId = segments[0];
    const datasetId = segments.length >= 2 ? segments[1] : "Unknown dataset";
    const tableId = segments.length >= 3 ? segments[2] : "";

    let validUntil = null;
    if (permission.valid_until) {
      try {
        validUntil = permission.valid_until.value;
      } catch (e) {
        console.log(`[fetchPermissions] Error processing valid_until timestamp: ${e}`);
      }
    }

    const basePermission = {
      owner: permission.owner,
      mac_address: permission.mac_address,
      experiment_name: permission.experiment,
      valid_until: validUntil,
      project_id: projectId,
      dataset_name: datasetId,
      table_id: permission.table_id,
      access_level: permission.role === 'admin' ? 'admin' : 'read',
    };

    if (permission.role === 'admin') {
      try {
        console.log(`[fetchPermissions] Fetching experiment names for table: ${tableId} in dataset: ${datasetId}`);
        const adminQuery = `
          SELECT DISTINCT ExperimentData_Exp_name
          FROM \`${projectId}.${datasetId}.${tableId}\`
        `;
        const [experiments] = await bigQueryClient.query({ query: adminQuery });

        for (const exp of experiments) {
          formattedPermissions.push({
            ...basePermission,
            experiment_name: exp.ExperimentData_Exp_name,
            is_admin: true
          });
        }
      } catch (error) {
        console.error(`[fetchPermissions] Error fetching experiment names for table ${tableId}:`, error);
        formattedPermissions.push({
          ...basePermission,
          is_admin: true
        });
      }
    } else {
      formattedPermissions.push({
        ...basePermission,
        is_admin: false
      });
    }
  }

  console.log(`[fetchPermissions] Formatted permissions: ${JSON.stringify(formattedPermissions)}`);
  return formattedPermissions;
};