import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { useDatabase } from '@nozbe/watermelondb/react';
import type Habit from '../database/models/Habit';
import HabitCard from '../components/HabitCard';
import { syncWithServer, SyncError } from '../sync/syncWithServer';

// Columns shown on the card: the list re-renders when any of these change.
const OBSERVED_COLUMNS = ['name', 'frequency', 'color', 'icon', 'current_streak', 'longest_streak'];

export default function HomeScreen() {
  const database = useDatabase();
  const [habits, setHabits] = useState<Habit[] | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Subscribe to active habits; the list updates on any local write or sync.
  useEffect(() => {
    const subscription = database
      .get<Habit>('habits')
      .query(Q.where('is_archived', false), Q.sortBy('created_at', Q.asc))
      .observeWithColumns(OBSERVED_COLUMNS)
      .subscribe(setHabits);
    return () => subscription.unsubscribe();
  }, [database]);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      await syncWithServer(database);
      setSyncMessage(`Synced at ${new Date().toLocaleTimeString()}`);
    } catch (error) {
      setSyncMessage(error instanceof SyncError ? error.message : 'Sync failed. Please try again.');
      if (!(error instanceof SyncError)) console.error('Sync failed', error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50 p-4">
      <Text className="text-2xl font-bold text-gray-900 mb-4 text-center">
        PulseTrack Dashboard
      </Text>

      {habits === null ? (
        <ActivityIndicator className="my-6" />
      ) : (
        <FlatList
          data={habits}
          keyExtractor={(habit) => habit.id}
          renderItem={({ item }) => <HabitCard habit={item} />}
          className="flex-1"
          ListEmptyComponent={
            <View className="w-full bg-white p-4 rounded-xl shadow-sm mb-6">
              <Text className="text-gray-500 text-center">No habits tracked yet.</Text>
            </View>
          }
        />
      )}

      <View className="items-center pt-4">
        <TouchableOpacity
          onPress={handleSync}
          disabled={isSyncing}
          className={`px-6 py-3 rounded-lg flex-row items-center ${isSyncing ? 'bg-blue-400' : 'bg-blue-600'}`}
        >
          {isSyncing && <ActivityIndicator color="#ffffff" className="mr-2" />}
          <Text className="text-white font-semibold">
            {isSyncing ? 'Syncing…' : 'Force Sync'}
          </Text>
        </TouchableOpacity>
        {syncMessage && <Text className="text-sm text-gray-500 mt-2">{syncMessage}</Text>}
      </View>
    </View>
  );
}
