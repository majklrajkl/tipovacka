import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required. Set it in your .env file.');
  process.exit(1);
}

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: IS_PRODUCTION ? 'strict' as const : 'lax' as const,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/',
};

export interface AuthPayload {
  userId: number;
  username: string;
  isAdmin: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: '24h' });
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie('token', token, COOKIE_OPTIONS);

  // Set a non-httpOnly CSRF token that the client can read
  const csrfToken = crypto.randomBytes(32).toString('hex');
  res.cookie('csrf', csrfToken, {
    httpOnly: false,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? 'strict' as const : 'lax' as const,
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie('token', { path: '/' });
  res.clearCookie('csrf', { path: '/' });
}

export function authRequired(req: Request, res: Response, next: NextFunction): void {
  // Read token from httpOnly cookie (preferred) or Authorization header (backwards compat)
  let token: string | undefined;

  if (req.cookies?.token) {
    token = req.cookies.token;
  } else {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      token = header.split(' ')[1];
    }
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as AuthPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function adminRequired(req: Request, res: Response, next: NextFunction): void {
  if (!req.user?.isAdmin) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

/**
 * CSRF protection for state-changing requests (POST/PUT/DELETE).
 * Validates that the X-CSRF-Token header matches the csrf cookie.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Only check state-changing methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  const csrfCookie = req.cookies?.csrf;
  const csrfHeader = req.headers['x-csrf-token'];

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    res.status(403).json({ error: 'Invalid CSRF token' });
    return;
  }

  next();
}
