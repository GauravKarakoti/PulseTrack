// Must be the first import: modules below (e.g. db) read env vars at import time.
import 'dotenv/config';
import './env.js';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import syncRoutes from './routes/sync.js';
import authRoutes from './routes/auth.js';
import settingsRoutes from './routes/settings.js';
import analyticsRoutes from './routes/analytics.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'PulseTrack API' });
});

app.use('/api/v1', syncRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Express 5 forwards rejected async handlers here.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  // Malformed JSON bodies come from express.json() as 400s.
  const status = (err as { status?: number }).status;
  if (status && status >= 400 && status < 500) {
    res.status(status).json({ error: 'Invalid request' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`PulseTrack Server running on port ${PORT}`);
});