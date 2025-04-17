import React, { useState, useEffect } from 'react';
import socket from '../utils/socket';
import ExperimentDashboard from './ExperimentDashboard';

// ===== TYPE DEFINITIONS =====
interface User {
  id: number;
  username: string;
  created_at: string;
}

interface UserPermission {
  database_name: string;
  access_level: 'read' | 'admin';
  dataset_name?: string;
  owner?: string;
  valid_until?: string | null;
}

interface UserDashboardProps {
  user: User;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ user }) => {
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPermission, setSelectedPermission] = useState<UserPermission | null>(null);
  const [showExperimentDashboard, setShowExperimentDashboard] = useState<boolean>(false);

  const groupedPermissions = permissions.reduce<Record<string, UserPermission[]>>((groups, permission) => {
    const owner = permission.owner || 'Unknown';
    if (!groups[owner]) {
      groups[owner] = [];
    }
    groups[owner].push(permission);
    return groups;
  }, {});

  useEffect(() => {
    console.log('Simulating permissions response for debugging...');
    const simulatedPermissions: UserPermission[] = [
      {
        database_name: 'example_db',
        access_level: 'read', // Matches the defined union type
        dataset_name: 'example_dataset',
        owner: 'admin_user',
        valid_until: null,
      },
    ];

    const timeout = setTimeout(() => {
      setPermissions(simulatedPermissions);
      setLoading(false);
      console.log('Simulated permissions response:', simulatedPermissions);
    }, 2000);

    // Request permissions using email (username in the old schema) instead of ID
    socket.emit('get_permissions', {
      userId: user.id,
      email: user.username,
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
  }, [user.id, user.username]);

  const handlePermissionSelect = (permission: UserPermission) => {
    setSelectedPermission(permission);
    console.log('Selected experiment:', permission.database_name);
  };

  const handleViewData = () => {
    if (selectedPermission) {
      setShowExperimentDashboard(true);
    }
  };

  const handleBackToExperiments = () => {
    setShowExperimentDashboard(false);
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );

  if (error)
    return (
      <div className="text-red-500 text-center p-4 border border-red-300 rounded bg-red-50">
        <p className="font-bold">Error</p>
        <p>{error}</p>
      </div>
    );

  if (showExperimentDashboard && selectedPermission) {
    return (
      <ExperimentDashboard
        experimentId={selectedPermission.database_name}
        experimentName={selectedPermission.dataset_name || selectedPermission.database_name}
        macAddress={
          selectedPermission.database_name.includes('_')
            ? selectedPermission.database_name.split('_')[0]
            : ''
        }
        onBack={handleBackToExperiments}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="border-b pb-4 mb-6">
        <h1 className="text-2xl font-bold">Welcome, {user.username}!</h1>
        <p className="text-gray-600">Account created: {new Date(user.created_at).toLocaleDateString()}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/3 lg:w-1/4 bg-gray-50 p-4 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Your Experiments</h2>
          {permissions.length > 0 ? (
            <div className="space-y-4">
              {Object.entries(groupedPermissions).map(([owner, perms]) => (
                <div key={owner} className="space-y-2">
                  <div className="font-medium text-gray-700 pb-1 border-b">{owner}</div>
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
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              permission.access_level === 'admin'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {permission.access_level}
                          </span>
                        </div>
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
      </div>
    </div>
  );
};

export default UserDashboard;

