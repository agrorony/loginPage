import React, { useState } from 'react';
import axios from 'axios';
import { UserPermission } from './userDashboard';
import Plot from 'react-plotly.js';

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

interface ExperimentDataResponse {
  success: boolean;
  data: any[]; // Replace 'any[]' with the actual shape of the data if known
  message?: string;
}

interface ExperimentDataViewerProps {
  permission: UserPermission;
  metadata?: ExperimentMetadata;
  onBack: () => void;
}

const API_BASE_URL = 'http://localhost:3001'; // Define the base URL for the backend API

const ExperimentDataViewer: React.FC<ExperimentDataViewerProps> = ({
  permission,
  metadata,
  onBack
}) => {
  const [xAxisSensor, setXAxisSensor] = useState<string | null>(null);
  const [yAxisSensor, setYAxisSensor] = useState<string | null>(null);
  const [xDropdownOpen, setXDropdownOpen] = useState(false);
  const [yDropdownOpen, setYDropdownOpen] = useState(false);
  const [timeRange, setTimeRange] = useState<{ start: string; end: string } | null>(null);
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [plotData, setPlotData] = useState<any[]>([]);
  const [showPlot, setShowPlot] = useState(false);

  const formatDateTime = (dateInput?: { value: string } | string | null) => {
    if (!dateInput) return 'N/A';
    const dateString =
      typeof dateInput === 'object' && dateInput !== null && 'value' in dateInput
        ? dateInput.value
        : dateInput;

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleString();
    } catch {
      return 'Error parsing date';
    }
  };

  const toggleDropdown = (axis: 'x' | 'y' | 'time') => {
    if (axis === 'x') {
      setXDropdownOpen(!xDropdownOpen);
      setYDropdownOpen(false);
      setTimeDropdownOpen(false);
    } else if (axis === 'y') {
      setYDropdownOpen(!yDropdownOpen);
      setXDropdownOpen(false);
      setTimeDropdownOpen(false);
    } else {
      setTimeDropdownOpen(!timeDropdownOpen);
      setXDropdownOpen(false);
      setYDropdownOpen(false);
    }
  };

  const selectSensor = (axis: 'x' | 'y', sensor: string) => {
    if (axis === 'x') {
      setXAxisSensor(sensor);
    } else {
      setYAxisSensor(sensor);
    }
    setXDropdownOpen(false);
    setYDropdownOpen(false);
  };

  const selectTimeRange = (range: { start: string; end: string }) => {
    setTimeRange(range);
    setTimeDropdownOpen(false);
  };

  const fetchData = async () => {
    if (!xAxisSensor || !yAxisSensor || !timeRange) {
      setErrorMessage('Please select X-Axis, Y-Axis sensors, and time range.');
      return;
    }

    const requestBody = {
      project_id: permission.project_id,
      dataset_name: permission.dataset_name,
      table_id: permission.table_id,
      experiment_name: permission.experiment_name,
      time_range: timeRange,
      fields: [xAxisSensor, yAxisSensor]
    };

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setShowPlot(false);

    try {
      const response = await axios.post<ExperimentDataResponse>(
        `${API_BASE_URL}/api/experiments/data`,
        requestBody
      );

      if (response.data.success) {
        setSuccessMessage('Data fetched successfully!');
        console.log('Fetched Data:', response.data.data);
        
        // Set the data for plotting
        if (response.data.data && response.data.data.length > 0) {
          setPlotData(response.data.data);
          setShowPlot(true);
        } else {
          setErrorMessage('No data points available for plotting');
        }
      } else {
        setErrorMessage('Failed to fetch data: ' + response.data.message);
      }
    } catch (error: any) {
      setErrorMessage('Error while fetching data: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Prepare data for Plotly
  const getPlotlyData = () => {
    if (!plotData || plotData.length === 0 || !xAxisSensor || !yAxisSensor) return [];

    // For time on x-axis
    if (xAxisSensor === 'Time') {
      return [{
        x: plotData.map(point => new Date(point.TimeStamp)),
        y: plotData.map(point => point[yAxisSensor as string]),
        type: 'scatter',
        mode: 'lines+markers',
        marker: { color: 'blue' },
        name: yAxisSensor
      }];
    } 
    
    // For other sensors on x-axis
    return [{
      x: plotData.map(point => point[xAxisSensor]),
      y: plotData.map(point => point[yAxisSensor as string]),
      type: 'scatter',
      mode: 'lines+markers',
      marker: { color: 'blue' },
      name: `${xAxisSensor} vs ${yAxisSensor}`
    }];
  };

  const getPlotLayout = () => {
    return {
      title: `${permission.experiment_name} - Data Visualization`,
      xaxis: {
        title: xAxisSensor === 'Time' ? 'Timestamp' : xAxisSensor
      },
      yaxis: {
        title: yAxisSensor
      },
      height: 500,
      autosize: true,
      margin: { l: 50, r: 50, b: 100, t: 100, pad: 4 }
    };
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
                    <div className="mt-2">
                      <div className="flex items-center space-x-4">
                        {/* X-Axis Button */}
                        <div className="relative">
                          <button
                            onClick={() => toggleDropdown('x')}
                            className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded text-sm"
                          >
                            {xAxisSensor ? `X-Axis: ${xAxisSensor}` : 'Select X-Axis'}
                          </button>
                          {xDropdownOpen && (
                            <div className="absolute mt-2 bg-white border border-gray-300 rounded shadow-lg z-10">
                              <button
                                onClick={() => selectSensor('x', 'Time')}
                                className="block px-4 py-2 text-left hover:bg-gray-200 w-full"
                              >
                                Time
                              </button>
                              {metadata.available_sensors.map((sensor, index) => (
                                <button
                                  key={index}
                                  onClick={() => selectSensor('x', sensor)}
                                  className="block px-4 py-2 text-left hover:bg-gray-200 w-full"
                                >
                                  {sensor.replace('SensorData_', '')}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Y-Axis Button */}
                        <div className="relative">
                          <button
                            onClick={() => toggleDropdown('y')}
                            className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded text-sm"
                          >
                            {yAxisSensor ? `Y-Axis: ${yAxisSensor}` : 'Select Y-Axis'}
                          </button>
                          {yDropdownOpen && (
                            <div className="absolute mt-2 bg-white border border-gray-300 rounded shadow-lg z-10">
                              {metadata.available_sensors.map((sensor, index) => (
                                <button
                                  key={index}
                                  onClick={() => selectSensor('y', sensor)}
                                  className="block px-4 py-2 text-left hover:bg-gray-200 w-full"
                                >
                                  {sensor.replace('SensorData_', '')}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Time Range Button */}
                        <div className="relative">
                          <button
                            onClick={() => toggleDropdown('time')}
                            className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded text-sm"
                          >
                            {timeRange
                              ? `Time: ${formatDateTime(timeRange.start)} - ${formatDateTime(timeRange.end)}`
                              : 'Select Time Range'}
                          </button>
                          {timeDropdownOpen && metadata.time_range.first_timestamp && metadata.time_range.last_timestamp && (
                            <div className="absolute mt-2 bg-white border border-gray-300 rounded shadow-lg z-10">
                              <button
                                onClick={() =>
                                  selectTimeRange({
                                    start: metadata.time_range.first_timestamp as string,
                                    end: metadata.time_range.last_timestamp as string
                                  })
                                }
                                className="block px-4 py-2 text-left hover:bg-gray-200 w-full"
                              >
                                {`${formatDateTime(metadata.time_range.first_timestamp)} - ${formatDateTime(
                                  metadata.time_range.last_timestamp
                                )}`}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
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

        {/* Fetch Data Button */}
        <div className="mt-6">
          <button
            onClick={fetchData}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Fetching...' : 'Fetch Data'}
          </button>
          {errorMessage && <p className="mt-2 text-red-500">{errorMessage}</p>}
          {successMessage && <p className="mt-2 text-green-500">{successMessage}</p>}
        </div>

        {/* Plot visualization */}
        {showPlot && plotData.length > 0 && (
          <div className="mt-8 border border-gray-200 rounded-lg p-4 bg-white">
            <h2 className="text-xl font-semibold mb-4">Data Visualization</h2>
            <div className="w-full h-full">
              <Plot
                data={getPlotlyData()}
                layout={getPlotLayout()}
                config={{ responsive: true }}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExperimentDataViewer;