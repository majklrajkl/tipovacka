import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/schema';
import { authRequired, adminRequired } from '../middleware/auth';

const router = Router();

// Get scoring rules
router.get('/scoring-rules', authRequired, (req: Request, res: Response) => {
  const db = getDb();
  const rules = db.prepare('SELECT * FROM scoring_rules').all();
  res.json({ rules });
});

// Update scoring rule
router.put('/scoring-rules/:id', authRequired, adminRequired, (req: Request, res: Response) => {
  const { points } = req.body;
  if (points == null || points < 0) {
    res.status(400).json({ error: 'Valid points value is required' });
    return;
  }

  const db = getDb();
  const rule = db.prepare('SELECT * FROM scoring_rules WHERE id = ?').get(req.params.id);
  if (!rule) {
    res.status(404).json({ error: 'Scoring rule not found' });
    return;
  }

  db.prepare('UPDATE scoring_rules SET points = ? WHERE id = ?').run(points, req.params.id);
  res.json({ message: 'Scoring rule updated' });
});

// Get all users (admin only)
router.get('/users', authRequired, adminRequired, (req: Request, res: Response) => {
  const db = getDb();
  const users = db.prepare('SELECT id, username, is_admin, created_at FROM users').all();
  res.json({ users });
});

// Toggle admin status
router.put('/users/:id/toggle-admin', authRequired, adminRequired, (req: Request, res: Response) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any;
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Prevent removing own admin status
  if (user.id === req.user!.userId) {
    res.status(400).json({ error: 'Cannot change your own admin status' });
    return;
  }

  db.prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(user.is_admin ? 0 : 1, user.id);
  res.json({ message: 'User admin status updated' });
});

// Reset/set user password (admin only)
router.put('/users/:id/reset-password', authRequired, adminRequired, (req: Request, res: Response) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters' });
    return;
  }

  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.params.id);
  res.json({ message: 'Password reset successfully' });
});

// Delete user (admin only)
router.delete('/users/:id', authRequired, adminRequired, (req: Request, res: Response) => {
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (Number(req.params.id) === req.user!.userId) {
    res.status(400).json({ error: 'Cannot delete your own account' });
    return;
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ message: 'User deleted' });
});

// Get all tournament members (admin only)
router.get('/tournament-members', authRequired, adminRequired, (req: Request, res: Response) => {
  const db = getDb();
  const members = db.prepare(`
    SELECT tm.*, u.username, t.name as tournament_name
    FROM tournament_members tm
    JOIN users u ON tm.user_id = u.id
    JOIN tournaments t ON tm.tournament_id = t.id
    ORDER BY t.name, u.username
  `).all();
  res.json({ members });
});

// Toggle paid status for a tournament member (admin only)
router.put('/tournament-members/:userId/:tournamentId/paid', authRequired, adminRequired, (req: Request, res: Response) => {
  const db = getDb();
  const member = db.prepare(
    'SELECT * FROM tournament_members WHERE user_id = ? AND tournament_id = ?'
  ).get(req.params.userId, req.params.tournamentId) as any;

  if (!member) {
    res.status(404).json({ error: 'Membership not found' });
    return;
  }

  db.prepare(
    'UPDATE tournament_members SET paid = ? WHERE user_id = ? AND tournament_id = ?'
  ).run(member.paid ? 0 : 1, req.params.userId, req.params.tournamentId);

  res.json({ message: 'Paid status updated' });
});

export default router;
