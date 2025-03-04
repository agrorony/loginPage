import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mysql from 'mysql2';
import cors from 'cors';
import dotenv from 'dotenv';
import sourceMapSupport from 'source-map-support';
sourceMapSupport.install();

// ===== TYPE DEFINITIONS =====
/**
 * User interface defining the user data structure in the database
 * and used for type-checking database results
 */
interface User {
  id: number;          // Unique user identifier
  username: string;    // User's login name
  password: string;    // User's password (Note: should consider hashing)
  created_at: string;  // Timestamp when user was created
}

/**
 * Extends the User interface with mysql.RowDataPacket to allow
 * proper typing of database query results
 */
interface UserRow extends mysql.RowDataPacket, User {}

// ===== CONFIGURATION SETUP =====
// Load environment variables from .env file
dotenv.config();

// ===== SERVER INITIALIZATION =====
// Create Express application
const app = express();
// Create HTTP server using Express app
const httpServer = createServer(app);
// Initialize Socket.IO with CORS configuration for frontend connection
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173", // Allow connections from frontend dev server
    methods: ["GET", "POST"]         // Allow these HTTP methods
  }
});

// ===== MIDDLEWARE SETUP =====
app.use(cors());            // Enable CORS for all HTTP routes
app.use(express.json());    // Parse JSON request bodies

// ===== DATABASE CONNECTION =====
/**
 * Create MySQL database connection
 * Note: Credentials should ideally be in .env instead of hardcoded
 */
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306
});

// Establish database connection
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

// ===== SOCKET.IO EVENT HANDLERS =====
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  /**
   * Handle login attempts
   * @param data Object containing username and password
   */
  socket.on('login_attempt', (data) => {
    const { username, password } = data;
    
    // Query database for user with matching credentials
    const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
    db.query<UserRow[]>(query, [username, password], (err, results) => {
      if (err) {
        // Database error occurred
        socket.emit('login_response', { 
          success: false, 
          message: 'Database error' 
        });
        return;
      }

      if (results.length > 0) {
        // User found - login successful
        // Create user object without sensitive data (password)
        const user = {
          id: results[0].id,
          username: results[0].username,
          created_at: results[0].created_at
        };
        
        // Send success response with user data
        socket.emit('login_response', { 
          success: true, 
          message: 'Login successful',
          user
        });
      } else {
        // No matching user found - login failed
        socket.emit('login_response', { 
          success: false, 
          message: 'Invalid credentials' 
        });
      }
    });
  });

  /**
   * Handle user registration attempts
   * @param data Object containing username and password for new account
   */
  socket.on('register_attempt', (data) => {
    const { username, password } = data;
    
    // Insert new user into database
    const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
    db.query(query, [username, password], (err, result) => {
      if (err) {
        // Handle registration errors
        // Check if error is due to duplicate username
        socket.emit('register_response', { 
          success: false, 
          message: err.code === 'ER_DUP_ENTRY' ? 
            'Username already exists' : 'Registration failed' 
        });
        return;
      }

      // Registration successful
      socket.emit('register_response', { 
        success: true, 
        message: 'Registration successful' 
      });
    });
  });

  /**
   * Handle disconnect events when user closes connection
   */
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });

  /**
   * Fetch user permissions from database
   * @param userId ID of user to fetch permissions for
   */
  socket.on('get_permissions', async ({ userId }) => {
    console.log(`Fetching permissions for user ID: ${userId}`);

    try {
      // Query user permissions from database using Promise API
      const [rows] = await db.promise().query(
        "SELECT database_name, access_level FROM user_permissions WHERE user_id = ?", 
        [userId]
      );

      // Send permissions data to client
      socket.emit('permissions_response', rows);
      console.log(`Sent permissions:`, rows);
    } catch (error) {
      // Handle database query errors
      console.error('Database query error:', error);
      socket.emit('permissions_error', { message: 'Failed to fetch permissions' });
    }
  });

  // Note: This duplicate disconnect handler should be removed
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// ===== EXPRESS ROUTES =====
/**
 * Simple test endpoint to verify server is running
 */
app.get('/test', (req, res) => {
  res.json({ message: 'Backend is running!' });
});

// ===== SERVER STARTUP =====
// Get port from environment variables or use 3001 as default
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;