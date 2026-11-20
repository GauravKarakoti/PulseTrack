import { appSchema, tableSchema } from '@nozbe/watermelondb';

// Offline database schema. Mirrors the synced tables of the Drizzle schema in
// apps/server/src/db/schema.ts — column names here must match the Postgres
// column names exactly, since the sync endpoints exchange raw records keyed by them.
//
// Conventions:
//  - WatermelonDB adds `id` (and `_status` / `_changed` for sync) automatically.
//  - Timestamps are stored as numbers (ms since epoch); the server converts them.
//  - Server-only columns (`user_id`, `is_deleted`, `last_modified`) are not stored
//    locally: the user is implied by the auth token, deletions are tracked by
//    WatermelonDB itself, and the pull timestamp replaces `last_modified`.
//  - Columns that are nullable on the server are `isOptional` here.

export default appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'routines',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'time_of_day', type: 'string', isOptional: true }, // 'morning' | 'afternoon' | 'evening'
        { name: 'sort_order', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'habits',
      columns: [
        { name: 'routine_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'frequency', type: 'string' }, // 'daily' | 'weekly' | 'custom'
        { name: 'target_days', type: 'string', isOptional: true }, // e.g. '1,3,5' (ISO weekdays) for 'custom'
        { name: 'target_count', type: 'number' }, // completions required per period
        { name: 'color', type: 'string' }, // hex, e.g. '#2563EB'
        { name: 'icon', type: 'string', isOptional: true },
        { name: 'current_streak', type: 'number' },
        { name: 'longest_streak', type: 'number' },
        { name: 'is_archived', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'completions',
      columns: [
        { name: 'habit_id', type: 'string', isIndexed: true },
        { name: 'completed_at', type: 'number', isIndexed: true },
        { name: 'count', type: 'number' },
        { name: 'note', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
