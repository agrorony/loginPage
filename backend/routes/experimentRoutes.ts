import express from 'express';
import { ExperimentDataService } from '../services/ExperimentDataService';

const router = express.Router();
const experimentService = new ExperimentDataService();

/**
 * GET /api/experiments
 * Fetch metadata for all experiments, including timestamps and functional sensors.
 */
router.get('/experiments', async (req, res) => {
  try {
    const datasetName = 'your_dataset_name'; // Replace with actual dataset name
    const tableName = 'your_table_name'; // Replace with actual table name

    // Fetch timestamps
    const timestamps = await experimentService.getExperimentTimestamps(datasetName, tableName);

    // Fetch functional sensors
    const sensors = await experimentService.getFunctionalSensors(datasetName, tableName);

    // Combine the data into a single response
    const experiments = timestamps.map((timestamp) => ({
      ...timestamp,
      functionalSensors: sensors.find(s => s.experimentName === timestamp.experimentName)?.functionalSensors || [],
    }));

    res.json(experiments);
  } catch (error) {
    console.error('Error fetching experiment data:', error);
    res.status(500).send({ error: 'Failed to fetch experiment data' });
  }
});

export default router;