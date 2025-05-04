import React from 'react';
import { UserPermission } from './userDashboard';

interface ExperimentMetadata {
  table_id: string;
  experiment_name: string;
  mac_address: string | null;
  time_range: {
    first_timestamp: { value: string } | string | null;
    last_timestamp: { value: string } | string | null;
  };
  available_sensors: string[];
}

interface ExperimentDataViewerProps {
  permission: UserPermission;
  metadata?: ExperimentMetadata;
  onBack: () => void;
}

const ExperimentDataViewer: React.FC<ExperimentDataViewerProps> = ({
  permission,
  metadata,
  onBack
}) => {
  // Format date for display
  const formatDateTime = (dateInput?: { value: string } | string | null) => {
    if (!dateInput) return 'N/A';
    
    // Extract the string value if it's an object
    const dateString = typeof dateInput === 'object' && dateInput !== null && 'value' in dateInput 
      ? dateInput.value 
      : dateInput;
    
    console.log("Formatting date string (extracted):", dateString);
    
    try {
      // Now parse the string
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.error("Invalid date after parsing:", dateString);
        return 'Invalid date';
      }
      
      return date.toLocaleString();
    } catch (err) {
      console.error("Error parsing date:", err);
      return 'Error parsing date';
    }
  };

  return (
    <div className="p-4">
      <button 
        onClick={onBack}
        className="mb-4 bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded flex items-center"
      >
        <span>← Back to Experiments</span>
      </button>

      <div className="bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6">{permission.experiment_name}</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-3">Experiment Details</h2>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Table ID:</span> {permission.table_id}
              </div>
              <div>
                <span className="font-medium">Dataset:</span> {permission.dataset_name}
              </div>
              <div>
                <span className="font-medium">MAC Address:</span> {permission.mac_address || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Access Level:</span> {permission.is_admin ? 'Admin' : permission.access_level}
              </div>
              {permission.valid_until && (
                <div>
                  <span className="font-medium">Valid Until:</span> {formatDateTime(permission.valid_until)}
                </div>
              )}
              {permission.owner && (
                <div>
                  <span className="font-medium">Owner:</span> {permission.owner}
                </div>
              )}
            </div>
          </div>
          
          {metadata && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Experiment Metadata</h2>
              <div className="space-y-2">
                <div>
                  <span className="font-medium">First Timestamp:</span> {formatDateTime(metadata.time_range.first_timestamp)}
                </div>
                <div>
                  <span className="font-medium">Last Timestamp:</span> {formatDateTime(metadata.time_range.last_timestamp)}
                </div>
                <div>
                  <span className="font-medium">Available Sensors:</span> 
                  {metadata.available_sensors.length > 0 ? (
                    <div className="mt-2 ml-4">
                      <ul className="list-disc">
                        {metadata.available_sensors.map((sensor, index) => (
                          <li key={index}>{sensor.replace('SensorData_', '')}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <span className="ml-2">No sensors available</span>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {!metadata && (
            <div className="col-span-2">
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded">
                No metadata available for this experiment.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExperimentDataViewer;  