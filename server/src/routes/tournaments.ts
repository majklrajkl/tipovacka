import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema';
import { authRequired, adminRequired } from '../middleware/auth';

const router = Router();

// Get all tournaments
router.get('/', authRequired, (req: Request, res: Response) => {
  const db = getDb();
  const tournaments = db.prepare(`
    SELECT t.*,
      (SELECT COUNT(*) FROM matches WHERE tournament_id = t.id) as match_count
    FROM tournaments t
    ORDER BY t.created_at DESC
  `).all() as any[];

  res.json({ tournaments });
});

// Get single tournament with matches and tips
router.get('/:id', authRequired, (req: Request, res: Response) => {
  const db = getDb();
  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id) as any;
  if (!tournament) {
    res.status(404).json({ error: 'Tournament not found' });
    return;
  }

  const matches = db.prepare(`
    SELECT m.*,
      CASE WHEN m.status != 'upcoming' OR datetime(m.kickoff) <= datetime('now') THEN 1 ELSE 0 END as tips_visible
    FROM matches m
    WHERE m.tournament_id = ?
    ORDER BY m.kickoff ASC
  `).all(tournament.id) as any[];

  const users = db.prepare('SELECT id, username FROM users').all() as any[];
  const tips = db.prepare('SELECT * FROM tips').all() as any[];

  const matchesWithTips = matches.map((match: any) => {
    const matchTips = tips.filter((t: any) => t.match_id === match.id);
    const tipsMap: Record<number, any> = {};
    matchTips.forEach((tip: any) => {
      if (match.tips_visible || tip.user_id === req.user!.userId) {
        tipsMap[tip.user_id] = {
          homeScore: tip.home_score,
          awayScore: tip.away_score,
        };
      }
    });
    return { ...match, tips: tipsMap };
  });

  // Get tournament tips from all users
  const tournamentTips = db.prepare(
    'SELECT * FROM tournament_tips WHERE tournament_id = ?'
  ).all(tournament.id) as any[];

  const tournamentTipsMap: Record<number, any> = {};
  tournamentTips.forEach((tip: any) => {
    // Only show other users' tips if tournament is finished
    if (tournament.status === 'finished' || tip.user_id === req.user!.userId) {
      tournamentTipsMap[tip.user_id] = {
        winningTeam: tip.winning_team,
        bestScorer: tip.best_scorer,
      };
    }
  });

  res.json({
    tournament,
    matches: matchesWithTips,
    users,
    tournamentTips: tournamentTipsMap,
  });
});

// Create tournament (admin only)
router.post('/', authRequired, adminRequired, (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Tournament name is required' });
    return;
  }

  const db = getDb();
  const result = db.prepare(
    'INSERT INTO tournaments (name) VALUES (?)'
  ).run(name.trim());

  res.status(201).json({
    id: result.lastInsertRowid,
    name: name.trim(),
    status: 'active',
  });
});

// Update tournament (admin only) - set name, status, winner, best scorer
router.put('/:id', authRequired, adminRequired, (req: Request, res: Response) => {
  const { name, status, winnerTeam, bestScorer } = req.body;
  const db = getDb();

  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  if (!tournament) {
    res.status(404).json({ error: 'Tournament not found' });
    return;
  }

  const updates: string[] = [];
  const values: any[] = [];
  if (name) { updates.push('name = ?'); values.push(name.trim()); }
  if (status) { updates.push('status = ?'); values.push(status); }
  if (winnerTeam !== undefined) { updates.push('winner_team = ?'); values.push(winnerTeam || null); }
  if (bestScorer !== undefined) { updates.push('best_scorer = ?'); values.push(bestScorer || null); }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  values.push(req.params.id);
  db.prepare(`UPDATE tournaments SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  res.json({ message: 'Tournament updated' });
});

// Delete tournament (admin only)
router.delete('/:id', authRequired, adminRequired, (req: Request, res: Response) => {
  const db = getDb();
  // Unlink matches from tournament before deleting
  db.prepare('UPDATE matches SET tournament_id = NULL WHERE tournament_id = ?').run(req.params.id);
  db.prepare('DELETE FROM tournaments WHERE id = ?').run(req.params.id);
  res.json({ message: 'Tournament deleted' });
});

// Submit or update tournament tip (winning team + best scorer)
router.post('/:id/tips', authRequired, (req: Request, res: Response) => {
  const { winningTeam, bestScorer } = req.body;
  if (!winningTeam || !bestScorer) {
    res.status(400).json({ error: 'Winning team and best scorer are required' });
    return;
  }

  const db = getDb();
  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id) as any;
  if (!tournament) {
    res.status(404).json({ error: 'Tournament not found' });
    return;
  }

  if (tournament.status !== 'active') {
    res.status(400).json({ error: 'Tips can only be placed on active tournaments' });
    return;
  }

  // Upsert tournament tip
  const existing = db.prepare(
    'SELECT id FROM tournament_tips WHERE user_id = ? AND tournament_id = ?'
  ).get(req.user!.userId, req.params.id);

  if (existing) {
    db.prepare(
      `UPDATE tournament_tips SET winning_team = ?, best_scorer = ?, updated_at = datetime('now') WHERE user_id = ? AND tournament_id = ?`
    ).run(winningTeam.trim(), bestScorer.trim(), req.user!.userId, req.params.id);
  } else {
    db.prepare(
      'INSERT INTO tournament_tips (user_id, tournament_id, winning_team, best_scorer) VALUES (?, ?, ?, ?)'
    ).run(req.user!.userId, req.params.id, winningTeam.trim(), bestScorer.trim());
  }

  res.json({ message: 'Tournament tip saved successfully' });
});

export default router;
