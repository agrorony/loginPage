import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import sourceMapSupport from 'source-map-support';
import { bigQueryClient, bigQueryConfig } from './dbConfig';

sourceMapSupport.install();
dotenv.config();

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

      // Plain text password comparison (kept as is for simplicity)
      const isMatch = password === user.hashed_password;

      if (isMatch) {
        console.log('Password matched. Constructing response for user:', user);

        // Construct a user object for the response with required id field
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
   * Gets user permissions from the BigQuery permissions table
   * For admin permissions, retrieves all tables in the dataset
   * For read permissions, only includes the specific table
   */
  socket.on('get_permissions', async (data) => {
    const { userId, email } = data;
    
    try {
      console.log('Permissions request received for user:', { userId, email });
      
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

      // Process each permission record to build a comprehensive permissions list
      let allPermissions = [];
      
      for (const permission of rows) {
        // Format the valid_until date if it exists
        let validUntil = null;
        if (permission.valid_until) {
          try {
            validUntil = typeof permission.valid_until === 'string' 
              ? permission.valid_until 
              : permission.valid_until.value || permission.valid_until.toString();
          } catch (e) {
            console.log('Error processing valid_until timestamp:', e);
          }
        }
        
        // Extract dataset and table information from table_id
        let projectId, datasetId, tableId;
        if (permission.table_id && permission.table_id.includes('.')) {
          const parts = permission.table_id.split('.');
          if (parts.length === 3) {
            [projectId, datasetId, tableId] = parts;
          }
        }
        
        // If no valid table_id or it couldn't be parsed, use defaults
        if (!datasetId) {
          datasetId = 'unknown_dataset';
        }
        if (!tableId) {
          tableId = permission.experiment || permission.mac_address || 'unknown_table';
        }
        
        // Base permission data shared between admin and read permissions
        const basePermission = {
          owner: permission.owner || 'System',
          mac_address: permission.mac_address,
          experiment: permission.experiment,
          valid_until: validUntil,
        };
        
        // Handle different roles
        if (permission.role === 'admin') {
          try {
            console.log(`User has admin permission for dataset: ${datasetId}`);
            
            // For admin role, get all tables in the dataset
            let dataset;
            try {
              dataset = bigQueryClient.dataset(datasetId);
              const [tables] = await dataset.getTables();
              
              console.log(`Found ${tables.length} tables in dataset ${datasetId}`);
              
              // Add a dataset-level admin permission
              allPermissions.push({
                ...basePermission,
                database_name: `${datasetId} (Dataset)`,
                access_level: 'admin',
                dataset_name: datasetId,
                is_dataset_level: true,
                table_count: tables.length
              });
              
              // Add individual permissions for each table in the dataset
              for (const table of tables) {
                const tableId = table.id.split('.').pop();
                allPermissions.push({
                  ...basePermission,
                  database_name: tableId,
                  access_level: 'admin', // Admin gets admin access to all tables
                  dataset_name: datasetId,
                  is_dataset_level: false
                });
              }
            } catch (e) {
              console.error(`Error retrieving tables for dataset ${datasetId}:`, e);
              
              // Still add the dataset-level permission even if we fail to list tables
              allPermissions.push({
                ...basePermission,
                database_name: datasetId,
                access_level: 'admin',
                dataset_name: datasetId,
                is_dataset_level: true,
                table_count: 0
              });
            }
          } catch (e) {
            console.error('Error processing admin permission:', e);
            
            // Add a basic permission entry if there was an error
            allPermissions.push({
              ...basePermission,
              database_name: tableId || permission.experiment || permission.mac_address || 'Unknown',
              access_level: 'admin',
              dataset_name: datasetId
            });
          }
        } else {
          // For non-admin roles (read)
          console.log(`User has read permission for table: ${tableId} in dataset: ${datasetId}`);
          
          allPermissions.push({
            ...basePermission,
            database_name: tableId || permission.experiment || permission.mac_address || 'Unknown',
            access_level: 'read',
            dataset_name: datasetId,
            is_dataset_level: false
          });
        }
      }
      
      // Format the permissions to match the expected frontend interface
      const formattedPermissions = allPermissions.map(perm => ({
        database_name: perm.database_name,
        access_level: perm.access_level,
        dataset_name: perm.dataset_name || perm.experiment || null,
        owner: perm.owner,
        valid_until: perm.valid_until,
        is_dataset_level: perm.is_dataset_level || false,
        table_count: perm.table_count
      }));

      console.log(`Sending ${formattedPermissions.length} formatted permissions`);
      socket.emit('permissions_response', formattedPermissions);
    } catch (error) {
      console.error('Error retrieving permissions:', error);
      socket.emit('permissions_response', []); // Send empty array on error
    }
  });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});