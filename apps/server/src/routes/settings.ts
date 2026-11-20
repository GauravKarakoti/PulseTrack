import { Router, type Request, type Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { userPreferences, type UserPreferences } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const THEMES = new Set(['light', 'dark', 'system']);

const DEFAULTS = {
  timezone: 'UTC',
  syncEnabled: true,
  remindersEnabled: true,
  theme: 'system',
};

function toResponse(prefs: UserPreferences | undefined) {
  if (!prefs) return DEFAULTS;
  const { timezone, syncEnabled, remindersEnabled, theme } = prefs;
  return { timezone, syncEnabled, remindersEnabled, theme };
}

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Returns the user's preferences, or defaults if they have never saved any. */
export async function getPreferences(userId: number) {
  const [prefs] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);
  return toResponse(prefs);
}

/** GET /settings -> { timezone, syncEnabled, remindersEnabled, theme } */
router.get('/', async (req: Request, res: Response) => {
  res.status(200).json(await getPreferences(res.locals.userId as number));
});

/** PATCH /settings { timezone?, syncEnabled?, remindersEnabled?, theme? } -> updated settings */
router.patch('/', async (req: Request, res: Response) => {
  const userId = res.locals.userId as number;
  const { timezone, syncEnabled, remindersEnabled, theme } = req.body ?? {};
  const updates: Partial<typeof DEFAULTS> = {};

  if (timezone !== undefined) {
    if (typeof timezone !== 'string' || timezone.length > 64 || !isValidTimezone(timezone)) {
      res.status(400).json({ error: 'Invalid timezone' });
      return;
    }
    updates.timezone = timezone;
  }
  if (syncEnabled !== undefined) {
    if (typeof syncEnabled !== 'boolean') {
      res.status(400).json({ error: 'syncEnabled must be a boolean' });
      return;
    }
    updates.syncEnabled = syncEnabled;
  }
  if (remindersEnabled !== undefined) {
    if (typeof remindersEnabled !== 'boolean') {
      res.status(400).json({ error: 'remindersEnabled must be a boolean' });
      return;
    }
    updates.remindersEnabled = remindersEnabled;
  }
  if (theme !== undefined) {
    if (typeof theme !== 'string' || !THEMES.has(theme)) {
      res.status(400).json({ error: 'theme must be one of: light, dark, system' });
      return;
    }
    updates.theme = theme;
  }

  if (Object.keys(updates).length === 0) {
    res.status(200).json(await getPreferences(userId));
    return;
  }

  const [prefs] = await db
    .insert(userPreferences)
    .values({ userId, ...updates })
    .onConflictDoUpdate({ target: userPreferences.userId, set: updates })
    .returning();

  res.status(200).json(toResponse(prefs));
});

export default router;
