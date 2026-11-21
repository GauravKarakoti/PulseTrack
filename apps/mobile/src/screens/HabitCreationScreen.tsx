import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useDatabase } from '@nozbe/watermelondb/react';
import type Habit from '../database/models/Habit';
import type { HabitFrequency } from '../database/models/Habit';
import type { RootStackScreenProps } from '../navigation/types';

const FREQUENCIES: { value: HabitFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

const COLORS = ['#2563EB', '#16A34A', '#DC2626', '#D97706', '#9333EA', '#DB2777'];
const MAX_NAME_LENGTH = 255;

export default function HabitCreationScreen({ navigation }: RootStackScreenProps<'HabitCreation'>) {
  const database = useDatabase();
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [color, setColor] = useState(COLORS[0]!);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedName = name.trim();

  const handleSave = async () => {
    if (!trimmedName) {
      setError('Give your habit a name.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await database.write(async () => {
        await database.get<Habit>('habits').create((habit) => {
          const now = Date.now();
          habit._setRaw('name', trimmedName);
          habit._setRaw('frequency', frequency);
          habit._setRaw('target_count', 1);
          habit._setRaw('color', color);
          habit._setRaw('current_streak', 0);
          habit._setRaw('longest_streak', 0);
          habit._setRaw('is_archived', false);
          // Set explicitly: WatermelonDB only fills these for @date-decorated models.
          habit._setRaw('created_at', now);
          habit._setRaw('updated_at', now);
        });
      });
      navigation.goBack();
    } catch (e) {
      console.error('Failed to create habit', e);
      setError('Could not save the habit. Please try again.');
      setIsSaving(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 16 }}>
      <Text className="text-sm font-semibold text-gray-700 mb-2">Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Drink water"
        maxLength={MAX_NAME_LENGTH}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleSave}
        className="bg-white p-4 rounded-xl text-base text-gray-900 mb-6"
      />

      <Text className="text-sm font-semibold text-gray-700 mb-2">Frequency</Text>
      <View className="flex-row mb-6">
        {FREQUENCIES.map((option) => {
          const selected = option.value === frequency;
          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => setFrequency(option.value)}
              accessibilityState={{ selected }}
              className={`px-4 py-2 rounded-full mr-2 ${selected ? 'bg-blue-600' : 'bg-white'}`}
            >
              <Text className={selected ? 'text-white font-semibold' : 'text-gray-700'}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text className="text-sm font-semibold text-gray-700 mb-2">Color</Text>
      <View className="flex-row flex-wrap mb-8">
        {COLORS.map((option) => {
          const selected = option === color;
          return (
            <TouchableOpacity
              key={option}
              onPress={() => setColor(option)}
              accessibilityLabel={`Color ${option}`}
              accessibilityState={{ selected }}
              className={`w-10 h-10 rounded-full mr-3 mb-3 ${selected ? 'border-4 border-gray-900' : ''}`}
              style={{ backgroundColor: option }}
            />
          );
        })}
      </View>

      {error && <Text className="text-red-600 mb-4">{error}</Text>}

      <TouchableOpacity
        onPress={handleSave}
        disabled={isSaving || !trimmedName}
        className={`py-3 rounded-lg items-center ${isSaving || !trimmedName ? 'bg-blue-300' : 'bg-blue-600'}`}
      >
        <Text className="text-white font-semibold">{isSaving ? 'Saving…' : 'Create Habit'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
