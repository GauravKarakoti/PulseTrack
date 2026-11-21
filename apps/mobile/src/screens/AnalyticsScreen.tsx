import { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { useDatabase } from '@nozbe/watermelondb/react';
import type Habit from '../database/models/Habit';

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDaysAgo(days: number): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start.getTime() - (days - 1) * DAY_MS;
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <View className="w-1/2 p-1">
      <View className="bg-white p-4 rounded-xl shadow-sm">
        <Text className="text-2xl font-bold text-gray-900">{value}</Text>
        <Text className="text-sm text-gray-500">{label}</Text>
      </View>
    </View>
  );
}

/** Stats computed from the local database, so they work offline. */
export default function AnalyticsScreen() {
  const database = useDatabase();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completionsWeek, setCompletionsWeek] = useState(0);
  const [completionsMonth, setCompletionsMonth] = useState(0);

  useEffect(() => {
    const completions = database.get('completions');
    // "Last 7/30 days" windows are fixed when the screen opens.
    const subscriptions = [
      database
        .get<Habit>('habits')
        .query(Q.where('is_archived', false), Q.sortBy('current_streak', Q.desc))
        .observeWithColumns(['name', 'current_streak', 'longest_streak'])
        .subscribe(setHabits),
      completions
        .query(Q.where('completed_at', Q.gte(startOfDaysAgo(7))))
        .observeCount()
        .subscribe(setCompletionsWeek),
      completions
        .query(Q.where('completed_at', Q.gte(startOfDaysAgo(30))))
        .observeCount()
        .subscribe(setCompletionsMonth),
    ];
    return () => subscriptions.forEach((s) => s.unsubscribe());
  }, [database]);

  const bestCurrent = Math.max(0, ...habits.map((h) => h.currentStreak));
  const bestEver = Math.max(0, ...habits.map((h) => h.longestStreak));

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 12 }}>
      <View className="flex-row flex-wrap mb-4">
        <StatTile label="Active habits" value={habits.length} />
        <StatTile label="Best current streak" value={bestCurrent} />
        <StatTile label="Check-ins, last 7 days" value={completionsWeek} />
        <StatTile label="Check-ins, last 30 days" value={completionsMonth} />
        <StatTile label="Longest streak ever" value={bestEver} />
      </View>

      <Text className="text-lg font-semibold text-gray-900 mb-2 px-1">Streaks</Text>
      {habits.length === 0 ? (
        <View className="bg-white p-4 rounded-xl shadow-sm">
          <Text className="text-gray-500 text-center">No habits tracked yet.</Text>
        </View>
      ) : (
        habits.map((habit) => (
          <View
            key={habit.id}
            className="flex-row justify-between bg-white p-4 rounded-xl shadow-sm mb-2"
          >
            <Text className="text-gray-900 flex-1 mr-2" numberOfLines={1}>
              {habit.name}
            </Text>
            <Text className="text-gray-700">
              🔥 {habit.currentStreak} · Best {habit.longestStreak}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}
