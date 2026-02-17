import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema';
import { authRequired, adminRequired } from '../middleware/auth';

const router = Router();

// Get all matches with tips from all users
router.get('/', authRequired, (req: Request, res: Response) => {
  const db = getDb();
  const matches = db.prepare(`
    SELECT m.*,
      CASE WHEN m.status != 'upcoming' OR datetime(m.kickoff) <= datetime('now') THEN 1 ELSE 0 END as tips_visible
    FROM matches m
    ORDER BY m.kickoff ASC
  `).all() as any[];

  const users = db.prepare('SELECT id, username FROM users').all() as any[];
  const tips = db.prepare('SELECT * FROM tips').all() as any[];

  const result = matches.map((match) => {
    const matchTips = tips.filter((t: any) => t.match_id === match.id);
    const tipsMap: Record<number, any> = {};
    matchTips.forEach((tip: any) => {
      // Only show other users' tips if the match has started
      if (match.tips_visible || tip.user_id === req.user!.userId) {
        tipsMap[tip.user_id] = {
          homeScore: tip.home_score,
          awayScore: tip.away_score,
        };
      }
    });

    return {
      ...match,
      tips: tipsMap,
    };
  });

  res.json({ matches: result, users });
});

// Create a match (admin only)
router.post('/', authRequired, adminRequired, (req: Request, res: Response) => {
  const { homeTeam, awayTeam, kickoff, tournamentId } = req.body;
  if (!homeTeam || !awayTeam || !kickoff) {
    res.status(400).json({ error: 'Home team, away team, and kickoff time are required' });
    return;
  }

  const db = getDb();
  const result = db.prepare(
    'INSERT INTO matches (home_team, away_team, kickoff, tournament_id) VALUES (?, ?, ?, ?)'
  ).run(homeTeam, awayTeam, kickoff, tournamentId || null);

  res.status(201).json({
    id: result.lastInsertRowid,
    home_team: homeTeam,
    away_team: awayTeam,
    kickoff,
    tournament_id: tournamentId || null,
    status: 'upcoming',
  });
});

// Update match result (admin only)
router.put('/:id/result', authRequired, adminRequired, (req: Request, res: Response) => {
  const { homeScore, awayScore, status } = req.body;
  if (homeScore == null || awayScore == null) {
    res.status(400).json({ error: 'Home score and away score are required' });
    return;
  }

  const db = getDb();
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  if (!match) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }

  db.prepare(
    'UPDATE matches SET home_score = ?, away_score = ?, status = ? WHERE id = ?'
  ).run(homeScore, awayScore, status || 'finished', req.params.id);

  res.json({ message: 'Match result updated' });
});

// Update match details (admin only)
router.put('/:id', authRequired, adminRequired, (req: Request, res: Response) => {
  const { homeTeam, awayTeam, kickoff, status } = req.body;
  const db = getDb();
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  if (!match) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }

  const updates: string[] = [];
  const values: any[] = [];
  if (homeTeam) { updates.push('home_team = ?'); values.push(homeTeam); }
  if (awayTeam) { updates.push('away_team = ?'); values.push(awayTeam); }
  if (kickoff) { updates.push('kickoff = ?'); values.push(kickoff); }
  if (status) { updates.push('status = ?'); values.push(status); }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  values.push(req.params.id);
  db.prepare(`UPDATE matches SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  res.json({ message: 'Match updated' });
});

// Delete match (admin only)
router.delete('/:id', authRequired, adminRequired, (req: Request, res: Response) => {
  const db = getDb();
  db.prepare('DELETE FROM matches WHERE id = ?').run(req.params.id);
  res.json({ message: 'Match deleted' });
});

export default router;
