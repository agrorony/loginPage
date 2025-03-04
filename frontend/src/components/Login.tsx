import React, { useState, useEffect } from 'react';
import socket from '../utils/socket';

// ===== TYPE DEFINITIONS =====
/**
 * Interface for login response data received from the server
 */
interface LoginResponse {
  success: boolean;                  // Whether login was successful
  message: string;                   // Status message from server
  user?: {                           // Optional user data (only present on success)
    id: number;                      // User ID
    username: string;                // Username
    created_at: string;              // Account creation timestamp
    permissions?: UserPermission[];  // Optional array of user permissions
  };
}

/**
 * Interface defining user permission structure
 */
interface UserPermission {
  database_name: string;                        // Name of database user has access to
  access_level: 'read' | 'write' | 'admin';     // Permission level (limited to these 3 options)
}

/**
 * Interface for registration response data
 */
interface RegisterResponse {
  success: boolean;    // Whether registration was successful
  message: string;     // Status message from server
}

/**
 * Props interface for the Login component
 */
interface LoginProps {
  // Callback function to pass user data to parent component on successful login
  onLoginSuccess: (userData: { id: number; username: string; created_at: string }) => void;
}

/**
 * Login component that handles both user login and registration
 */
const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  // ===== STATE MANAGEMENT =====
  const [isConnected, setIsConnected] = useState(false);       // Track socket connection status
  const [username, setUsername] = useState('');                // Username input field
  const [password, setPassword] = useState('');                // Password input field
  const [message, setMessage] = useState('');                  // Status/error message to display
  const [isRegistering, setIsRegistering] = useState(false);   // Toggle between login/register modes

  /**
   * Set up socket event listeners on component mount
   */
  useEffect(() => {
    // Listen for connection to server
    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');
    });

    // Handle login response from server
    socket.on('login_response', (response: LoginResponse) => {
      console.log('Login response received:', response);
      setMessage(response.message);
      
      // If login successful and user data exists, call the success callback
      if (response.success && response.user) {
        console.log('Login successful, user data:', response.user);
        onLoginSuccess(response.user);
      }
    });

    // Handle registration response from server
    socket.on('register_response', (response: RegisterResponse) => {
      setMessage(response.message);
      
      // If registration successful, switch back to login mode
      if (response.success) {
        setIsRegistering(false);
      }
    });

    // Clean up event listeners on component unmount
    return () => {
      socket.off('connect');
      socket.off('login_response');
      socket.off('register_response');
    };
  }, [onLoginSuccess]); // Dependency array with callback to prevent unnecessary re-renders

  /**
   * Handle form submission for both login and registration
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission behavior
    
    console.log('Attempting', isRegistering ? 'registration' : 'login', 'with:', username);
    
    // Emit the appropriate socket event based on current mode
    if (isRegistering) {
      socket.emit('register_attempt', { username, password });
    } else {
      socket.emit('login_attempt', { username, password });
    }
  };

  // ===== COMPONENT RENDERING =====
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        {/* Form title that changes based on current mode */}
        <h2 className="text-2xl font-bold mb-6 text-center">
          {isRegistering ? 'Register' : 'Login'}
        </h2>
        
        {/* Login/Registration form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username field */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              required
            />
          </div>
          
          {/* Password field */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              required
            />
          </div>

          {/* Status/error message display */}
          {message && (
            <div className={`text-sm ${message.includes('successful') ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </div>
          )}

          {/* Submit button that changes text based on current mode */}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white rounded-md py-2 hover:bg-blue-700"
          >
            {isRegistering ? 'Register' : 'Login'}
          </button>
        </form>

        {/* Toggle button to switch between login and registration modes */}
        <button
          onClick={() => setIsRegistering(!isRegistering)}
          className="w-full mt-4 text-sm text-blue-600 hover:text-blue-800"
        >
          {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
        </button>

        {/* Connection status indicator */}
        <div className="mt-4 text-sm text-gray-500 text-center">
          Connection status: {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>
    </div>
  );
};

export default Login;