import { Router, Request, Response } from 'express';
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

export default router;
