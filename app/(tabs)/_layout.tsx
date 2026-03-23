import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDropoffNotifier } from '../../src/hooks/useDropoffNotifier';
import { useAndroidBridgeSync } from '../../src/hooks/useAndroidBridgeSync';

function AppHeaderTitle() {
  return (
    <View style={styles.headerTitleContainer}>
      <Text style={styles.headerTitle}>降りる駅教える君β</Text>
    </View>
  );
}

export default function TabLayout() {
  useDropoffNotifier();
  useAndroidBridgeSync();

  return (
    <Tabs
      initialRouteName="settings"
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#F2F2F7',
          borderTopWidth: 0,
          elevation: 0,
        },
        headerStyle: {
          backgroundColor: '#1E3A5F',
        },
        headerTintColor: '#fff',
        headerTitle: () => <AppHeaderTitle />,
      }}
    >
      <Tabs.Screen
        name="settings"
        options={{
          title: 'HOME駅',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: '到着駅',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="navigate-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stations"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="timetable"
        options={{
          title: '時刻表',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="debug"
        options={{
          title: 'テスト',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bug-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
