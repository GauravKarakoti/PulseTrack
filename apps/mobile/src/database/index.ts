import { appSchema, tableSchema } from '@nozbe/watermelondb';

// TODO: Define the offline database schema. 
// Note: This must logically mirror the Drizzle schema on the backend.

export default appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'habits',
      columns: [
        // WatermelonDB automatically adds 'id'
        { name: 'name', type: 'string' },
        // TODO: Add columns for frequency, color, streak data, etc.
        { name: 'created_at', type: 'number' }, 
        { name: 'updated_at', type: 'number' },
      ],
    }),
    // TODO: Add tables for routines, completions, and logs
  ],
});