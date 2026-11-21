import { View, Text } from 'react-native';
import type Habit from '../database/models/Habit';

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  custom: 'Custom',
};

type Props = {
  habit: Habit;
};

export default function HabitCard({ habit }: Props) {
  return (
    <View className="flex-row items-center bg-white p-4 rounded-xl shadow-sm mb-3">
      <View
        className="w-3 h-10 rounded-full mr-4"
        // Habit colors are arbitrary hex values, so they can't be Tailwind classes.
        style={{ backgroundColor: habit.color || '#2563EB' }}
      />
      <View className="flex-1">
        <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
          {habit.icon ? `${habit.icon} ` : ''}
          {habit.name}
        </Text>
        <Text className="text-sm text-gray-500">
          {FREQUENCY_LABELS[habit.frequency] ?? habit.frequency}
        </Text>
      </View>
      <View className="items-end">
        <Text className="text-lg font-bold text-gray-900">🔥 {habit.currentStreak}</Text>
        <Text className="text-xs text-gray-400">Best {habit.longestStreak}</Text>
      </View>
    </View>
  );
}
