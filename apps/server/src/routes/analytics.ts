import { Router, type Request, type Response } from 'express';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { completions, habits } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { getPreferences } from './settings.js';

const router = Router();
router.use(requireAuth);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_RANGE_DAYS = 30;
const MAX_RANGE_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;

type Range = { from: string; to: string; days: number };

/** Today's date (YYYY-MM-DD) in the given IANA timezone. */
function todayIn(timezone: string): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
}

function shiftDate(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

function isRealDate(value: string): boolean {
  return DATE_RE.test(value) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

/**
 * Parses `from`/`to` (inclusive, YYYY-MM-DD, in the user's timezone).
 * Defaults to the last 30 days ending today.
 */
function parseRange(query: Request['query'], timezone: string): Range | string {
  const to = query.to === undefined ? todayIn(timezone) : String(query.to);
  if (!isRealDate(to)) return 'to must be a date in YYYY-MM-DD format';

  const from = query.from === undefined ? shiftDate(to, -(DEFAULT_RANGE_DAYS - 1)) : String(query.from);
  if (!isRealDate(from)) return 'from must be a date in YYYY-MM-DD format';

  const days = Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS) + 1;
  if (days < 1) return 'from must not be after to';
  if (days > MAX_RANGE_DAYS) return `Range must be at most ${MAX_RANGE_DAYS} days`;

  return { from, to, days };
}

/** Completions owned by the user, not deleted, within the range in the user's timezone. */
function completionFilter(userId: number, range: Range, timezone: string) {
  return and(
    eq(completions.userId, userId),
    eq(completions.isDeleted, false),
    sql`${completions.completedAt} >= (${range.from}::date)::timestamp AT TIME ZONE ${timezone}`,
    sql`${completions.completedAt} < (${range.to}::date + 1)::timestamp AT TIME ZONE ${timezone}`,
  );
}

/**
 * GET /analytics/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Per-habit totals for the range plus overall totals. `completionRate` is the
 * share of days in the range with at least one completion, and is only
 * reported for daily habits.
 */
router.get('/summary', async (req: Request, res: Response) => {
  const userId = res.locals.userId as number;
  const { timezone } = await getPreferences(userId);
  const range = parseRange(req.query, timezone);
  if (typeof range === 'string') {
    res.status(400).json({ error: range });
    return;
  }

  const [habitRows, completionRows] = await Promise.all([
    db
      .select({
        id: habits.id,
        name: habits.name,
        color: habits.color,
        frequency: habits.frequency,
        currentStreak: habits.currentStreak,
        longestStreak: habits.longestStreak,
      })
      .from(habits)
      .where(and(eq(habits.userId, userId), eq(habits.isDeleted, false), eq(habits.isArchived, false)))
      .orderBy(asc(habits.createdAt)),
    db
      .select({
        habitId: completions.habitId,
        totalCount: sql<number>`coalesce(sum(${completions.count}), 0)::int`,
        daysCompleted: sql<number>`count(distinct (${completions.completedAt} AT TIME ZONE ${timezone})::date)::int`,
      })
      .from(completions)
      .where(completionFilter(userId, range, timezone))
      .groupBy(completions.habitId),
  ]);

  const byHabit = new Map(completionRows.map((row) => [row.habitId, row]));

  const habitStats = habitRows.map((habit) => {
    const stats = byHabit.get(habit.id);
    const daysCompleted = stats?.daysCompleted ?? 0;
    return {
      ...habit,
      totalCount: stats?.totalCount ?? 0,
      daysCompleted,
      completionRate: habit.frequency === 'daily' ? daysCompleted / range.days : null,
    };
  });

  res.status(200).json({
    range: { ...range, timezone },
    totals: {
      activeHabits: habitStats.length,
      completions: habitStats.reduce((sum, h) => sum + h.totalCount, 0),
      bestCurrentStreak: Math.max(0, ...habitStats.map((h) => h.currentStreak)),
      bestLongestStreak: Math.max(0, ...habitStats.map((h) => h.longestStreak)),
    },
    habits: habitStats,
  });
});

/**
 * GET /analytics/daily?from=YYYY-MM-DD&to=YYYY-MM-DD&habitId=<id>
 * Completions per day in the user's timezone (every day in the range is
 * included, with 0 for days without completions). Optionally scoped to one habit.
 */
router.get('/daily', async (req: Request, res: Response) => {
  const userId = res.locals.userId as number;
  const { timezone } = await getPreferences(userId);
  const range = parseRange(req.query, timezone);
  if (typeof range === 'string') {
    res.status(400).json({ error: range });
    return;
  }

  const habitId = req.query.habitId;
  if (habitId !== undefined && (typeof habitId !== 'string' || habitId.length === 0 || habitId.length > 255)) {
    res.status(400).json({ error: 'Invalid habitId' });
    return;
  }

  const rows = await db
    .select({
      day: sql<string>`to_char((${completions.completedAt} AT TIME ZONE ${timezone})::date, 'YYYY-MM-DD')`,
      count: sql<number>`sum(${completions.count})::int`,
    })
    .from(completions)
    .where(
      and(
        completionFilter(userId, range, timezone),
        habitId === undefined ? undefined : eq(completions.habitId, habitId),
      ),
    )
    // Group by ordinal: the day expression contains a bound parameter, so
    // repeating it in GROUP BY would not be recognised as the same expression.
    .groupBy(sql`1`);

  const counts = new Map(rows.map((row) => [row.day, row.count]));
  const days = Array.from({ length: range.days }, (_, i) => {
    const day = shiftDate(range.from, i);
    return { date: day, count: counts.get(day) ?? 0 };
  });

  res.status(200).json({ range: { ...range, timezone }, days });
});

export default router;
