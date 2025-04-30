import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import sourceMapSupport from 'source-map-support';
import { bigQueryClient, bigQueryConfig } from './dbConfig';
import { handleGetPermissions } from './permissionsHandler';
import experimentRoutes from './routes/experimentRoutes';

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

  // Delegate permissions handling to permissionsHandler
  handleGetPermissions(socket);
});

// ===== REGISTER ROUTES =====
// Register the `/api/experiments` route
app.use('/api', experimentRoutes);

// ===== START SERVER =====
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});