import React, { useState, useEffect } from 'react';
import axios from 'axios';
import socket from '../utils/socket';
import ExperimentDashboard from './ExperimentDashboard';

interface User {
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

// Interface for admin table grouping
interface AdminTableGroup {
  tableId: string;
  owner?: string;
  valid_until?: string | null;
  experiments: UserPermission[];
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
  const [expandedAdminTables, setExpandedAdminTables] = useState<Record<string, boolean>>({});

  useEffect(() => {
    console.log('Requesting permissions for user:', user.username);
    socket.emit('get_permissions', {
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
  }, [user.username]);

  useEffect(() => {
    console.log('Permissions data to be processed:', permissions);
  }, [permissions]);

  // Group permissions by dataset and then by admin tables
  const groupedData = permissions.reduce<Record<string, {
    regularPermissions: UserPermission[],
    adminTables: Record<string, AdminTableGroup>
  }>>((groups, permission) => {
    const dataset = permission.dataset_name || 'Unknown dataset';
    
    // Initialize dataset group if it doesn't exist
    if (!groups[dataset]) {
      groups[dataset] = {
        regularPermissions: [],
        adminTables: {}
      };
    }
    
    if (permission.is_admin) {
      // Group admin permissions by table_id
      if (!groups[dataset].adminTables[permission.table_id]) {
        groups[dataset].adminTables[permission.table_id] = {
          tableId: permission.table_id,
          owner: permission.owner,
          valid_until: permission.valid_until,
          experiments: []
        };
      }
      
      // Add experiment to the admin table group
      groups[dataset].adminTables[permission.table_id].experiments.push(permission);
    } else {
      // Add regular permissions directly
      groups[dataset].regularPermissions.push(permission);
    }
    
    return groups;
  }, {});
  
  useEffect(() => {
    console.log('Grouped permissions data:', groupedData);
  }, [groupedData]);

  const toggleGroup = (dataset: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [dataset]: !prev[dataset],
    }));
  };

  const toggleAdminTable = (tableId: string) => {
    setExpandedAdminTables((prev) => ({
      ...prev,
      [tableId]: !prev[tableId],
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
      
      {Object.entries(groupedData).map(([dataset, { regularPermissions, adminTables }]) => (
        <div key={dataset} className="mb-4">
          {/* Dataset header */}
          <div
            className="cursor-pointer font-semibold text-lg"
            onClick={() => toggleGroup(dataset)}
          >
            {dataset} ({regularPermissions.length + Object.keys(adminTables).length} items)
          </div>
          
          {expandedGroups[dataset] && (
            <div className="ml-4">
              {/* Admin table groups */}
              {Object.values(adminTables).map((adminTable) => (
                <div key={adminTable.tableId} className="mb-2">
                  {/* Admin table header */}
                  <div 
                    className="p-2 border rounded cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => toggleAdminTable(adminTable.tableId)}
                  >
                    <h2 className="text-md font-semibold">
                      {adminTable.tableId} (Admin - {adminTable.experiments.length} experiments)
                    </h2>
                    <p className="text-sm text-gray-600">
                      {adminTable.owner && (
                        <><strong>Owner:</strong> {adminTable.owner}<br /></>
                      )}
                      {adminTable.valid_until && (
                        <><strong>Valid until:</strong> {formatDate(adminTable.valid_until)}<br /></>
                      )}
                    </p>
                  </div>
                  
                  {/* Experiments within admin table */}
                  {expandedAdminTables[adminTable.tableId] && (
                    <div className="ml-4">
                      {adminTable.experiments.map((permission, index) => (
                        <div
                          key={`${permission.table_id}_${permission.experiment_name || 'unknown'}_${permission.mac_address}_${index}`}
                          className={`p-2 border-l border-b border-r rounded-b cursor-pointer hover:bg-gray-100 transition ${
                            selectedPermission?.experiment_name === permission.experiment_name ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => handlePermissionSelect(permission)}
                        >
                          <h3 className="text-md">
                            {permission.experiment_name || 'Unknown Experiment'}
                          </h3>
                          <p className="text-xs text-gray-500">
                            <strong>MAC:</strong> {permission.mac_address}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Regular permissions */}
              {regularPermissions.map((permission, index) => (
                <div
                  key={`${permission.table_id}_${permission.experiment_name || 'unknown'}_${permission.mac_address}_${index}`}
                  className={`p-2 border rounded cursor-pointer hover:bg-gray-100 transition ${
                    selectedPermission?.experiment_name === permission.experiment_name ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handlePermissionSelect(permission)}
                >
                  <h2 className="text-md font-semibold">
                    {permission.experiment_name || 'Unknown Experiment'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    <strong>Access:</strong> Read<br />
                    {permission.valid_until && (
                      <><strong>Valid until:</strong> {formatDate(permission.valid_until)}<br /></>
                    )}
                    <strong>Table:</strong> {permission.table_id}
                  </p>
                </div>
              ))}
            </div>
          )}
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