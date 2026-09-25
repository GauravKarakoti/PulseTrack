import { View, Text, TouchableOpacity } from 'react-native';
// TODO: Import useDatabase from WatermelonDB hooks for reactive data

export default function HomeScreen() {
  // TODO: Fetch habits reactively using WatermelonDB Observables

  const handleSync = async () => {
    // TODO: Call WatermelonDB synchronize() method targeting the Express API
  };

  return (
    <View className="flex-1 items-center justify-center bg-gray-50 p-4">
      <Text className="text-2xl font-bold text-gray-900 mb-4">
        PulseTrack Dashboard
      </Text>
      
      {/* TODO: Map over local habits and render HabitCard components */}
      <View className="w-full bg-white p-4 rounded-xl shadow-sm mb-6">
        <Text className="text-gray-500 text-center">No habits tracked yet.</Text>
      </View>

      <TouchableOpacity 
        onPress={handleSync}
        className="bg-blue-600 px-6 py-3 rounded-lg"
      >
        <Text className="text-white font-semibold">Force Sync</Text>
      </TouchableOpacity>
    </View>
  );
}