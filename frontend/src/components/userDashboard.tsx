import React, { useState, useEffect } from 'react';
import socket from '../utils/socket';

// ===== TYPE DEFINITIONS =====
interface User {
  id: number;
  username: string;
  created_at: string;
}

interface UserPermission {
  database_name: string;
  access_level: 'read' | 'admin';
  dataset_name?: string; // Name of the dataset
  owner?: string; // Owner of the dataset or table
  valid_until?: string | null; // Expiration date of the permission
}

interface UserDashboardProps {
  user: User;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ user }) => {
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('Requesting permissions for user:', user);

    // Request permissions from the backend
    socket.emit('get_permissions', { email: user.username });

    // Listen for permissions response
    socket.on('permissions_response', (response: UserPermission[]) => {
      console.log('Permissions response received:', response);
      setPermissions(response);
      setLoading(false);
    });

    // Handle connection errors
    socket.on('connect_error', () => {
      console.error('Connection error');
      setError('Connection error. Please try again later.');
      setLoading(false);
    });

    return () => {
      socket.off('permissions_response');
      socket.off('connect_error');
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4 border border-red-300 rounded bg-red-50">
        <p className="font-bold">Error</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="border-b pb-4 mb-6">
        <h1 className="text-2xl font-bold">Welcome, {user.username}!</h1>
        <p className="text-gray-600">Account created: {new Date(user.created_at).toLocaleDateString()}</p>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">Your Permissions</h2>
        {permissions.length > 0 ? (
          <ul className="space-y-4">
            {permissions.map((permission, index) => (
              <li
                key={index}
                className="p-4 rounded-lg border bg-white shadow-sm flex justify-between items-center"
              >
                <div>
                  <p className="font-bold text-lg">{permission.database_name}</p>
                  <p className="text-gray-600 text-sm">
                    Access Level: <span className="capitalize">{permission.access_level}</span>
                  </p>
                  {permission.dataset_name && (
                    <p className="text-gray-600 text-sm">Dataset: {permission.dataset_name}</p>
                  )}
                  {permission.owner && (
                    <p className="text-gray-600 text-sm">Owner: {permission.owner}</p>
                  )}
                  {permission.valid_until && (
                    <p className="text-gray-600 text-sm">
                      Valid Until: {new Date(permission.valid_until).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    permission.access_level === 'admin'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {permission.access_level}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center text-gray-500">
            <p className="text-lg font-medium">No permissions found</p>
            <p className="mt-1">You don't have access to any datasets or tables yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;