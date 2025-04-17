import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import sourceMapSupport from 'source-map-support';
import bcrypt from 'bcryptjs'; // Use for password hashing
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
      // Query BigQuery for the user by email (username)
      const query = `
        SELECT email, hashed_password
        FROM \`${bigQueryConfig.dataset}.${bigQueryConfig.userTable}\`
        WHERE email = @username
      `;
      const options = {
        query,
        params: { username },
      };

      const [rows] = await bigQueryClient.query(options);

      if (rows.length === 0) {
        socket.emit('login_response', { success: false, message: 'User not found' });
        return;
      }

      const user = rows[0];

      // Compare the provided password with the stored hash
      const isMatch = await bcrypt.compare(password, user.hashed_password);

      if (isMatch) {
        socket.emit('login_response', { success: true, message: 'Login successful' });
      } else {
        socket.emit('login_response', { success: false, message: 'Invalid password' });
      }
    } catch (error) {
      console.error('Error during login:', error);
      socket.emit('login_response', { success: false, message: 'Internal server error' });
    }
  });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});