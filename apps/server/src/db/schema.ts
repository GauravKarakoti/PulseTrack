import { pgTable, serial, varchar, timestamp, boolean } from 'drizzle-orm/pg-core';

// TODO: Define the exact schema matching the mobile offline database
// Example: habits, routines, user_preferences

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  // TODO: Add authentication fields (email, password hash, etc.)
  createdAt: timestamp('created_at').defaultNow(),
});

export const habits = pgTable('habits', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: serial('user_id').references(() => users.id),
  // TODO: Add habit specifics (name, frequency, color, streak count)
  isDeleted: boolean('is_deleted').default(false), // Required for WatermelonDB sync
  lastModified: timestamp('last_modified').defaultNow(),
});

// TODO: Export types for Drizzle schema