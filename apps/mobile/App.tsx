import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// import { DatabaseProvider } from '@nozbe/watermelondb/DatabaseProvider'; // TODO: Wrap app with DB Provider
import HomeScreen from './src/screens/HomeScreen';
// import { database } from './src/database'; // TODO: Import initialized database

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    // <DatabaseProvider database={database}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ title: 'PulseTrack' }}
          />
          {/* TODO: Add screens for HabitCreation, Settings, Analytics */}
        </Stack.Navigator>
      </NavigationContainer>
    // </DatabaseProvider>
  );
}