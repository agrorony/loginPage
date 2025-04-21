import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import sourceMapSupport from 'source-map-support';
import { bigQueryClient, bigQueryConfig } from './dbConfig';

sourceMapSupport.install();
dotenv.config();

// Define consistent TypeScript interface for permissions response.
interface UserPermission {
  database_name: string;
  access_level: 'read' | 'admin';
  dataset_name: string;
  owner: string;
  valid_until: string; // Use empty string if no valid date.
  is_dataset_level: boolean;
  table_count?: number;
}

// ===== SERVER INITIALIZATION =====
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// ===== MIDDLEWARE SETUP =====
app.use(cors());
app.use(express.json());

// ===== SOCKET.IO EVENT HANDLERS =====
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  /**
   * Handle login attempts
   */
  socket.on('login_attempt', async (data) => {
    const { username, password } = data;

    try {
      console.log('Login attempt received:', { username });

      // Query BigQuery for the user by email (username)
      const query = `
        SELECT email, hashed_password, created_at
        FROM \`${bigQueryConfig.dataset}.${bigQueryConfig.userTable}\`
        WHERE email = @username
      `;
      const options = {
        query,
        params: { username },
      };

      console.log('Executing query:', query, 'with params:', options.params);
      const [rows] = await bigQueryClient.query(options);
      console.log('Query result:', rows);

      if (rows.length === 0) {
        console.log('No user found for email:', username);
        socket.emit('login_response', { success: false, message: 'User not found' });
        return;
      }

      const user = rows[0];
      const isMatch = password === user.hashed_password;
      if (isMatch) {
        console.log('Password matched. Constructing response for user:', user);
        const userResponse = {
          id: 1, // Adding a default ID since it's required by the frontend
          username: user.email,
          created_at: user.created_at,
        };
        socket.emit('login_response', {
          success: true,
          message: 'Login successful',
          user: userResponse,
        });
      } else {
        console.log('Invalid password for user:', username);
        socket.emit('login_response', { success: false, message: 'Invalid password' });
      }
    } catch (error) {
      console.error('Error during login:', error);
      socket.emit('login_response', { success: false, message: 'Internal server error' });
    }
  });

  /**
   * Handle permissions request
   * If the user has admin permission on a table,
   * query for all tables in that dataset and produce permission entries accordingly.
   */
  socket.on('get_permissions', async (data) => {
    const { userId, email } = data;
    try {
      console.log('Permissions request received for user:', { userId, email });
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
        FROM \`${bigQueryConfig.projectId}.user_device_permission.permissions\`
        WHERE email = @email
      `;
      const options = {
        query,
        params: { email },
      };

      console.log('Executing permissions query with params:', { email });
      const [rows] = await bigQueryClient.query(options);
      console.log(`Found ${rows.length} permission records for user:`, email);

      if (rows.length === 0) {
        console.log('No permissions found for email:', email);
        socket.emit('permissions_response', []);
        return;
      }

      const allPermissions: UserPermission[] = [];

      for (const permission of rows) {
        // Process valid_until to ensure string.
        let validUntil: string = "";
        if (permission.valid_until) {
          try {
            validUntil =
              typeof permission.valid_until === 'string'
                ? permission.valid_until
                : permission.valid_until.value || permission.valid_until.toString();
          } catch (e) {
            console.log('Error processing valid_until timestamp:', e);
          }
        }

        // Extract dataset and table information from table_id.
        let datasetId: string = "unknown_dataset";
        let tableId: string = "unknown_table";
        if (permission.table_id && permission.table_id.includes('.')) {
          const parts = permission.table_id.split('.');
          if (parts.length === 3) {
            // parts[0] = project, parts[1] = dataset, parts[2] = table
            datasetId = parts[1] || datasetId;
            tableId = parts[2] || tableId;
          }
        } else {
          tableId = permission.experiment || permission.mac_address || "unknown_table";
        }

        // Base permission data shared for both roles.
        const basePermissionData = {
          owner: permission.owner ? permission.owner : "System",
          valid_until: validUntil,
          dataset_name: permission.experiment ? permission.experiment : datasetId,
          is_dataset_level: false,
        };

        // Process based on role.
        if (permission.role === 'admin') {
          console.log(`User has admin permission for dataset: ${datasetId}`);
          try {
            const dataset = bigQueryClient.dataset(datasetId);
            const [tables] = await dataset.getTables();
            console.log(`Found ${tables.length} tables in dataset ${datasetId}`);

            // Dataset-level admin entry.
            allPermissions.push({
              ...basePermissionData,
              database_name: `${datasetId} (Dataset)`,
              access_level: 'admin',
              is_dataset_level: true,
              table_count: tables.length,
            });

            // Permissions for each table in dataset.
            for (const table of tables) {
              const tableName = table.id ? table.id.split('.').pop() || "unknown_table" : "unknown_table";
              allPermissions.push({
                ...basePermissionData,
                database_name: tableName,
                access_level: 'admin',
                is_dataset_level: false,
              });
            }
          } catch (e) {
            console.error(`Error retrieving tables for dataset ${datasetId}:`, e);
            // Fallback entry if table listing fails.
            allPermissions.push({
              ...basePermissionData,
              database_name: datasetId,
              access_level: 'admin',
              is_dataset_level: true,
              table_count: 0,
            });
          }
        } else {
          console.log(`User has read permission for table: ${tableId} in dataset: ${datasetId}`);
          allPermissions.push({
            ...basePermissionData,
            database_name: tableId,
            access_level: 'read',
            is_dataset_level: false,
          });
        }
      }

      console.log(`Sending ${allPermissions.length} formatted permissions`);
      socket.emit('permissions_response', allPermissions);
    } catch (error) {
      console.error('Error retrieving permissions:', error);
      socket.emit('permissions_response', []);
    }
  });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});