import React, { useState, useEffect } from 'react';
import socket from '../utils/socket';

// ===== TYPE DEFINITIONS =====
/**
 * Interface defining the user data structure
 */
interface User {
  id: number;          // Unique user identifier
  username: string;    // User's login name
  created_at: string;  // Timestamp when user was created
}

/**
 * Interface defining the structure of user permission data
 */
interface UserPermission {
  database_name: string;                      // Name of database the user has access to
  access_level: 'read' | 'write' | 'admin';   // Permission level (restricted to these 3 values)
}

/**
 * Props interface for the UserDashboard component
 */
interface UserDashboardProps {
  user: User;  // User object containing id, username, and created_at
}

/**
 * UserDashboard component displays user information and their database permissions
 */
const UserDashboard: React.FC<UserDashboardProps> = ({ user }) => {
  // ===== STATE MANAGEMENT =====
  const [permissions, setPermissions] = useState<UserPermission[]>([]);  // Store user permissions
  const [loading, setLoading] = useState(true);                          // Track loading state
  const [error, setError] = useState<string | null>(null);               // Store error messages

  /**
   * Fetch user permissions when component mounts or user ID changes
   */
  useEffect(() => {
    console.log('Requesting permissions for user:', user.id);

    // Set timeout to handle potential request failures
    const timeout = setTimeout(() => {
      setLoading(false);
      setError('Request timed out. Please try again later.');
      console.error('Request timed out for user:', user.id);
    }, 10000); // 10 seconds timeout

    // Request permissions for the current user from server
    socket.emit('get_permissions', { userId: user.id });

    // Handle server response with permissions data
    socket.on('permissions_response', (response: UserPermission[]) => {
      console.log('Received permissions response for user:', user.id, response);
      clearTimeout(timeout);   // Clear timeout as response was received
      setLoading(false);       // Update loading state
      setPermissions(response); // Store permissions data
      console.log('Received permissions for user:', user.id, response);
    });

    // Handle connection errors
    socket.on('connect_error', () => {
      clearTimeout(timeout);   // Clear timeout as error was received
      setLoading(false);       // Update loading state
      setError('Connection error. Please try again later.');
      console.error('Connection error for user:', user.id);
    });

    // Clean up event listeners and timeout when component unmounts
    return () => {
      clearTimeout(timeout);
      socket.off('permissions_response');
      socket.off('connect_error');
      console.log('Cleaned up listeners for user:', user.id);
    };
  }, [user.id]); // Dependency array - re-run if user.id changes

  // Show loading indicator while fetching permissions
  if (loading) return <div>Loading...</div>;
  
  // Show error message if fetching permissions failed
  if (error) return <div>{error}</div>;

  // ===== COMPONENT RENDERING =====
  return (
    <div className="max-w-2xl mx-auto p-4 bg-white rounded-lg shadow-lg">
      {/* User Information Header */}
      <div className="border-b pb-4 mb-4">
        <h1 className="text-2xl font-bold">Welcome, {user.username}!</h1>
        <p className="text-gray-600">Account created: {new Date(user.created_at).toLocaleDateString()}</p>
      </div>

      {/* Permissions Display Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold mb-4">Your Database Permissions</h2>
        
        {/* Map through and display each permission */}
        {permissions.map((permission, index) => (
          <div 
            key={index}
            className="p-4 border rounded-lg flex justify-between items-center"
          >
            {/* Database name */}
            <span className="font-medium">{permission.database_name}</span>
            
            {/* Access level with color coding based on permission type */}
            <span className={`font-semibold ${
              // Dynamic color based on access level
              permission.access_level === 'read' ? 'text-blue-600' :
              permission.access_level === 'write' ? 'text-green-600' :
              'text-purple-600' // For 'admin'
            }`}>
              {permission.access_level.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserDashboard;