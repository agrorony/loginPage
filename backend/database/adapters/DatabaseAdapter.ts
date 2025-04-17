// backend/database/adapters/DatabaseAdapter.ts

export interface DatabaseAdapter {
    // Authentication/Permissions methods
    getUserByEmail(email: string): Promise<any>;
    getUserPermissions(email: string): Promise<any[]>;
    
    // Experiment data methods
    getExperimentData(
      experimentId: string, 
      startDate: string, 
      endDate: string, 
      macAddress?: string, 
      limit?: number
    ): Promise<any[]>;
    
    getSensorFields(experimentId: string): Promise<string[]>;
    
    getExperimentStatistics(
      experimentId: string,
      macAddress?: string,
      sensorField?: string,
      startDate?: string, 
      endDate?: string
    ): Promise<any>;
    
    // Database lifecycle methods
    close(): Promise<void>;
  }