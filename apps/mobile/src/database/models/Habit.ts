import { Model } from '@nozbe/watermelondb';
import type { Associations } from '@nozbe/watermelondb/Model';

export default class Habit extends Model {
  static table = 'habits';

  static associations: Associations = {
    routines: { type: 'belongs_to', key: 'routine_id' },
    completions: { type: 'has_many', foreignKey: 'habit_id' },
  };
}
