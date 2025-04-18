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

        // Construct a user object for the response
        const userResponse = {
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
   */
  socket.on('get_permissions', async (data) => {
    const { email } = data;
    
    try {
      console.log('Permissions request received for email:', email);
      
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

      console.log('Executing permissions query:', query, 'with params:', options.params);

      const [rows] = await bigQueryClient.query(options);
      
      console.log('Permissions query result:', rows);
      
      if (rows.length === 0) {
        console.log('No permissions found for email:', email);
        socket.emit('permissions_response', []);
        return;
      }

      // Transform permissions data to match the frontend's expected format
      // Handle BigQuery timestamps properly
      const formattedPermissions = rows.map(permission => {
        // Safe conversion of BigQuery timestamps to string
        let validUntil = null;
        if (permission.valid_until) {
          try {
            validUntil = permission.valid_until.value;
          } catch (e) {
            console.log('Error processing valid_until timestamp:', e);
          }
        }

        return {
          database_name: permission.experiment || permission.mac_address,
          access_level: permission.role === 'admin' ? 'admin' : 'read',
          dataset_name: permission.experiment,
          owner: permission.owner,
          valid_until: validUntil,
          mac_address: permission.mac_address,
          table_id: permission.table_id
        };
      });

      console.log('Formatted permissions:', formattedPermissions);
      
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