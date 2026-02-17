import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema';
import { authRequired } from '../middleware/auth';

const router = Router();

// Submit or update a tip
router.post('/', authRequired, (req: Request, res: Response) => {
  const { matchId, homeScore, awayScore } = req.body;
  if (matchId == null || homeScore == null || awayScore == null) {
    res.status(400).json({ error: 'Match ID, home score, and away score are required' });
    return;
  }
  if (homeScore < 0 || awayScore < 0) {
    res.status(400).json({ error: 'Scores cannot be negative' });
    return;
  }

  const db = getDb();
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId) as any;
  if (!match) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }

  // Can only tip upcoming matches that haven't started yet
  if (match.status !== 'upcoming' || new Date(match.kickoff) <= new Date()) {
    res.status(400).json({ error: 'Tips can only be placed on upcoming matches before kickoff' });
    return;
  }

  // Upsert tip
  const existing = db.prepare(
    'SELECT id FROM tips WHERE user_id = ? AND match_id = ?'
  ).get(req.user!.userId, matchId);

  if (existing) {
    db.prepare(
      `UPDATE tips SET home_score = ?, away_score = ?, updated_at = datetime('now') WHERE user_id = ? AND match_id = ?`
    ).run(homeScore, awayScore, req.user!.userId, matchId);
  } else {
    db.prepare(
      'INSERT INTO tips (user_id, match_id, home_score, away_score) VALUES (?, ?, ?, ?)'
    ).run(req.user!.userId, matchId, homeScore, awayScore);
  }

  res.json({ message: 'Tip saved successfully' });
});

// Get my tips
router.get('/mine', authRequired, (req: Request, res: Response) => {
  const db = getDb();
  const tips = db.prepare('SELECT * FROM tips WHERE user_id = ?').all(req.user!.userId);
  res.json({ tips });
});

export default router;
