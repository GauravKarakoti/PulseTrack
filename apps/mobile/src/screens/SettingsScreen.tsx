import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { getAuthToken, setAuthToken } from '../sync/session';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-3 border-b border-gray-100">
      <Text className="text-gray-700">{label}</Text>
      <Text className="text-gray-500 flex-1 text-right ml-4" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export default function SettingsScreen() {
  const [isSignedIn, setIsSignedIn] = useState(() => getAuthToken() !== null);

  const handleSignOut = () => {
    setAuthToken(null);
    setIsSignedIn(false);
  };

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 16 }}>
      <Text className="text-sm font-semibold text-gray-500 uppercase mb-2">Cloud sync</Text>
      <View className="bg-white px-4 rounded-xl shadow-sm mb-6">
        <Row label="Account" value={isSignedIn ? 'Signed in' : 'Not signed in'} />
        <Row label="Server" value={API_URL ?? 'Not configured'} />
      </View>

      {isSignedIn && (
        <TouchableOpacity onPress={handleSignOut} className="bg-white py-3 rounded-xl items-center">
          <Text className="text-red-600 font-semibold">Sign Out</Text>
        </TouchableOpacity>
      )}

      <Text className="text-xs text-gray-400 text-center mt-6">
        Your habits are stored on this device and work offline. Signing in is only needed for
        syncing across devices.
      </Text>
    </ScrollView>
  );
}
