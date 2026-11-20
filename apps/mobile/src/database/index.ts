import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

// The offline schema lives in ./schema.ts and mirrors the Drizzle schema on the backend.
import schema from './schema';
import Routine from './models/Routine';
import Habit from './models/Habit';
import Completion from './models/Completion';

const adapter = new SQLiteAdapter({
  schema,
  // JSI is much faster, but needs WatermelonDB's native module, so the app must
  // run as a development build (Expo Go does not include it).
  jsi: true,
  onSetUpError: (error) => {
    // The local database failed to open (e.g. a schema change without a migration).
    console.error('Failed to set up the local database', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [Routine, Habit, Completion],
});

export { Routine, Habit, Completion };
export default schema;
