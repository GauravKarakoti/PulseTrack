import type { Database } from '@nozbe/watermelondb';
import { synchronize } from '@nozbe/watermelondb/sync';
import { getAuthToken } from './session';

// Base URL of the Express API, e.g. http://192.168.1.10:3000 (set in apps/mobile/.env).
// Note: on a device or Android emulator, `localhost` is not your computer.
const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');

export class SyncError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = 'SyncError';
  }
}

async function request(path: string, init: RequestInit = {}) {
  const token = getAuthToken();
  if (!API_URL) throw new SyncError('Sync server is not configured (EXPO_PUBLIC_API_URL)');
  if (!token) throw new SyncError('Sign in to sync your habits', 401);

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1${path}`, {
      ...init,
      headers: {
        ...init.headers,
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new SyncError('Could not reach the sync server');
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new SyncError(body?.error ?? `Sync failed (${response.status})`, response.status);
  }
  return body;
}

function runSync(database: Database) {
  return synchronize({
    database,
    pullChanges: async ({ lastPulledAt, schemaVersion }) => {
      const params = new URLSearchParams({
        lastPulledAt: lastPulledAt == null ? 'null' : String(lastPulledAt),
        schemaVersion: String(schemaVersion),
      });
      const { changes, timestamp } = await request(`/sync?${params}`);
      return { changes, timestamp };
    },
    pushChanges: async ({ changes, lastPulledAt }) => {
      await request('/sync', {
        method: 'POST',
        body: JSON.stringify({ changes, lastPulledAt }),
      });
    },
  });
}

/**
 * Pulls server changes into the local database, then pushes local changes.
 * If the server reports a conflict (409: it changed since our pull), the sync
 * is retried once, which pulls the newer changes before pushing again.
 */
export async function syncWithServer(database: Database) {
  try {
    await runSync(database);
  } catch (error) {
    if (error instanceof SyncError && error.status === 409) {
      await runSync(database);
      return;
    }
    throw error;
  }
}
