import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/schema';
import { signToken, authRequired } from '../middleware/auth';
import { sendPasswordResetEmail } from '../lib/email';

const router = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/register', (req: Request, res: Response) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email) {
    res.status(400).json({ error: 'Username, email and password are required' });
    return;
  }
  if (username.length < 3 || username.length > 30) {
    res.status(400).json({ error: 'Username must be 3-30 characters' });
    return;
  }
  if (!EMAIL_REGEX.test(email)) {
    res.status(400).json({ error: 'Invalid email address' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    res.status(409).json({ error: 'Username already taken' });
    return;
  }
  const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existingEmail) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, password, email) VALUES (?, ?, ?)').run(username, hash, email);

  const token = signToken({
    userId: result.lastInsertRowid as number,
    username,
    isAdmin: false,
  });

  res.status(201).json({
    token,
    user: { id: result.lastInsertRowid, username, isAdmin: false, email },
  });
});

router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
  if (!user || !bcrypt.compareSync(password, user.password)) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  const token = signToken({
    userId: user.id,
    username: user.username,
    isAdmin: !!user.is_admin,
  });

  res.json({
    token,
    user: { id: user.id, username: user.username, isAdmin: !!user.is_admin, email: user.email },
  });
});

router.post('/forgot-password', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  const db = getDb();
  const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email) as any;

  // Always return success to prevent email enumeration
  if (!user) {
    res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    return;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  db.prepare('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)').run(
    user.id,
    token,
    expiresAt
  );

  sendPasswordResetEmail(user.email, token).catch((err) => {
    console.error('Failed to send password reset email:', err);
  });

  res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
});

router.post('/reset-password', (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    res.status(400).json({ error: 'Token and new password are required' });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  const db = getDb();
  const resetToken = db
    .prepare('SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0')
    .get(token) as any;

  if (!resetToken) {
    res.status(400).json({ error: 'Invalid or expired reset link' });
    return;
  }

  if (new Date(resetToken.expires_at) < new Date()) {
    res.status(400).json({ error: 'Reset link has expired' });
    return;
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, resetToken.user_id);
  db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(resetToken.id);

  res.json({ message: 'Password has been reset successfully' });
});

router.post('/change-password', authRequired, (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Current and new password are required' });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters' });
    return;
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.userId) as any;
  if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
    res.status(401).json({ error: 'Current password is incorrect' });
    return;
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.user!.userId);

  res.json({ message: 'Password changed successfully' });
});

router.get('/me', authRequired, (req: Request, res: Response) => {
  const db = getDb();
  const user = db.prepare('SELECT id, username, is_admin, email, email_notifications FROM users WHERE id = ?').get(req.user!.userId) as any;
  res.json({
    user: {
      id: user.id,
      username: user.username,
      isAdmin: !!user.is_admin,
      email: user.email,
      emailNotifications: !!user.email_notifications,
    },
  });
});

router.put('/notifications', authRequired, (req: Request, res: Response) => {
  const { emailNotifications } = req.body;
  if (typeof emailNotifications !== 'boolean') {
    res.status(400).json({ error: 'emailNotifications must be a boolean' });
    return;
  }

  const db = getDb();
  db.prepare('UPDATE users SET email_notifications = ? WHERE id = ?').run(emailNotifications ? 1 : 0, req.user!.userId);

  res.json({ message: 'Notification preferences updated' });
});

export default router;
