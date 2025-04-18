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
  mac_address?: string;
  is_dataset_level?: boolean;
  table_count?: number;
  tables?: string[];
  table_id?: string;
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
  const [expandedDatasets, setExpandedDatasets] = useState<Record<string, boolean>>({});

  const groupedPermissions = permissions.reduce<Record<string, UserPermission[]>>((groups, permission) => {
    const owner = permission.owner || 'Unknown';
    if (!groups[owner]) {
      groups[owner] = [];
    }
    groups[owner].push(permission);
    return groups;
  }, {});

  useEffect(() => {
    console.log('Requesting permissions for user:', user.username);
    
    let timeoutId: NodeJS.Timeout;

    // Request permissions using email (username in the old schema) instead of ID
    socket.emit('get_permissions', {
      userId: user.id,
      email: user.username,
    });

    // Handle server response with permissions data
    socket.on('permissions_response', (response: UserPermission[]) => {
      console.log('Received permissions response:', response);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setLoading(false);
      setPermissions(response);
    });

    // Handle connection errors
    socket.on('connect_error', () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setLoading(false);
      setError('Connection error. Please try again later.');
      console.error('Connection error for user:', user.username);
    });

    // Set a timeout for the server response
    timeoutId = setTimeout(() => {
      console.log('Server response timeout - showing error');
      setLoading(false);
      setError('Server did not respond in time. Please try again later.');
    }, 10000); // 10 seconds timeout

    // Clean up event listeners and timeout when component unmounts
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      socket.off('permissions_response');
      socket.off('connect_error');
      console.log('Cleaned up listeners for user:', user.username);
    };
  }, [user.id, user.username]);

  const handlePermissionSelect = (permission: UserPermission) => {
    setSelectedPermission(permission);
    console.log('Selected permission:', permission);
  };

  const toggleDatasetExpansion = (datasetName: string) => {
    setExpandedDatasets(prev => ({
      ...prev,
      [datasetName]: !prev[datasetName]
    }));
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
          selectedPermission.mac_address || 
          (selectedPermission.database_name.includes('_')
            ? selectedPermission.database_name.split('_')[0]
            : '')
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
        <div className="w-full md:w-2/3 lg:w-1/2 bg-gray-50 p-4 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Your Permissions</h2>
          {permissions.length > 0 ? (
            <div className="space-y-6">
              {Object.entries(groupedPermissions).map(([owner, perms]) => (
                <div key={owner} className="space-y-2">
                  <div className="font-medium text-lg text-gray-800 pb-2 border-b">
                    {owner}
                  </div>
                  <div className="pl-2 space-y-3">
                    {/* Admin permissions (dataset level) */}
                    {perms
                      .filter(p => p.access_level === 'admin')
                      .map((permission, index) => (
                        <div key={`admin-${permission.dataset_name}-${index}`} className="border rounded-lg bg-white">
                          <button
                            onClick={() => toggleDatasetExpansion(permission.dataset_name || '')}
                            className="w-full text-left px-4 py-3 flex items-center justify-between"
                          >
                            <div>
                              <div className="font-medium flex items-center">
                                <span className="text-purple-700 mr-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2h-4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                  </svg>
                                </span>
                                {permission.dataset_name || 'Dataset'}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                {permission.table_count || 0} tables • {permission.experiment && `Experiment: ${permission.experiment}`}
                              </div>
                            </div>
                            
                            <div className="flex items-center">
                              <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-medium mr-2">
                                admin
                              </span>
                              <svg 
                                className={`h-5 w-5 text-gray-400 transform transition-transform ${expandedDatasets[permission.dataset_name || ''] ? 'rotate-180' : ''}`}
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </button>
                          
                          {expandedDatasets[permission.dataset_name || ''] && permission.tables && (
                            <div className="px-4 py-2 border-t bg-gray-50">
                              <div className="text-sm font-medium text-gray-700 mb-2">Tables in this dataset:</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {permission.tables.map((table, tableIndex) => (
                                  <div 
                                    key={`table-${tableIndex}`}
                                    className="text-sm bg-white py-1 px-3 border rounded-md"
                                  >
                                    {table}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      
                    {/* Read permissions (table level) */}
                    {perms
                      .filter(p => p.access_level === 'read')
                      .map((permission, index) => (
                        <button
                          key={`read-${permission.database_name}-${index}`}
                          onClick={() => handlePermissionSelect(permission)}
                          className={`w-full text-left px-4 py-3 rounded-md border bg-white transition ${
                            selectedPermission?.database_name === permission.database_name
                              ? 'border-blue-300 bg-blue-50'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium flex items-center">
                                <span className="text-blue-700 mr-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z" clipRule="evenodd" />
                                  </svg>
                                </span>
                                {permission.database_name}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                Dataset: {permission.dataset_name} {permission.experiment && `• Experiment: ${permission.experiment}`}
                              </div>
                            </div>
                            
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                              read
                            </span>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500 bg-gray-100 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p className="text-lg font-medium">No permissions found</p>
              <p className="mt-1">You don't have access to any datasets or tables yet.</p>
            </div>
          )}
        </div>
        
        {selectedPermission && (
          <div className="w-full md:w-1/3 lg:w-1/2 bg-white p-4 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Selected Table</h2>
            <div className="bg-gray-50 p-4 rounded-lg border mb-4">
              <div className="text-sm text-gray-500">Name</div>
              <div className="font-medium">{selectedPermission.database_name}</div>
              
              {selectedPermission.experiment && (
                <>
                  <div className="text-sm text-gray-500 mt-3">Experiment</div>
                  <div>{selectedPermission.experiment}</div>
                </>
              )}
              
              <div className="text-sm text-gray-500 mt-3">Access Level</div>
              <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                selectedPermission.access_level === 'admin' 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {selectedPermission.access_level}
              </div>
              
              {selectedPermission.valid_until && (
                <>
                  <div className="text-sm text-gray-500 mt-3">Valid Until</div>
                  <div>{new Date(selectedPermission.valid_until).toLocaleDateString()}</div>
                </>
              )}
            </div>
            
            <button
              onClick={handleViewData}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition"
            >
              View Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;