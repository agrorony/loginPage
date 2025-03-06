import React, { useState, useEffect } from 'react';
import socket from '../utils/socket';

// ===== TYPE DEFINITIONS =====
/**
 * Updated interface for login response
 */
interface LoginResponse {
  success: boolean;
  message: string;
  user?: {
    id: number;                      // For backward compatibility
    username: string;                // Actually contains email
    created_at: string;
    permissions?: UserPermission[];
  };
}

/**
 * Updated permission interface that works with new schema
 */
interface UserPermission {
  database_name: string;                     // Maps to experiment name
  access_level: 'read' | 'admin';            // Simplified from the new schema
  dataset_name?: string;                     // New field from mac_address_mapping
  owner?: string;                            // New field from permissions table
  valid_until?: string;                      // Expiration date
}

interface RegisterResponse {
  success: boolean;
  message: string;
}

interface LoginProps {
  onLoginSuccess: (userData: { id: number; username: string; created_at: string }) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  // Same state management as before
  const [isConnected, setIsConnected] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');
    });

    socket.on('login_response', (response: LoginResponse) => {
      console.log('Login response received:', response);
      setMessage(response.message);
      
      if (response.success && response.user) {
        console.log('Login successful, user data:', response.user);
        
        // Log permissions if available
        if (response.user.permissions) {
          console.log('User permissions:', response.user.permissions);
        }
        
        onLoginSuccess(response.user);
      }
    });

    socket.on('register_response', (response: RegisterResponse) => {
      setMessage(response.message);
      
      if (response.success) {
        setIsRegistering(false);
      }
    });

    return () => {
      socket.off('connect');
      socket.off('login_response');
      socket.off('register_response');
    };
  }, [onLoginSuccess]);

  // No changes needed to handleSubmit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Attempting', isRegistering ? 'registration' : 'login', 'with:', username);
    
    if (isRegistering) {
      socket.emit('register_attempt', { username, password });
    } else {
      socket.emit('login_attempt', { username, password });
    }
  };

  // Same UI as before
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {isRegistering ? 'Register' : 'Login'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              required
            />
          </div>
          
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

          {message && (
            <div className={`text-sm ${message.includes('successful') ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white rounded-md py-2 hover:bg-blue-700"
          >
            {isRegistering ? 'Register' : 'Login'}
          </button>
        </form>

        <button
          onClick={() => setIsRegistering(!isRegistering)}
          className="w-full mt-4 text-sm text-blue-600 hover:text-blue-800"
        >
          {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
        </button>

        <div className="mt-4 text-sm text-gray-500 text-center">
          Connection status: {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>
    </div>
  );
};

export default Login;