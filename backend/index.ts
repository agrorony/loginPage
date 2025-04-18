import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import sourceMapSupport from 'source-map-support';
import { bigQueryClient } from './dbConfig'; // Ensure this is correctly configured

sourceMapSupport.install();
dotenv.config();

// ===== TYPE DEFINITIONS =====
interface DatasetTable {
  project_id: string;
  dataset_id: string;
  table_name: string;
  table_type: string;
  is_insertable_into: boolean;
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
   * Handle request to get permissions and tables
   */
  socket.on('get_permissions', async (data) => {
    const { email } = data;

    try {
      console.log('Permissions request received for email:', email);

      // Step 1: Query to fetch all datasets where the user has admin role
      const permissionsQuery = `
        SELECT DISTINCT
          REGEXP_EXTRACT(table_id, r'^(.*)\\.(.*)\\..*$') AS project_id,
          REGEXP_EXTRACT(table_id, r'^.*\\.(.*)\\..*$') AS dataset_id
        FROM
          \`iucc-f4d.user_device_permission.permissions\`
        WHERE
          email = @adminEmail
          AND role = 'admin'
      `;

      console.log('Executing permissions query:', permissionsQuery);

      const [datasets] = await bigQueryClient.query({
        query: permissionsQuery,
        params: { adminEmail: email },
      });

      console.log(`Found ${datasets.length} datasets with admin permissions for user:`, datasets);

      if (datasets.length === 0) {
        socket.emit('permissions_response', {
          success: true,
          message: 'No datasets found with admin permissions',
          tables: [],
        });
        return;
      }

      // Step 2: Fetch tables for each dataset
      const tables: DatasetTable[] = []; // Explicitly typed as an array of DatasetTable
      for (const dataset of datasets) {
        const { project_id, dataset_id } = dataset;

        const tablesQuery = `
          SELECT
            table_catalog,
            table_schema,
            table_name,
            table_type,
            is_insertable_into
          FROM
            \`${project_id}.${dataset_id}.INFORMATION_SCHEMA.TABLES\`
        `;

        console.log(`Executing tables query for dataset: ${dataset_id} in project: ${project_id}`);

        try {
          const [datasetTables] = await bigQueryClient.query({ query: tablesQuery });

          datasetTables.forEach((table) => {
            tables.push({
              project_id,
              dataset_id,
              table_name: table.table_name,
              table_type: table.table_type,
              is_insertable_into: table.is_insertable_into,
            });
          });
        } catch (error) {
          console.error(`Error fetching tables for dataset ${dataset_id} in project ${project_id}:`, error);
        }
      }

      console.log(`Total tables fetched: ${tables.length}`);

      // Step 3: Emit the response back to the client
      socket.emit('permissions_response', {
        success: true,
        message: 'Tables fetched successfully',
        tables,
      });
    } catch (error) {
      console.error('Error retrieving permissions or tables:', error);
      socket.emit('permissions_response', {
        success: false,
        message: 'Failed to fetch tables',
        tables: [],
      });
    }
  });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});