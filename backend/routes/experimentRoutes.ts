import express from 'express';
import { getExperimentMetadata } from '../controllers/experimentMetadataController';

const router = express.Router();

// Wrap the async handler to catch errors and pass them to the next middleware
router.post('/experiments/metadata', async (req, res, next) => {
  try {
    await getExperimentMetadata(req, res);
  } catch (error) {
    next(error);
  }
});

export default router;