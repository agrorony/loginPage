import express, { Request, Response } from 'express';
import { fetchPermissions } from '../helpers/permissionsHelper';

const router = express.Router();

/**
 * Route to fetch permissions for a user.
 * Expects a POST request with the user's email in the body.
 */
router.post('/permissions', async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    console.log('[POST /permissions] Missing email in request body:', req.body);
    res.status(400).json({ success: false, message: 'Email is required' });
    return;
  }

  try {
    console.log(`[POST /permissions] Fetching permissions for email: ${email}`);
    const permissions = await fetchPermissions(email);
    res.status(200).json({ success: true, permissions });
  } catch (error) {
    console.error('[POST /permissions] Error fetching permissions:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;