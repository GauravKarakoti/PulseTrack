import { Model } from '@nozbe/watermelondb';
import type { Associations } from '@nozbe/watermelondb/Model';

export default class Routine extends Model {
  static table = 'routines';

  static associations: Associations = {
    habits: { type: 'has_many', foreignKey: 'routine_id' },
  };
}
