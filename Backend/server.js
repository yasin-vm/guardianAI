import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import reportsRoutes from './routes/reportsRoutes.js';
import collectRoutes from './routes/collectRoutes.js';
import errorHandler from './middleware/errorHandler.js';

dotenv.config();
connectDB();

if (!process.env.JWT_SECRET) {
  console.error('Missing required environment variable: JWT_SECRET');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ message: 'GuardianAI API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/logs', activityRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/collect', collectRoutes);

// centralized error handler (should be last middleware)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
