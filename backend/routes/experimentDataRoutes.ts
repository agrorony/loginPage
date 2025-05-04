import express from 'express';
import { getExperimentData } from '../controllers/experimentDataController';

const router = express.Router();

/**
 * Route to fetch experiment data based on experiment name, time range, and selected fields.
 */
router.post('/experiments/data', async (req, res, next) => {
  try {
    await getExperimentData(req, res);
  } catch (error) {
    next(error);
  }
});

export default router;