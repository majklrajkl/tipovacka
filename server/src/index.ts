import express from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth';
import matchRoutes from './routes/matches';
import tipRoutes from './routes/tips';
import leaderboardRoutes from './routes/leaderboard';
import adminRoutes from './routes/admin';
import tournamentRoutes from './routes/tournaments';
import { startScheduler } from './lib/scheduler';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/tips', tipRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tournaments', tournamentRoutes);

// Serve static frontend in production
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startScheduler();
});
