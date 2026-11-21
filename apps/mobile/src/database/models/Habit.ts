import { Model } from '@nozbe/watermelondb';
import type { Associations } from '@nozbe/watermelondb/Model';

export type HabitFrequency = 'daily' | 'weekly' | 'custom';

export default class Habit extends Model {
  static table = 'habits';

  static associations: Associations = {
    routines: { type: 'belongs_to', key: 'routine_id' },
    completions: { type: 'has_many', foreignKey: 'habit_id' },
  };

  // Read-only accessors. These stand in for @field decorators, which need the
  // Babel decorators plugin (not configured yet).
  get name(): string {
    return this._getRaw('name') as string;
  }

  get frequency(): HabitFrequency {
    return this._getRaw('frequency') as HabitFrequency;
  }

  get color(): string {
    return this._getRaw('color') as string;
  }

  get icon(): string | null {
    return this._getRaw('icon') as string | null;
  }

  get currentStreak(): number {
    return this._getRaw('current_streak') as number;
  }

  get longestStreak(): number {
    return this._getRaw('longest_streak') as number;
  }
}
