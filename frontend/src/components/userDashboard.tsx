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
 * UserDashboard component displays user information and their experiment permissions as a tree of buttons
 */
const UserDashboard: React.FC<UserDashboardProps> = ({ user }) => {
  // ===== STATE MANAGEMENT =====
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPermission, setSelectedPermission] = useState<UserPermission | null>(null);
  
  // Group permissions by owner for tree organization
  const groupedPermissions = permissions.reduce<Record<string, UserPermission[]>>((groups, permission) => {
    // Use 'Unknown' as the owner if not provided
    const owner = permission.owner || 'Unknown';
    if (!groups[owner]) {
      groups[owner] = [];
    }
    groups[owner].push(permission);
    return groups;
  }, {});

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

  /**
   * Handle selection of an experiment permission
   */
  const handlePermissionSelect = (permission: UserPermission) => {
    setSelectedPermission(permission);
    // Here you would typically trigger data loading or navigation based on the selected experiment
    console.log('Selected experiment:', permission.database_name);
    // This is where you could emit a Socket.IO event to request experiment data
    // socket.emit('get_experiment_data', { experiment: permission.database_name });
  };

  // Show loading indicator while fetching permissions
  if (loading) return <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>;
  
  // Show error message if fetching permissions failed
  if (error) return <div className="text-red-500 text-center p-4 border border-red-300 rounded bg-red-50">
    <p className="font-bold">Error</p>
    <p>{error}</p>
  </div>;

  // ===== COMPONENT RENDERING =====
  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* User Information Header */}
      <div className="border-b pb-4 mb-6">
        <h1 className="text-2xl font-bold">Welcome, {user.username}!</h1>
        <p className="text-gray-600">Account created: {new Date(user.created_at).toLocaleDateString()}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Sidebar - Permission Tree */}
        <div className="w-full md:w-1/3 lg:w-1/4 bg-gray-50 p-4 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Your Experiments</h2>
          
          {permissions.length > 0 ? (
            <div className="space-y-4">
              {/* Render tree structure grouped by owners */}
              {Object.entries(groupedPermissions).map(([owner, perms]) => (
                <div key={owner} className="space-y-2">
                  {/* Owner Section Header */}
                  <div className="font-medium text-gray-700 pb-1 border-b">
                    {owner}
                  </div>
                  
                  {/* Experiment Buttons */}
                  <div className="pl-2 space-y-1">
                    {perms.map((permission, index) => (
                      <button
                        key={`${permission.database_name}-${index}`}
                        onClick={() => handlePermissionSelect(permission)}
                        className={`w-full text-left px-3 py-2 rounded-md transition ${
                          selectedPermission?.database_name === permission.database_name
                            ? 'bg-blue-100 text-blue-800 font-medium'
                            : 'hover:bg-gray-200'
                        }`}
                      >
                        <div className="flex items-center">
                          <span className="flex-grow truncate">{permission.database_name}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            permission.access_level === 'admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {permission.access_level}
                          </span>
                        </div>
                        {/* Dataset name if available */}
                        {permission.dataset_name && (
                          <div className="text-xs text-gray-500 mt-1 truncate">
                            {permission.dataset_name}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500 bg-gray-100 rounded-lg">
              <p>You don't have access to any experiments yet.</p>
            </div>
          )}
        </div>

        {/* Main Content Area - Selected Experiment Details */}
        <div className="w-full md:w-2/3 lg:w-3/4 bg-white p-6 rounded-lg border">
          {selectedPermission ? (
            <div>
              <h2 className="text-2xl font-bold mb-4">{selectedPermission.database_name}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-700 mb-2">Experiment Details</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-gray-500">Dataset:</span> 
                      <span className="ml-2 font-medium">{selectedPermission.dataset_name || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Owner:</span> 
                      <span className="ml-2 font-medium">{selectedPermission.owner || 'Unknown'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Access Level:</span> 
                      <span className={`ml-2 font-medium ${
                        selectedPermission.access_level === 'admin' ? 'text-purple-700' : 'text-blue-700'
                      }`}>
                        {selectedPermission.access_level.toUpperCase()}
                      </span>
                    </div>
                    {selectedPermission.valid_until && (
                      <div>
                        <span className="text-gray-500">Access Expires:</span> 
                        <span className="ml-2 font-medium">
                          {new Date(selectedPermission.valid_until).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-700 mb-2">Actions</h3>
                  <div className="space-y-2">
                    <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition">
                      View Data
                    </button>
                    {selectedPermission.access_level === 'admin' && (
                      <button className="w-full px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition">
                        Manage Access
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Placeholder for experiment data visualization or content */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-4">Experiment Content</h3>
                <div className="bg-gray-100 p-12 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Select an action to view experiment data</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg">
              <div className="text-center">
                <p className="text-lg">Select an experiment from the sidebar</p>
                <p className="text-sm mt-2">Experiment details and data will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;