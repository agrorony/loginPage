import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mysql from 'mysql2';
import cors from 'cors';
import dotenv from 'dotenv';
import sourceMapSupport from 'source-map-support';
//import bcrypt from 'bcrypt';  // Add this for password hashing
sourceMapSupport.install();

// ===== TYPE DEFINITIONS =====
/**
 * User interface defining the user data structure in the database
 */
interface User {
  email: string;          // User's email (primary key)
  hashed_password: string; // User's hashed password
  created_at: string;     // Timestamp when user was created
  last_login: string | null; // Timestamp of last login
}

/**
 * Permission interface defining the permission structure
 */
interface Permission {
  permission_id: number;
  email: string;
  owner: string;
  mac_address: string;
  experiment: string;
  is_admin: boolean;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
}

/**
 * Extends interfaces with mysql.RowDataPacket for query typing
 */
interface UserRow extends mysql.RowDataPacket, User {}
interface PermissionRow extends mysql.RowDataPacket, Permission {}

// ===== CONFIGURATION SETUP =====
dotenv.config();

// ===== SERVER INITIALIZATION =====
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// ===== MIDDLEWARE SETUP =====
app.use(cors());
app.use(express.json());

// ===== DATABASE CONNECTION =====
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'research_permissions',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306
});

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
   */
  socket.on('login_attempt', async (data) => {
    const { username, password } = data;
    
    // Query database for user with matching email (username field maps to email)
    const query = 'SELECT * FROM users WHERE email = ?';
    
    try {
      const [results] = await db.promise().query<UserRow[]>(query, [username]);
      
      if (results.length > 0) {
        const user = results[0];
        
        // Compare the provided password with the stored hash
        // Note: If your passwords aren't hashed yet, you'll need to implement a transition plan
        // You might need to directly compare passwords during transition: user.hashed_password === password
        const isMatch = user.hashed_password === password; // Eventually replace with bcrypt.compare(password, user.hashed_password)
        
        if (isMatch) {
          // Password matches - update last login time
          await db.promise().query('UPDATE users SET last_login = NOW() WHERE email = ?', [username]);
          
          // Fetch user permissions
          const permissionQuery = `
            SELECT p.*, m.dataset_name, m.description 
            FROM permissions p
            LEFT JOIN mac_address_mapping m ON p.mac_address = m.mac_address
            WHERE p.email = ? AND (p.valid_until IS NULL OR p.valid_until > NOW())
          `;
          
          const [permissions] = await db.promise().query<PermissionRow[]>(permissionQuery, [username]);
          
          // Format permissions for frontend compatibility
          const formattedPermissions = permissions.map(p => ({
            database_name: p.experiment,  // Map experiment to database_name for backward compatibility
            access_level: p.is_admin ? 'admin' : 'read'  // Map is_admin boolean to access_level string
          }));
          
          // Send success response with user data
          socket.emit('login_response', { 
            success: true, 
            message: 'Login successful',
            user: {
              id: 1,  // A placeholder ID for backward compatibility
              username: user.email,
              created_at: user.created_at,
              permissions: formattedPermissions
            }
          });
        } else {
          // Password doesn't match
          socket.emit('login_response', { 
            success: false, 
            message: 'Invalid credentials' 
          });
        }
      } else {
        // No user found
        socket.emit('login_response', { 
          success: false, 
          message: 'Invalid credentials' 
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      socket.emit('login_response', { 
        success: false, 
        message: 'Database error' 
      });
    }
  });

  /**
   * Handle user registration
   */
  socket.on('register_attempt', async (data) => {
    const { username, password } = data;
    
    try {
      // Check if user already exists
      const [existingUsers] = await db.promise().query<UserRow[]>(
        'SELECT * FROM users WHERE email = ?', 
        [username]
      );
      
      if (existingUsers.length > 0) {
        socket.emit('register_response', { 
          success: false, 
          message: 'Email already exists' 
        });
        return;
      }
      
      // Insert new user
      // Note: Eventually use bcrypt for password hashing: bcrypt.hashSync(password, 10)
      await db.promise().query(
        'INSERT INTO users (email, hashed_password) VALUES (?, ?)',
        [username, password]  // Eventually replace password with hashed version
      );
      
      socket.emit('register_response', { 
        success: true, 
        message: 'Registration successful' 
      });
    } catch (error) {
      console.error('Registration error:', error);
      socket.emit('register_response', { 
        success: false, 
        message: 'Registration failed' 
      });
    }
  });

  /**
   * Fetch user permissions
   */
  socket.on('get_permissions', async ({ userId, email }) => {
    // In the new schema, we use email instead of user_id
    const userEmail = email || userId; // Support both for backward compatibility
    
    try {
      const permissionQuery = `
        SELECT p.experiment AS database_name, 
               CASE WHEN p.is_admin THEN 'admin' ELSE 'read' END AS access_level,
               m.dataset_name, m.owner, p.valid_until
        FROM permissions p
        LEFT JOIN mac_address_mapping m ON p.mac_address = m.mac_address
        WHERE p.email = ? AND (p.valid_until IS NULL OR p.valid_until > NOW())
      `;
      
      const [permissions] = await db.promise().query(permissionQuery, [userEmail]);
      
      socket.emit('permissions_response', permissions);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      socket.emit('permissions_error', { message: 'Failed to fetch permissions' });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// ===== EXPRESS ROUTES =====
app.get('/test', (req, res) => {
  res.json({ message: 'Backend is running with the new database schema!' });
});

// ===== SERVER STARTUP =====
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;