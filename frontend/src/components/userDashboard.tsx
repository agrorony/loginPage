import React, { useState, useEffect } from 'react';
import axios from 'axios';

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

// Interface for permissions API response
interface PermissionsResponse {
  success: boolean;
  permissions: UserPermission[];
  message?: string;
}

// Interface for experiment metadata
interface ExperimentMetadata {
  table_id: string;
  experiment_name: string;
  mac_address: string | null;
  time_range: {
    first_timestamp: string | null;
    last_timestamp: string | null;
  };
  available_sensors: string[];
}

// Interface for metadata API response
interface MetadataApiResponse {
  success: boolean;
  message?: string;
  metadata: ExperimentMetadata[];
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

const API_BASE_URL = 'http://localhost:3001'; // Updated to backend port 3001

const UserDashboard: React.FC<UserDashboardProps> = ({ user }) => {
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [metadata, setMetadata] = useState<Record<string, ExperimentMetadata>>({});
  const [loading, setLoading] = useState(true);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPermission, setSelectedPermission] = useState<UserPermission | null>(null);
  const [showExperimentDashboard, setShowExperimentDashboard] = useState<boolean>(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedAdminTables, setExpandedAdminTables] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchPermissions = async () => {
      console.log('Requesting permissions for user:', user.username);
      setLoading(true);

      try {
        const response = await axios.post<PermissionsResponse>(`${API_BASE_URL}/api/permissions`, { email: user.username });
        if (response.data.success) {
          console.log('Received permissions response:', response.data.permissions);
          setPermissions(response.data.permissions);
        } else {
          console.error('Failed to fetch permissions:', response.data.message);
          setError(response.data.message || 'Failed to fetch permissions');
        }
      } catch (err) {
        console.error('Error fetching permissions:', err);
        setError('Internal server error while fetching permissions.');
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user.username]);

  // Fetch metadata when permissions are loaded
  useEffect(() => {
    if (permissions.length > 0) {
      fetchExperimentMetadata();
    }
  }, [permissions]);

  const fetchExperimentMetadata = async () => {
    if (permissions.length === 0) return;
  
    setMetadataLoading(true);
    try {
      // Constructing the experiments payload
      const experiments = permissions.map(permission => ({
        project_id: permission.project_id,
        dataset_name: permission.dataset_name,
        table_id: extractTableId(permission.table_id), // Fix table_id
        experiment_name: permission.experiment_name,
        mac_address: permission.mac_address
      }));
  
      console.log("Payload sent to /api/experiments/metadata:", experiments);
  
      // Sending the API request
      const response = await axios.post<MetadataApiResponse>(`${API_BASE_URL}/api/experiments/metadata`, { experiments });
  
      if (response.data.success) {
        // Transforming response data into a metadata map
        const metadataMap: Record<string, ExperimentMetadata> = {};
        response.data.metadata.forEach((item: ExperimentMetadata) => {
          const key = `${item.table_id}_${item.experiment_name}_${item.mac_address || ''}`;
          metadataMap[key] = item;
        });
  
        setMetadata(metadataMap);
        console.log("Experiment metadata loaded:", metadataMap);
      } else {
        console.error("Failed to fetch metadata:", response.data.message);
      }
    } catch (error) {
      console.error("Error fetching experiment metadata:", error);
      console.log("Payload that caused the error:", {
        experiments: permissions.map(permission => ({
          project_id: permission.project_id,
          dataset_name: permission.dataset_name,
          table_id: extractTableId(permission.table_id), // Log fixed table_id
          experiment_name: permission.experiment_name,
          mac_address: permission.mac_address
        }))
      });
    } finally {
      setMetadataLoading(false);
    }
  };
  
  // Helper function to extract table ID
  const extractTableId = (fullTableId: string): string => {
    const parts = fullTableId.split('.');
    return parts.length > 2 ? parts[2] : fullTableId; // Returns only the table name
  };
  const getExperimentMetadata = (permission: UserPermission) => {
    const key = `${permission.table_id}_${permission.experiment_name}_${permission.mac_address || ''}`;
    return metadata[key];
  };

  useEffect(() => {
    console.log('Permissions data to be processed:', permissions);
  }, [permissions]);

  const groupedData = permissions.reduce<Record<string, {
    regularPermissions: UserPermission[];
    adminTables: Record<string, AdminTableGroup>;
  }>>((groups, permission) => {
    const dataset = permission.dataset_name || 'Unknown dataset';

    if (!groups[dataset]) {
      groups[dataset] = {
        regularPermissions: [],
        adminTables: {}
      };
    }

    if (permission.is_admin) {
      if (!groups[dataset].adminTables[permission.table_id]) {
        groups[dataset].adminTables[permission.table_id] = {
          tableId: permission.table_id,
          owner: permission.owner,
          valid_until: permission.valid_until,
          experiments: []
        };
      }

      groups[dataset].adminTables[permission.table_id].experiments.push(permission);
    } else {
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

  const formatTimeRange = (firstTime: string | null, lastTime: string | null) => {
    if (!firstTime || !lastTime) return 'No time data available';

    const firstDate = new Date(firstTime);
    const lastDate = new Date(lastTime);

    if (isNaN(firstDate.getTime()) || isNaN(lastDate.getTime())) {
      return 'Invalid time data';
    }

    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };

    const formattedFirst = firstDate.toLocaleDateString(undefined, options);
    const formattedLast = lastDate.toLocaleDateString(undefined, options);

    return `${formattedFirst} - ${formattedLast}`;
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

  

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Available Experiments</h1>

      {metadataLoading && (
        <div className="flex items-center mb-4 text-blue-500">
          <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
          <span>Loading experiment details...</span>
        </div>
      )}

      {Object.entries(groupedData).map(([dataset, { regularPermissions, adminTables }]) => (
        <div key={dataset} className="mb-4">
          <div
            className="cursor-pointer font-semibold text-lg"
            onClick={() => toggleGroup(dataset)}
          >
            {dataset} ({regularPermissions.length + Object.keys(adminTables).length} items)
          </div>

          {expandedGroups[dataset] && (
            <div className="ml-4">
              {Object.values(adminTables).map((adminTable) => (
                <div key={adminTable.tableId} className="mb-2">
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

                  {expandedAdminTables[adminTable.tableId] && (
                    <div className="ml-4">
                      {adminTable.experiments.map((permission, index) => {
                        return (
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
                            {getExperimentMetadata(permission) && (
                              <p className="text-xs text-gray-500">
                                <strong>Time Range:</strong> {formatTimeRange(
                                  getExperimentMetadata(permission)?.time_range.first_timestamp,
                                  getExperimentMetadata(permission)?.time_range.last_timestamp
                                )}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {regularPermissions.map((permission, index) => {
                return (
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
                    {/* Metadata display removed */}
                  </div>
                );
              })}
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