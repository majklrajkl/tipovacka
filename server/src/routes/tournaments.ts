import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema';
import { authRequired, adminRequired } from '../middleware/auth';

const router = Router();

// Get all tournaments (with membership info for current user)
router.get('/', authRequired, (req: Request, res: Response) => {
  const db = getDb();
  const tournaments = db.prepare(`
    SELECT t.*,
      (SELECT COUNT(*) FROM matches WHERE tournament_id = t.id) as match_count,
      (SELECT COUNT(*) FROM tournament_members WHERE tournament_id = t.id) as member_count
    FROM tournaments t
    ORDER BY t.created_at DESC
  `).all() as any[];

  // Get memberships for current user
  const memberships = db.prepare(
    'SELECT tournament_id FROM tournament_members WHERE user_id = ?'
  ).all(req.user!.userId) as any[];
  const joinedIds = new Set(memberships.map((m: any) => m.tournament_id));

  const result = tournaments.map((t: any) => ({
    ...t,
    joined: joinedIds.has(t.id),
  }));

  res.json({ tournaments: result });
});

// Get single tournament with matches and tips (requires membership)
router.get('/:id', authRequired, (req: Request, res: Response) => {
  const db = getDb();
  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id) as any;
  if (!tournament) {
    res.status(404).json({ error: 'Tournament not found' });
    return;
  }

  // Check membership (admins bypass)
  if (!req.user!.isAdmin) {
    const membership = db.prepare(
      'SELECT id FROM tournament_members WHERE user_id = ? AND tournament_id = ?'
    ).get(req.user!.userId, req.params.id);
    if (!membership) {
      res.status(403).json({ error: 'You must join this tournament first' });
      return;
    }
  }

  const matches = db.prepare(`
    SELECT m.*,
      CASE WHEN m.status != 'upcoming' OR datetime(m.kickoff) <= datetime('now') THEN 1 ELSE 0 END as tips_visible
    FROM matches m
    WHERE m.tournament_id = ?
    ORDER BY m.kickoff ASC
  `).all(tournament.id) as any[];

  // Only return users who are members of this tournament (+ current user)
  const members = db.prepare(`
    SELECT u.id, u.username FROM users u
    JOIN tournament_members tm ON u.id = tm.user_id
    WHERE tm.tournament_id = ?
  `).all(tournament.id) as any[];

  const memberIds = new Set(members.map((m: any) => m.id));
  // Make sure current user is included
  if (!memberIds.has(req.user!.userId)) {
    const currentUser = db.prepare('SELECT id, username FROM users WHERE id = ?').get(req.user!.userId) as any;
    if (currentUser) members.push(currentUser);
  }

  const tips = db.prepare('SELECT * FROM tips').all() as any[];

  const matchesWithTips = matches.map((match: any) => {
    const matchTips = tips.filter((t: any) => t.match_id === match.id);
    const tipsMap: Record<number, any> = {};
    matchTips.forEach((tip: any) => {
      if (match.tips_visible || tip.user_id === req.user!.userId) {
        // Only show tips from tournament members
        if (memberIds.has(tip.user_id) || tip.user_id === req.user!.userId) {
          tipsMap[tip.user_id] = {
            homeScore: tip.home_score,
            awayScore: tip.away_score,
          };
        }
      }
    });
    return { ...match, tips: tipsMap };
  });

  // Get tournament tips from members
  const tournamentTips = db.prepare(
    'SELECT * FROM tournament_tips WHERE tournament_id = ?'
  ).all(tournament.id) as any[];

  const tournamentTipsMap: Record<number, any> = {};
  tournamentTips.forEach((tip: any) => {
    if (tournament.status === 'finished' || tip.user_id === req.user!.userId) {
      if (memberIds.has(tip.user_id) || tip.user_id === req.user!.userId) {
        tournamentTipsMap[tip.user_id] = {
          winningTeam: tip.winning_team,
          bestScorer: tip.best_scorer,
        };
      }
    }
  });

  // Check if tournament tips can still be submitted (before first match kicks off)
  const firstMatch = matches.length > 0 ? matches[0] : null;
  const canSubmitTournamentTip = tournament.status === 'active' &&
    firstMatch && new Date(firstMatch.kickoff) > new Date();

  res.json({
    tournament,
    matches: matchesWithTips,
    users: members,
    tournamentTips: tournamentTipsMap,
    canSubmitTournamentTip,
  });
});

// Join a tournament
router.post('/:id/join', authRequired, (req: Request, res: Response) => {
  const db = getDb();
  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  if (!tournament) {
    res.status(404).json({ error: 'Tournament not found' });
    return;
  }

  const existing = db.prepare(
    'SELECT id FROM tournament_members WHERE user_id = ? AND tournament_id = ?'
  ).get(req.user!.userId, req.params.id);

  if (existing) {
    res.status(400).json({ error: 'Already joined this tournament' });
    return;
  }

  db.prepare(
    'INSERT INTO tournament_members (user_id, tournament_id) VALUES (?, ?)'
  ).run(req.user!.userId, req.params.id);

  res.json({ message: 'Joined tournament successfully' });
});

// Leave a tournament
router.post('/:id/leave', authRequired, (req: Request, res: Response) => {
  const db = getDb();
  db.prepare(
    'DELETE FROM tournament_members WHERE user_id = ? AND tournament_id = ?'
  ).run(req.user!.userId, req.params.id);

  res.json({ message: 'Left tournament successfully' });
});

// Create tournament (admin only)
router.post('/', authRequired, adminRequired, (req: Request, res: Response) => {
  const { name, description } = req.body;
  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Tournament name is required' });
    return;
  }

  const db = getDb();
  const result = db.prepare(
    'INSERT INTO tournaments (name, description) VALUES (?, ?)'
  ).run(name.trim(), description ? description.trim() : null);

  res.status(201).json({
    id: result.lastInsertRowid,
    name: name.trim(),
    description: description ? description.trim() : null,
    status: 'active',
  });
});

// Update tournament (admin only)
router.put('/:id', authRequired, adminRequired, (req: Request, res: Response) => {
  const { name, status, winnerTeam, bestScorer, description } = req.body;
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
  if (description !== undefined) { updates.push('description = ?'); values.push(description || null); }

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
  db.prepare('UPDATE matches SET tournament_id = NULL WHERE tournament_id = ?').run(req.params.id);
  db.prepare('DELETE FROM tournament_members WHERE tournament_id = ?').run(req.params.id);
  db.prepare('DELETE FROM tournaments WHERE id = ?').run(req.params.id);
  res.json({ message: 'Tournament deleted' });
});

// Submit or update tournament tip
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

  // Check membership
  const membership = db.prepare(
    'SELECT id FROM tournament_members WHERE user_id = ? AND tournament_id = ?'
  ).get(req.user!.userId, req.params.id);
  if (!membership) {
    res.status(403).json({ error: 'You must join this tournament first' });
    return;
  }

  // Check deadline: must be before the first match of the tournament starts
  const firstMatch = db.prepare(
    'SELECT kickoff FROM matches WHERE tournament_id = ? ORDER BY kickoff ASC LIMIT 1'
  ).get(req.params.id) as any;

  if (firstMatch && new Date(firstMatch.kickoff) <= new Date()) {
    res.status(400).json({ error: 'Tournament predictions can only be submitted before the first match starts' });
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
