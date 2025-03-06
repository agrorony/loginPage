import React, { useState, useEffect } from 'react';
import socket from '../utils/socket';

// ===== TYPE DEFINITIONS =====
/**
 * Interface defining the user data structure
 */
interface User {
  id: number;          // Maintained for backward compatibility
  username: string;    // Contains email in the new schema
  created_at: string;  // Timestamp when user was created
}

/**
 * Updated interface for user permissions to match new schema
 */
interface UserPermission {
  database_name: string;              // Maps to experiment name in new schema
  access_level: 'read' | 'admin';     // Simplified to match new schema (only read/admin)
  dataset_name?: string;              // New field from mac_address_mapping
  owner?: string;                     // Owner field from permissions table
  valid_until?: string | null;        // Expiration date for permissions
}

/**
 * Props interface for the UserDashboard component
 */
interface UserDashboardProps {
  user: User;
}

/**
 * UserDashboard component displays user information and their experiment permissions
 */
const UserDashboard: React.FC<UserDashboardProps> = ({ user }) => {
  // ===== STATE MANAGEMENT =====
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch user permissions when component mounts or user changes
   */
  useEffect(() => {
    console.log('Requesting permissions for user:', user.username);

    // Set timeout to handle potential request failures
    const timeout = setTimeout(() => {
      setLoading(false);
      setError('Request timed out. Please try again later.');
      console.error('Request timed out for user:', user.username);
    }, 10000); // 10 seconds timeout

    // Request permissions using email (username in the old schema) instead of ID
    socket.emit('get_permissions', { 
      userId: user.id,     // Keep for backward compatibility
      email: user.username // Add email for new schema (username field contains email)
    });

    // Handle server response with permissions data
    socket.on('permissions_response', (response: UserPermission[]) => {
      console.log('Received permissions response:', response);
      clearTimeout(timeout);
      setLoading(false);
      setPermissions(response);
    });

    // Handle connection errors
    socket.on('connect_error', () => {
      clearTimeout(timeout);
      setLoading(false);
      setError('Connection error. Please try again later.');
      console.error('Connection error for user:', user.username);
    });

    // Clean up event listeners and timeout when component unmounts
    return () => {
      clearTimeout(timeout);
      socket.off('permissions_response');
      socket.off('connect_error');
      console.log('Cleaned up listeners for user:', user.username);
    };
  }, [user.id, user.username]); // Run if either user ID or username changes

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
        <h2 className="text-xl font-semibold mb-4">Your Experiment Permissions</h2>
        
        {/* Map through and display each permission with additional fields */}
        {permissions.length > 0 ? (
          permissions.map((permission, index) => (
            <div 
              key={index}
              className="p-4 border rounded-lg space-y-2"
            >
              <div className="flex justify-between items-center">
                {/* Experiment name (formerly database_name) */}
                <span className="font-medium text-lg">{permission.database_name}</span>
                
                {/* Access level with color coding */}
                <span className={`px-2 py-1 rounded font-semibold ${
                  permission.access_level === 'admin' 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {permission.access_level.toUpperCase()}
                </span>
              </div>
              
              {/* Display new fields from updated schema */}
              {permission.dataset_name && (
                <div className="text-sm text-gray-600">
                  Dataset: {permission.dataset_name}
                </div>
              )}
              
              {permission.owner && (
                <div className="text-sm text-gray-600">
                  Owner: {permission.owner}
                </div>
              )}
              
              {/* Show expiration date if available */}
              {permission.valid_until && (
                <div className="text-sm text-orange-600">
                  Expires: {new Date(permission.valid_until).toLocaleDateString()}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="p-4 border rounded-lg text-center text-gray-500">
            You don't have access to any experiments yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;