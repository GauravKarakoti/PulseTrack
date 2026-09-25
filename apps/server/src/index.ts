import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import syncRoutes from './routes/sync.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'PulseTrack API' });
});

app.use('/api/v1', syncRoutes);

// TODO: Add routes for Authentication, User Settings, Analytics aggregations

app.listen(PORT, () => {
  console.log(`PulseTrack Server running on port ${PORT}`);
});