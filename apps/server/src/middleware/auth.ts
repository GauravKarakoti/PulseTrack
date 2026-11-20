import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

// Minimal HS256 JWT implementation using node:crypto (no extra dependency).
// `signToken` is intended for the upcoming login/register routes.

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not configured');
  return secret;
}

function sign(data: string): string {
  return createHmac('sha256', getSecret()).update(data).digest('base64url');
}

export function signToken(userId: number, ttlSeconds = DEFAULT_TTL_SECONDS): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ sub: String(userId), iat: now, exp: now + ttlSeconds }),
  ).toString('base64url');
  return `${header}.${payload}.${sign(`${header}.${payload}`)}`;
}

/** Returns the user id encoded in the token, or null if the token is invalid or expired. */
export function verifyToken(token: string): number | null {
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) return null;

  const expected = Buffer.from(sign(`${header}.${payload}`));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const { alg } = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
    if (alg !== 'HS256') return null;
    const { sub, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof exp !== 'number' || exp <= Math.floor(Date.now() / 1000)) return null;
    const userId = Number(sub);
    return Number.isInteger(userId) && userId > 0 ? userId : null;
  } catch {
    return null;
  }
}

/** Requires `Authorization: Bearer <token>`; sets `res.locals.userId` on success. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const match = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
  const userId = match?.[1] ? verifyToken(match[1]) : null;
  if (userId === null) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  res.locals.userId = userId;
  next();
}
