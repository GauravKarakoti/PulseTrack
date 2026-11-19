import { relations } from 'drizzle-orm';
import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// Schema for the optional cloud sync backend. Synced tables mirror the
// WatermelonDB tables on the device and share these conventions:
//  - `id` is the client-generated WatermelonDB id (string), not a serial.
//  - `is_deleted` soft-deletes rows so deletions can be pulled by other devices.
//  - `last_modified` is bumped on every write and drives the pull query
//    (`WHERE user_id = ? AND last_modified > lastPulledAt`).

const syncColumns = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  isDeleted: boolean('is_deleted').default(false).notNull(), // Required for WatermelonDB sync
  lastModified: timestamp('last_modified', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

// ---------------------------------------------------------------------------
// Server-only tables (not synced to the device)
// ---------------------------------------------------------------------------

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    displayName: varchar('display_name', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [uniqueIndex('users_email_idx').on(t.email)],
);

export const userPreferences = pgTable('user_preferences', {
  userId: integer('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  timezone: varchar('timezone', { length: 64 }).default('UTC').notNull(),
  syncEnabled: boolean('sync_enabled').default(true).notNull(),
  remindersEnabled: boolean('reminders_enabled').default(true).notNull(),
  theme: varchar('theme', { length: 16 }).default('system').notNull(), // 'light' | 'dark' | 'system'
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// ---------------------------------------------------------------------------
// Synced tables (mirror the WatermelonDB schema on the device)
// ---------------------------------------------------------------------------

export const routines = pgTable(
  'routines',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    timeOfDay: varchar('time_of_day', { length: 16 }), // 'morning' | 'afternoon' | 'evening' | null
    sortOrder: integer('sort_order').default(0).notNull(),
    ...syncColumns,
  },
  (t) => [index('routines_user_last_modified_idx').on(t.userId, t.lastModified)],
);

export const habits = pgTable(
  'habits',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    routineId: varchar('routine_id', { length: 255 }).references(() => routines.id, {
      onDelete: 'set null',
    }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    frequency: varchar('frequency', { length: 16 }).default('daily').notNull(), // 'daily' | 'weekly' | 'custom'
    targetDays: varchar('target_days', { length: 32 }), // e.g. '1,3,5' (ISO weekdays) for 'custom'
    targetCount: integer('target_count').default(1).notNull(), // completions required per period
    color: varchar('color', { length: 7 }).default('#2563EB').notNull(), // hex
    icon: varchar('icon', { length: 64 }),
    currentStreak: integer('current_streak').default(0).notNull(),
    longestStreak: integer('longest_streak').default(0).notNull(),
    isArchived: boolean('is_archived').default(false).notNull(),
    ...syncColumns,
  },
  (t) => [index('habits_user_last_modified_idx').on(t.userId, t.lastModified)],
);

export const completions = pgTable(
  'completions',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    habitId: varchar('habit_id', { length: 255 })
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    completedAt: timestamp('completed_at', { withTimezone: true }).notNull(),
    count: integer('count').default(1).notNull(),
    note: text('note'),
    ...syncColumns,
  },
  (t) => [
    index('completions_user_last_modified_idx').on(t.userId, t.lastModified),
    index('completions_habit_completed_at_idx').on(t.habitId, t.completedAt),
  ],
);

// ---------------------------------------------------------------------------
// Relations (enable `db.query.*` relational queries)
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ one, many }) => ({
  preferences: one(userPreferences),
  routines: many(routines),
  habits: many(habits),
  completions: many(completions),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, { fields: [userPreferences.userId], references: [users.id] }),
}));

export const routinesRelations = relations(routines, ({ one, many }) => ({
  user: one(users, { fields: [routines.userId], references: [users.id] }),
  habits: many(habits),
}));

export const habitsRelations = relations(habits, ({ one, many }) => ({
  user: one(users, { fields: [habits.userId], references: [users.id] }),
  routine: one(routines, { fields: [habits.routineId], references: [routines.id] }),
  completions: many(completions),
}));

export const completionsRelations = relations(completions, ({ one }) => ({
  user: one(users, { fields: [completions.userId], references: [users.id] }),
  habit: one(habits, { fields: [completions.habitId], references: [habits.id] }),
}));

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type UserPreferences = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;

export type Routine = typeof routines.$inferSelect;
export type NewRoutine = typeof routines.$inferInsert;

export type Habit = typeof habits.$inferSelect;
export type NewHabit = typeof habits.$inferInsert;

export type Completion = typeof completions.$inferSelect;
export type NewCompletion = typeof completions.$inferInsert;
