import { bigQueryClient } from './dbConfig';

/**
 * Handle permissions request
 * Gets user permissions from the BigQuery permissions table.
 */
export const handleGetPermissions = (socket: any) => {
  socket.on('get_permissions', async (data: { email: string }) => {
    const { email } = data;

    console.log(`[get_permissions] Received request with email: ${email}`);

    try {
      console.log(`[get_permissions] Constructing query to fetch permissions for email: ${email}`);

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

      console.log(`[get_permissions] Executing query: ${query} with params: ${JSON.stringify(options.params)}`);

      const [rows] = await bigQueryClient.query(options);

      console.log(`[get_permissions] Query executed successfully. Found ${rows.length} records for email: ${email}`);

      if (rows.length === 0) {
        console.log(`[get_permissions] No permissions found for email: ${email}`);
        socket.emit('permissions_response', []);
        return;
      }

      // Process each permission record
      const formattedPermissions = [];

      for (const permission of rows) {
        console.log(`[get_permissions] Processing permission record: ${JSON.stringify(permission)}`);

        // Extract project, dataset, and table from table_id
        const segments = permission.table_id.split('.');
        const projectId = segments[0];
        const datasetId = segments.length >= 2 ? segments[1] : "Unknown dataset";
        const tableId = segments.length >= 3 ? segments[2] : "";

        console.log(`[get_permissions] Extracted IDs - projectId: ${projectId}, datasetId: ${datasetId}, tableId: ${tableId}`);

        // Handle timestamp values safely
        let validUntil = null;
        if (permission.valid_until) {
          try {
            validUntil = permission.valid_until.value;
          } catch (e) {
            console.log(`[get_permissions] Error processing valid_until timestamp: ${e}`);
          }
        }

        // Create a consistent base permission object
        const basePermission = {
          owner: permission.owner,
          mac_address: permission.mac_address,
          experiment_name: permission.experiment, // Renamed for clarity
          role: permission.role,
          valid_until: validUntil,
          project_id: projectId,
          dataset_name: datasetId,
          table_id: permission.table_id,
          access_level: permission.role === 'admin' ? 'admin' : 'read', // Simplified access level
        };

        console.log(`[get_permissions] Base permission object: ${JSON.stringify(basePermission)}`);

        // If admin role, query experiment names
        if (permission.role === 'admin') {
          try {
            console.log(`[get_permissions] Fetching experiment names for table: ${tableId} in dataset: ${datasetId}`);
            const adminQuery = `
              SELECT DISTINCT ExperimentData_Exp_name
              FROM \`${projectId}.${datasetId}.${tableId}\`
            `;
            const [experiments] = await bigQueryClient.query({ query: adminQuery });

            console.log(`[get_permissions] Found ${experiments.length} experiments in table ${tableId}`);

            // For admin users, we'll expand each experiment into a separate permission entry
            // This makes the frontend processing simpler
            for (const exp of experiments) {
              formattedPermissions.push({
                ...basePermission,
                experiment_name: exp.ExperimentData_Exp_name,
                is_admin: true
              });
            }
          } catch (error) {
            console.error(`[get_permissions] Error fetching experiment names for table ${tableId}:`, error);

            // Add the permission without experiment information
            formattedPermissions.push({
              ...basePermission,
              is_admin: true
            });
          }
        } else {
          // For read permissions, add the table-level permission
          formattedPermissions.push({
            ...basePermission,
            is_admin: false
          });
        }
      }

      console.log(`[get_permissions] Sending formatted permissions: ${JSON.stringify(formattedPermissions)}`);
      socket.emit('permissions_response', formattedPermissions);
    } catch (error) {
      console.error(`[get_permissions] Error retrieving permissions:`, error);
      socket.emit('permissions_response', []); // Send empty array on error
    }
  });
};