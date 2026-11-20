// Must be the first import: modules below (e.g. db) read env vars at import time.
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import syncRoutes from './routes/sync.js';

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