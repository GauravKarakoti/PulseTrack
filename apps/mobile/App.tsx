import { Text, TouchableOpacity, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DatabaseProvider } from '@nozbe/watermelondb/react';
import HomeScreen from './src/screens/HomeScreen';
import HabitCreationScreen from './src/screens/HabitCreationScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import { database } from './src/database';
import type { RootStackParamList } from './src/navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

function HeaderButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button" className="ml-4">
      <Text className="text-blue-600 font-semibold text-base">{label}</Text>
    </TouchableOpacity>
  );
}

export default function App() {
  return (
    <DatabaseProvider database={database}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={({ navigation }) => ({
              title: 'PulseTrack',
              headerRight: () => (
                <View className="flex-row">
                  <HeaderButton label="Stats" onPress={() => navigation.navigate('Analytics')} />
                  <HeaderButton label="Settings" onPress={() => navigation.navigate('Settings')} />
                  <HeaderButton label="+ New" onPress={() => navigation.navigate('HabitCreation')} />
                </View>
              ),
            })}
          />
          <Stack.Screen
            name="HabitCreation"
            component={HabitCreationScreen}
            options={{ title: 'New Habit', presentation: 'modal' }}
          />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
          <Stack.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Analytics' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </DatabaseProvider>
  );
}
