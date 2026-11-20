import { Router, type Request, type Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, type User } from '../db/schema.js';
import { hashPassword, verifyAgainstDummy, verifyPassword } from '../lib/password.js';
import { requireAuth, signToken } from '../middleware/auth.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 256;

function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt.getTime(),
  };
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 255 && EMAIL_RE.test(email) ? email : null;
}

/** POST /auth/register { email, password, displayName? } -> { token, user } */
router.post('/register', async (req: Request, res: Response) => {
  const { email: rawEmail, password, displayName } = req.body ?? {};
  const email = normalizeEmail(rawEmail);

  if (!email) {
    res.status(400).json({ error: 'A valid email is required' });
    return;
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
    res.status(400).json({ error: `Password must be ${MIN_PASSWORD}-${MAX_PASSWORD} characters` });
    return;
  }
  if (displayName !== undefined && (typeof displayName !== 'string' || displayName.trim().length > 100)) {
    res.status(400).json({ error: 'Display name must be at most 100 characters' });
    return;
  }

  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash: await hashPassword(password),
      displayName: displayName?.trim() || null,
    })
    .onConflictDoNothing({ target: users.email })
    .returning();

  if (!user) {
    res.status(409).json({ error: 'An account with this email already exists' });
    return;
  }

  res.status(201).json({ token: signToken(user.id), user: publicUser(user) });
});

/** POST /auth/login { email, password } -> { token, user } */
router.post('/login', async (req: Request, res: Response) => {
  const { email: rawEmail, password } = req.body ?? {};
  const email = normalizeEmail(rawEmail);

  if (!email || typeof password !== 'string' || password.length > MAX_PASSWORD) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const valid = user
    ? await verifyPassword(password, user.passwordHash)
    : await verifyAgainstDummy(password);

  if (!user || !valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  res.status(200).json({ token: signToken(user.id), user: publicUser(user) });
});

/** GET /auth/me -> { user } */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, res.locals.userId as number))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  res.status(200).json({ user: publicUser(user) });
});

export default router;
