import React, { useState, useEffect } from 'react';

// Define the data structure for experiment sensor data
interface SensorDataPoint {
  _id: string;
  UniqueID: string;
  TimeStamp: string;
  InsertDate: string;
  ExperimentData_Exp_name: string;
  ExperimentData_MAC_address: string;
  // Sensor values - we'll make all of them optional with ?
  SensorData_temperature?: number;
  SensorData_humidity?: number;
  SensorData_light?: number;
  SensorData_barometric_pressure?: number;
  SensorData_barometric_temp?: number;
  SensorData_battery?: number;
  SensorData_rssi?: number;
  // Allow any other fields
  [key: string]: any;
}

interface ExperimentDashboardProps {
  experimentId: string;
  experimentName: string;
  macAddress: string;
  onBack: () => void;
}

const ExperimentDashboard: React.FC<ExperimentDashboardProps> = ({ 
  experimentId, 
  experimentName, 
  macAddress,
  onBack 
}) => {
  // State variables
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SensorDataPoint[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [xAxis, setXAxis] = useState<string>('TimeStamp');
  const [yAxis, setYAxis] = useState<string>('SensorData_temperature');
  const [minDate, setMinDate] = useState<string>('');
  const [maxDate, setMaxDate] = useState<string>('');
  const [sensorFields, setSensorFields] = useState<string[]>([]);
  
  // Mock data fetch - in a real app, this would be an API call
  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setLoading(false);
      
      // For testing without actual data - set mock dates
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      setMinDate(yesterday.toISOString().slice(0, 16));
      setMaxDate(today.toISOString().slice(0, 16));
      setStartDate(yesterday.toISOString().slice(0, 16));
      setEndDate(today.toISOString().slice(0, 16));
      
      // Set mock sensor fields
      setSensorFields([
        'SensorData_temperature',
        'SensorData_humidity',
        'SensorData_light',
        'SensorData_barometric_pressure'
      ]);
    }, 1000);
  }, [experimentId, macAddress]);

  // Format field names for display
  const formatFieldName = (field: string): string => {
    if (field === 'TimeStamp') return 'Time';
    
    // Remove prefix and replace underscores with spaces
    return field
      .replace('SensorData_', '')
      .replace('ExperimentData_', '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize first letter of each word
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">{experimentName}</h2>
          <p className="text-gray-600">MAC Address: {macAddress}</p>
        </div>
        <button 
          onClick={onBack}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md transition"
        >
          Back to Experiments
        </button>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-md">
          {error}
        </div>
      ) : (
        <>
          {/* Date range selector */}
          <div className="mb-6 bg-gray-50 p-4 rounded-md">
            <h3 className="font-medium mb-2">Select Date Range</h3>
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Start Date</label>
                <input
                  type="datetime-local"
                  className="border rounded-md px-3 py-2"
                  value={startDate}
                  min={minDate}
                  max={endDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">End Date</label>
                <input
                  type="datetime-local"
                  className="border rounded-md px-3 py-2"
                  value={endDate}
                  min={startDate}
                  max={maxDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {/* Chart axis selectors */}
          <div className="mb-6 bg-gray-50 p-4 rounded-md">
            <h3 className="font-medium mb-2">Select Chart Axes</h3>
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">X-Axis</label>
                <select
                  className="border rounded-md px-3 py-2"
                  value={xAxis}
                  onChange={(e) => setXAxis(e.target.value)}
                >
                  <option value="TimeStamp">Time</option>
                  {sensorFields.map(field => (
                    <option key={`x-${field}`} value={field}>
                      {formatFieldName(field)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Y-Axis</label>
                <select
                  className="border rounded-md px-3 py-2"
                  value={yAxis}
                  onChange={(e) => setYAxis(e.target.value)}
                >
                  {sensorFields.map(field => (
                    <option key={`y-${field}`} value={field}>
                      {formatFieldName(field)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {/* Chart placeholder - we'll replace this with the actual chart later */}
          <div className="border rounded-lg h-96 flex items-center justify-center bg-gray-50">
            <p className="text-gray-400">
              Chart will be displayed here. Selected X: {formatFieldName(xAxis)}, Y: {formatFieldName(yAxis)}
            </p>
          </div>
          
          {/* Basic data summary */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-md">
              <h3 className="font-medium text-blue-700 mb-1">Data Points</h3>
              <p className="text-2xl font-bold">0</p>
            </div>
            <div className="bg-green-50 p-4 rounded-md">
              <h3 className="font-medium text-green-700 mb-1">Date Range</h3>
              <p className="text-sm">
                {new Date(startDate).toLocaleString()} - {new Date(endDate).toLocaleString()}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-md">
              <h3 className="font-medium text-purple-700 mb-1">Selected Metric</h3>
              <p className="text-lg font-medium">{formatFieldName(yAxis)}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ExperimentDashboard;