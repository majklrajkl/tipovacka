import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema';
import { authRequired, adminRequired, csrfProtection } from '../middleware/auth';

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
router.post('/', authRequired, adminRequired, csrfProtection, (req: Request, res: Response) => {
  const { homeTeam, awayTeam, kickoff, tournamentId, isPlayoff } = req.body;
  if (!homeTeam || !awayTeam || !kickoff) {
    res.status(400).json({ error: 'Home team, away team, and kickoff time are required' });
    return;
  }

  const db = getDb();
  const result = db.prepare(
    'INSERT INTO matches (home_team, away_team, kickoff, tournament_id, is_playoff) VALUES (?, ?, ?, ?, ?)'
  ).run(homeTeam, awayTeam, kickoff, tournamentId || null, isPlayoff ? 1 : 0);

  res.status(201).json({
    id: result.lastInsertRowid,
    home_team: homeTeam,
    away_team: awayTeam,
    kickoff,
    tournament_id: tournamentId || null,
    is_playoff: isPlayoff ? 1 : 0,
    status: 'upcoming',
  });
});

// Update match result (admin only)
router.put('/:id/result', authRequired, adminRequired, csrfProtection, (req: Request, res: Response) => {
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
router.put('/:id', authRequired, adminRequired, csrfProtection, (req: Request, res: Response) => {
  const { homeTeam, awayTeam, kickoff, status, isPlayoff } = req.body;
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
  if (isPlayoff !== undefined) { updates.push('is_playoff = ?'); values.push(isPlayoff ? 1 : 0); }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  values.push(req.params.id);
  db.prepare(`UPDATE matches SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  res.json({ message: 'Match updated' });
});

// Bulk import matches (admin only)
router.post('/import', authRequired, adminRequired, csrfProtection, (req: Request, res: Response) => {
  const { matches, tournamentId } = req.body;
  if (!Array.isArray(matches) || matches.length === 0) {
    res.status(400).json({ error: 'An array of matches is required' });
    return;
  }

  const db = getDb();
  const insert = db.prepare(
    'INSERT INTO matches (home_team, away_team, kickoff, tournament_id, is_playoff) VALUES (?, ?, ?, ?, ?)'
  );

  const errors: string[] = [];
  let imported = 0;

  const importAll = db.transaction(() => {
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      if (!m.homeTeam || !m.awayTeam || !m.kickoff) {
        errors.push(`Row ${i + 1}: missing homeTeam, awayTeam, or kickoff`);
        continue;
      }
      insert.run(m.homeTeam.trim(), m.awayTeam.trim(), m.kickoff.trim(), tournamentId || null, m.isPlayoff ? 1 : 0);
      imported++;
    }
  });

  importAll();

  res.status(201).json({ imported, errors });
});

// Delete match (admin only)
router.delete('/:id', authRequired, adminRequired, csrfProtection, (req: Request, res: Response) => {
  const db = getDb();
  db.prepare('DELETE FROM matches WHERE id = ?').run(req.params.id);
  res.json({ message: 'Match deleted' });
});

export default router;
