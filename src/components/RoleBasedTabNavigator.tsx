import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS } from '../constants';
import { User } from '../types';

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

  return (
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
  );
};

export default RoleBasedTabNavigator;
