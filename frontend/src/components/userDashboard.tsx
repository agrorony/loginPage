import React, { useState, useEffect } from 'react';
import axios from 'axios';
import socket from '../utils/socket';
import ExperimentDashboard from './ExperimentDashboard';

interface User {
  id: number;
  username: string;
  created_at: string;
}

export interface UserPermission {
  experiment_name: string;
  access_level: 'read' | 'admin';
  dataset_name: string;
  owner?: string;
  valid_until?: string | null;
  table_id: string;
  project_id: string;
  mac_address: string;
  is_admin: boolean;
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
    const dataset = permission.dataset_name || 'Unknown dataset';
    if (!groups[dataset]) {
      groups[dataset] = [];
    }
    
    groups[dataset].push(permission);
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
      setPermissions(response);
      setLoading(false);
    });

    socket.on('connect_error', () => {
      setError('Connection error. Please try again later.');
      console.error('Connection error for user:', user.username);
      setLoading(false);
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
    console.log('Selected permission (experiment):', permission.experiment_name);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center">{error}</div>;
  }

  if (showExperimentDashboard && selectedPermission) {
    return (
      <ExperimentDashboard
        experimentId={selectedPermission.table_id}
        experimentName={selectedPermission.experiment_name || 'Unknown Experiment'}
        macAddress={selectedPermission.mac_address}
        userPermission={{
          database_name: selectedPermission.experiment_name || 'Unknown Experiment',
          access_level: selectedPermission.access_level,
          dataset_name: selectedPermission.dataset_name,
          owner: selectedPermission.owner,
          valid_until: selectedPermission.valid_until
        }}
        onBack={handleBackToExperiments}
      />
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Available Experiments</h1>
      {Object.entries(groupedPermissions).map(([dataset, permissions]) => (
        <div key={dataset} className="mb-4">
          <div
            className="cursor-pointer font-semibold text-lg"
            onClick={() => toggleGroup(dataset)}
          >
            {dataset} ({permissions.length})
          </div>
          {expandedGroups[dataset] &&
            permissions.map((permission) => {
              return (
                <div
                  key={`${permission.table_id}_${permission.experiment_name}`}
                  className={`ml-4 p-2 border rounded cursor-pointer hover:bg-gray-100 transition ${
                    selectedPermission?.experiment_name === permission.experiment_name ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handlePermissionSelect(permission)}
                >
                  <h2 className="text-md font-semibold">
                    {permission.experiment_name || 'Unknown Experiment'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    <strong>Access:</strong> {permission.is_admin ? 'Admin' : 'Read'}<br />
                    {permission.valid_until && (
                      <>
                        <strong>Valid until:</strong> {formatDate(permission.valid_until)}<br />
                      </>
                    )}
                    <strong>Table:</strong> {permission.table_id}
                  </p>
                </div>
              );
            })}
        </div>
      ))}
      <button
        onClick={handleViewData}
        className="mt-4 bg-blue-500 text-white py-2 px-4 rounded disabled:opacity-50"
        disabled={!selectedPermission}
      >
        View Experiment Data
      </button>
    </div>
  );
};

export default UserDashboard;