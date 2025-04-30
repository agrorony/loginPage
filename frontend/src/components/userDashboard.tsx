import React, { useState, useEffect } from 'react';
import socket from '../utils/socket';
import ExperimentDashboard from './ExperimentDashboard';

interface User {
  id: number;
  username: string;
  created_at: string;
}

export interface UserPermission {
  database_name: string; // Represents experiment name or dataset name
  access_level: 'read' | 'admin';
  dataset_name?: string;
  owner?: string;
  valid_until?: string | null;
  experiments?: string[]; // Experiments for admin-level permissions
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
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Group permissions by dataset name
  const groupedPermissions = permissions.reduce<Record<string, UserPermission[]>>((groups, permission) => {
    const dataset = permission.dataset_name || "Unknown dataset";
    if (!groups[dataset]) {
      groups[dataset] = [];
    }

    if (permission.access_level === 'admin' && permission.experiments) {
      // Create individual boxes for each experiment under admin permissions
      permission.experiments.forEach((experiment) => {
        groups[dataset].push({
          ...permission,
          database_name: experiment,
          experiments: undefined, // Clear experiments field for individual boxes
        });
      });
    } else {
      groups[dataset].push(permission);
    }

    return groups;
  }, {});

  useEffect(() => {
    console.log('Requesting permissions for user:', user.username);
    socket.emit('get_permissions', {
      userId: user.id,
      email: user.username,
    });

    socket.on('permissions_response', (response: UserPermission[]) => {
      console.log('Received permissions response:', response);
      setLoading(false);
      setPermissions(response);
    });

    socket.on('connect_error', () => {
      setLoading(false);
      setError('Connection error. Please try again later.');
      console.error('Connection error for user:', user.username);
    });

    return () => {
      socket.off('permissions_response');
      socket.off('connect_error');
    };
  }, [user.id, user.username]);

  const toggleGroup = (dataset: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [dataset]: !prev[dataset],
    }));
  };

  const handlePermissionSelect = (permission: UserPermission) => {
    setSelectedPermission(permission);
    console.log('Selected permission (experiment):', permission.database_name);
  };

  const handleViewData = () => {
    if (selectedPermission) {
      setShowExperimentDashboard(true);
    }
  };

  const handleBackToExperiments = () => {
    setShowExperimentDashboard(false);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? dateString : date.toLocaleDateString();
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
        <p className="text-gray-600">
          Account created:{' '}
          {isNaN(new Date(user.created_at).getTime())
            ? 'Invalid Date'
            : new Date(user.created_at).toLocaleDateString()}
        </p>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Your Permissions</h2>
        {Object.keys(groupedPermissions).length === 0 && (
          <div className="text-center py-6 text-gray-500 bg-gray-100 rounded-lg">
            <p>You don't have access to any datasets yet.</p>
          </div>
        )}
        <ul className="space-y-4">
          {Object.entries(groupedPermissions).map(([dataset, perms]) => (
            <li key={dataset} className="border rounded-lg">
              <button
                onClick={() => toggleGroup(dataset)}
                className="w-full text-left px-4 py-2 bg-gray-200 hover:bg-gray-300 font-medium"
              >
                {expandedGroups[dataset] ? '▼' : '►'} Dataset: {dataset} ({perms.length})
              </button>
              {expandedGroups[dataset] && (
                <ul className="pl-6 space-y-2">
                  {perms.map((permission, index) => (
                    <li
                      key={`${permission.database_name}-${index}`}
                      className="p-4 bg-gray-100 border rounded"
                    >
                      <div>
                        <strong>Experiment Name:</strong> {permission.database_name}
                      </div>
                      <div>
                        <strong>Access Level:</strong> {permission.access_level}
                      </div>
                      <div>
                        <strong>Valid Until:</strong> {formatDate(permission.valid_until)}
                      </div>
                      <button
                        onClick={() => {
                          handlePermissionSelect(permission);
                          handleViewData();
                        }}
                        className="mt-2 px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
                      >
                        View Experiment
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default UserDashboard;