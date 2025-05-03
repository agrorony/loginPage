import express, { Request, Response } from 'express';
import { bigQueryClient, bigQueryConfig } from '../dbConfig';

const router = express.Router();

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;

  if (!username || !password) {
    console.log('Missing username or password in request:', req.body);
    res.status(400).json({ success: false, message: 'Username and password are required' });
    return;
  }

  try {
    console.log('Login attempt received:', { username });

    const query = `
      SELECT email, hashed_password, created_at
      FROM \`${bigQueryConfig.dataset}.${bigQueryConfig.userTable}\`
      WHERE email = @username
    `;
    const options = {
      query,
      params: { username },
    };

    console.log('Executing query:', query, 'with params:', options.params);

    const [rows] = await bigQueryClient.query(options);

    if (rows.length === 0) {
      console.log('No user found for email:', username);
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const user = rows[0];
    const isMatch = password === user.hashed_password; // Plain text password comparison

    if (isMatch) {
      console.log('Password matched. Login successful.');

      const userResponse = {
        username: user.email,
        created_at: user.created_at,
      };

      res.status(200).json({
        success: true,
        message: 'Login successful',
        user: userResponse,
      });
    } else {
      console.log('Invalid password for email:', username);
      res.status(401).json({ success: false, message: 'Invalid password' });
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;