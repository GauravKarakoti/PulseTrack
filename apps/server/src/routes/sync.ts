import { Router, type Request, type Response } from 'express';
import { and, eq, gt, inArray, getTableColumns } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { db } from '../db/index.js';
import { routines, habits, completions } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

/**
 * Tables exchanged with WatermelonDB, keyed by their WatermelonDB table name.
 * Order matters for push: parents are written before children (FKs).
 */
const SYNC_TABLES = { routines, habits, completions } as const;
type SyncTableName = keyof typeof SYNC_TABLES;
type SyncTable = (typeof SYNC_TABLES)[SyncTableName];

/** Columns the server owns; never accepted from the client. */
const SERVER_MANAGED = new Set(['userId', 'isDeleted', 'lastModified']);

type RawRecord = Record<string, unknown>;
type TableChanges = { created?: RawRecord[]; updated?: RawRecord[]; deleted?: string[] };

class SyncError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function isSyncTableName(name: string): name is SyncTableName {
  return Object.hasOwn(SYNC_TABLES, name);
}

/** Drizzle row -> WatermelonDB raw record (snake_case keys, timestamps as ms). */
function toRaw(table: SyncTable, row: Record<string, unknown>): RawRecord {
  const raw: RawRecord = {};
  for (const [key, column] of Object.entries(getTableColumns(table)) as [string, PgColumn][]) {
    if (SERVER_MANAGED.has(key)) continue;
    const value = row[key];
    raw[column.name] = value instanceof Date ? value.getTime() : value;
  }
  return raw;
}

/**
 * WatermelonDB raw record -> Drizzle values. Only whitelisted columns are read,
 * and each value is type-checked against the column definition.
 */
function fromRaw(table: SyncTable, raw: RawRecord, isInsert: boolean): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(getTableColumns(table)) as [string, PgColumn][]) {
    if (SERVER_MANAGED.has(key)) continue;
    const value = raw[column.name];

    if (value === undefined || value === null) {
      if (column.notNull && (isInsert ? !column.hasDefault : value === null)) {
        throw new SyncError(400, `Missing required field "${column.name}"`);
      }
      if (value === null) values[key] = null;
      continue;
    }

    const ok =
      column.dataType === 'date'
        ? typeof value === 'number' && Number.isFinite(value)
        : column.dataType === 'number'
          ? typeof value === 'number' && Number.isInteger(value)
          : column.dataType === 'boolean'
            ? typeof value === 'boolean'
            : typeof value === 'string';
    if (!ok) throw new SyncError(400, `Invalid value for field "${column.name}"`);

    values[key] = column.dataType === 'date' ? new Date(value as number) : value;
  }
  return values;
}

function parseTimestamp(value: unknown): number | null {
  if (value === undefined || value === null || value === 'null' || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new SyncError(400, 'Invalid lastPulledAt');
  return n;
}

function sendError(res: Response, error: unknown, fallback: string) {
  if (error instanceof SyncError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  console.error(fallback, error);
  res.status(500).json({ error: fallback });
}

/**
 * WatermelonDB Push Endpoint
 * Receives local changes from the device and applies them to PostgreSQL.
 */
router.post('/sync', requireAuth, async (req: Request, res: Response) => {
  const { changes, lastPulledAt } = req.body ?? {};
  const userId = res.locals.userId as number;

  try {
    const pulledAt = parseTimestamp(lastPulledAt);
    if (!changes || typeof changes !== 'object') throw new SyncError(400, 'Missing changes');

    for (const name of Object.keys(changes)) {
      if (!isSyncTableName(name)) throw new SyncError(400, `Unknown table "${name}"`);
    }

    const now = new Date();
    const queries: BatchItem<'pg'>[] = [];

    for (const name of Object.keys(SYNC_TABLES) as SyncTableName[]) {
      const table = SYNC_TABLES[name];
      const tableChanges: TableChanges = changes[name] ?? {};
      const created = tableChanges.created ?? [];
      const updated = tableChanges.updated ?? [];
      const deleted = tableChanges.deleted ?? [];

      if (!Array.isArray(created) || !Array.isArray(updated) || !Array.isArray(deleted)) {
        throw new SyncError(400, `Malformed changes for "${name}"`);
      }

      const ids = [...created, ...updated].map((r) => r?.id).concat(deleted);
      if (ids.some((id) => typeof id !== 'string' || id.length === 0 || id.length > 255)) {
        throw new SyncError(400, `Invalid record id in "${name}"`);
      }
      if (ids.length === 0) continue;

      // Ownership + conflict check: reject if any touched record belongs to another
      // user, or was modified on the server since the client's last pull. The client
      // must then pull and retry, per the WatermelonDB sync protocol.
      const existing = await db
        .select({ id: table.id, userId: table.userId, lastModified: table.lastModified })
        .from(table)
        .where(inArray(table.id, ids as string[]));

      for (const row of existing) {
        if (row.userId !== userId) {
          throw new SyncError(403, `Record "${row.id}" in "${name}" is not owned by this user`);
        }
        if (pulledAt === null || row.lastModified.getTime() > pulledAt) {
          throw new SyncError(409, 'Server has newer changes; pull before pushing');
        }
      }

      // Created and updated records are both upserts: retries may resend creates,
      // and an update for a record unknown to the server is treated as a create.
      for (const [records, isInsert] of [
        [created, true],
        [updated, false],
      ] as const) {
        for (const raw of records) {
          const values = fromRaw(table, raw, isInsert);
          queries.push(
            db
              .insert(table)
              .values({ ...values, userId, isDeleted: false, lastModified: now } as never)
              .onConflictDoUpdate({
                target: table.id,
                set: { ...values, id: undefined, lastModified: now } as never,
                setWhere: eq(table.userId, userId),
              }),
          );
        }
      }

      if (deleted.length > 0) {
        queries.push(
          db
            .update(table)
            .set({ isDeleted: true, lastModified: now })
            .where(and(eq(table.userId, userId), inArray(table.id, deleted))),
        );
      }
    }

    // neon-http has no interactive transactions; batch() runs all statements
    // in a single transaction, so the push is applied atomically.
    if (queries.length > 0) {
      await db.batch(queries as [BatchItem<'pg'>, ...BatchItem<'pg'>[]]);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    sendError(res, error, 'Sync push failed');
  }
});

/**
 * WatermelonDB Pull Endpoint
 * Sends backend changes to the device since `lastPulledAt`.
 */
router.get('/sync', requireAuth, async (req: Request, res: Response) => {
  const { lastPulledAt } = req.query;
  const userId = res.locals.userId as number;

  try {
    const pulledAt = parseTimestamp(lastPulledAt);
    // Capture the timestamp before querying so writes that land mid-pull are
    // picked up by the next pull rather than missed.
    const timestamp = Date.now();

    const changes: Record<string, { created: RawRecord[]; updated: RawRecord[]; deleted: string[] }> =
      {};

    for (const name of Object.keys(SYNC_TABLES) as SyncTableName[]) {
      const table = SYNC_TABLES[name];
      const rows: Record<string, unknown>[] = await db
        .select()
        .from(table)
        .where(
          pulledAt === null
            ? and(eq(table.userId, userId), eq(table.isDeleted, false))
            : and(eq(table.userId, userId), gt(table.lastModified, new Date(pulledAt))),
        );

      const tableChanges = (changes[name] = { created: [] as RawRecord[], updated: [] as RawRecord[], deleted: [] as string[] });
      for (const row of rows) {
        if (row.isDeleted) {
          tableChanges.deleted.push(row.id as string);
        } else if (pulledAt === null || (row.createdAt as Date).getTime() > pulledAt) {
          tableChanges.created.push(toRaw(table, row));
        } else {
          tableChanges.updated.push(toRaw(table, row));
        }
      }
    }

    res.status(200).json({ changes, timestamp });
  } catch (error) {
    sendError(res, error, 'Sync pull failed');
  }
});

export default router;
