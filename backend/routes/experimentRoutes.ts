import express from 'express';
import { getExperimentMetadata } from '../controllers/experimentMetadataController';

const router = express.Router();

// Update the route path to match what the frontend is expecting
// It should just be '/experiments/metadata' since we're already mounting under '/api'
router.post('/experiments/metadata', async (req, res, next) => {
  try {
    await getExperimentMetadata(req, res);
  } catch (error) {
    next(error);
  }
});

export default router;