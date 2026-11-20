import { Model } from '@nozbe/watermelondb';
import type { Associations } from '@nozbe/watermelondb/Model';

export default class Completion extends Model {
  static table = 'completions';

  static associations: Associations = {
    habits: { type: 'belongs_to', key: 'habit_id' },
  };
}
