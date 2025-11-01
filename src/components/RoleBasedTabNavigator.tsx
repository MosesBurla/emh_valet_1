import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS } from '../constants';
import { User } from '../types';
import SocketService from '../services/SocketService';

// Import screens
import DriverDashboard from '../screens/driver/DriverDashboard';
import HistoryScreen from '../screens/common/HistoryScreen';
import ProfileScreen from '../screens/common/ProfileScreen';
import AdminDashboard from '../screens/admin/AdminDashboard';
import ValetDashboard from '../screens/valet/ValetDashboard';
import ParkVehiclesDashboard from '../screens/valet/ParkVehiclesDashboard';
import ParkLocationDashboard from '../screens/parkLocation/ParkLocationDashboard';
import RequestDetailsScreen from '../screens/driver/RequestDetailsScreen';

const Tab = createBottomTabNavigator();

interface RoleBasedTabNavigatorProps {
  user: User;
}

const RoleBasedTabNavigator: React.FC<RoleBasedTabNavigatorProps> = ({ user }) => {
  console.log('RoleBasedTabNavigator rendering for user:', user.name, 'role:', user.role);

  const [socketStatus, setSocketStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  useEffect(() => {
    const updateStatus = () => {
      setSocketStatus(SocketService.getConnectionStatus());
    };

    // Update immediately
    updateStatus();

    // Update periodically to reflect status changes
    const interval = setInterval(updateStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  const getTabIcon = (routeName: string, focused: boolean) => {
    let iconName: string;

    switch (routeName) {
      case 'Dashboard':
        iconName = 'dashboard';
        break;
      case 'Requests':
        iconName = 'list';
        break;
      case 'History':
        iconName = 'history';
        break;
      case 'Profile':
        iconName = 'person';
        break;
      case 'UserManagement':
        iconName = 'people';
        break;
      case 'ParkedVehicles':
        iconName = 'local-parking';
        break;
      default:
        iconName = 'home';
    }

    return <Icon name={iconName} size={24} color={focused ? COLORS.primary : COLORS.textSecondary} />;
  };

  const getConnectionStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return '#4CAF50'; // Green
      case 'connecting':
        return '#FF9800'; // Orange
      case 'disconnected':
        return '#F44336'; // Red
      default:
        return '#9E9E9E'; // Gray
    }
  };

  const ConnectionStatusHeader = () => (
    <View style={styles.connectionStatusContainer}>
      <Text style={[styles.connectionStatusText, { color: getConnectionStatusColor(socketStatus) }]}>
        • {socketStatus.toUpperCase()}
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused }) => getTabIcon(route.name, focused),
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textSecondary,
          headerShown: false,
        })}
      >
        {user.role === 'driver' && (
          <>
            <Tab.Screen name="Requests" component={DriverDashboard} />
            <Tab.Screen name="History" component={HistoryScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
          </>
        )}

        {user.role === 'admin' && (
          <>
            <Tab.Screen name="Dashboard" component={AdminDashboard} />
            <Tab.Screen name="History" component={HistoryScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
          </>
        )}

        {user.role === 'valet_supervisor' && (
          <>
            <Tab.Screen name="ParkedVehicles" component={ValetDashboard} />
            <Tab.Screen name="History" component={HistoryScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
          </>
        )}

        {user.role === 'parking_location_supervisor' && (
          <>
            <Tab.Screen name="ParkVehicles" component={ParkLocationDashboard} />
            <Tab.Screen name="History" component={HistoryScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
          </>
        )}

        {/* Fallback for unknown roles */}
        {!['driver', 'admin', 'valet_supervisor', 'parking_location_supervisor'].includes(user.role) && (
          <>
            <Tab.Screen name="Dashboard" component={DriverDashboard} />
            <Tab.Screen name="History" component={HistoryScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
          </>
        )}
      </Tab.Navigator>
      <ConnectionStatusHeader />
    </View>
  );
};

export default RoleBasedTabNavigator;

const styles = StyleSheet.create({
  connectionStatusContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  connectionStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFF',
  },
});
