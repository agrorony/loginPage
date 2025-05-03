import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import sourceMapSupport from 'source-map-support';
import experimentRoutes from './routes/experimentRoutes';
import loginHandler from './routes/loginHandler';
import permissionsRoutes from './routes/permissionsRoutes'; // Import the new permissions routes

sourceMapSupport.install();
dotenv.config();

// ===== SERVER INITIALIZATION =====
const app = express();
const httpServer = createServer(app);

// ===== MIDDLEWARE SETUP =====
app.use(cors());
app.use(express.json());

// ===== ROUTES =====
app.use('/api', experimentRoutes); // Experiment routes
app.use('/api', loginHandler); // Login route
app.use('/api', permissionsRoutes); // Permissions route

// ===== START SERVER =====
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});