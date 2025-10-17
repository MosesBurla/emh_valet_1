import React, { useEffect, useState } from 'react';
import { StatusBar, SafeAreaView, View, Text, StyleSheet, DeviceEventEmitter } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, Provider as PaperProvider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { NotificationService } from './services/NotificationService';
// import { NotificationService } from './services/NotificationService';
import SocketService from './services/SocketService';
import { COLORS, STORAGE_KEYS } from './constants';
import { User } from './types';
import './config/firebase'; // Initialize Firebase

// Import screens
import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/RegisterScreen';
import OTPVerificationScreen from './screens/auth/OTPVerificationScreen';
// import ForgotPasswordScreen from './screens/auth/ForgotPasswordScreen';
import DriverDashboard from './screens/driver/DriverDashboard';
import RequestDetailsScreen from './screens/driver/RequestDetailsScreen';
import AdminDashboard from './screens/admin/AdminDashboard';
import UserManagementScreen from './screens/admin/UserManagementScreen';
import ValetDashboard from './screens/valet/ValetDashboard';
import ParkVehiclesDashboard from './screens/valet/ParkVehiclesDashboard';
import AddVehicleScreen from './screens/valet/AddVehicleScreen';
import ParkedVehiclesScreen from './screens/valet/ParkedVehiclesScreen';
import RequestPickupScreen from './screens/valet/RequestPickupScreen';
import ParkLocationDashboard from './screens/parkLocation/ParkLocationDashboard';

// Import components
import RoleBasedTabNavigator from './components/RoleBasedTabNavigator';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  // Listen for authentication state changes
  useEffect(() => {
    const authStateListener = DeviceEventEmitter.addListener('authStateChanged', async (event) => {
      console.log('Auth state change event received:', event);
      if (event.authenticated) {
        // Force re-check of authentication state
        try {
          const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
          const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);

          if (token && userData) {
            const user = JSON.parse(userData);
            console.log('Setting authenticated state for user:', user.name);
            setIsAuthenticated(true);
            setUser(user);

            // Initialize socket connection for real-time updates
            SocketService.connect(user.id, user.role);
            console.log(`🔗 Socket connected for user: ${user.name} (${user.role})`);
          }
        } catch (error) {
          console.error('Error in auth state listener:', error);
        }
      }
    });

    return () => {
      authStateListener.remove();
    };
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize notifications
      // NotificationService.configure(); // Temporarily disabled due to AndroidX conflicts

      // Check for existing authentication
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);

      if (token && userData) {
        const user = JSON.parse(userData);
        setIsAuthenticated(true);
        setUser(user);

        // Initialize socket connection for real-time updates
        SocketService.connect(user.id, user.role);
        console.log(`🔗 Socket connected for user: ${user.name} (${user.role})`);
      }
    } catch (error) {
      console.error('Error initializing app:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check authentication status periodically
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);

        const hasValidAuth = token && userData;

        if (isAuthenticated && !hasValidAuth) {
          // User logged out, redirect to login and disconnect socket
          setIsAuthenticated(false);
          setUser(null);
          SocketService.disconnect();
          console.log('🔌 Socket disconnected due to logout');
        } else if (!isAuthenticated && hasValidAuth) {
          // User logged in, show main app and connect socket
          const user = JSON.parse(userData);
          setIsAuthenticated(true);
          setUser(user);
          SocketService.connect(user.id, user.role);
          console.log(`🔗 Socket connected for user: ${user.name} (${user.role})`);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      }
    };

    // Check auth status every 2 seconds when authenticated
    let interval: number;
    if (isAuthenticated) {
      interval = setInterval(checkAuthStatus, 2000) as any;
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAuthenticated]);

  // Socket connection management helper
  const setupSocketListeners = (userRole: string) => {
    if (!user) return;

    // Set up role-specific socket listeners
    switch (userRole) {
      case 'driver':
        // Drivers listen for new requests and acceptances
        SocketService.on(SocketService.EVENTS.NEW_PARK_REQUEST, (data: any) => {
          console.log('🚗 New park request received:', data);
          // Could trigger notification or update UI
        });
        SocketService.on(SocketService.EVENTS.NEW_PICKUP_REQUEST, (data: any) => {
          console.log('🚗 New pickup request received:', data);
          // Could trigger notification or update UI
        });
        SocketService.on(SocketService.EVENTS.REQUEST_ACCEPTED, (data: any) => {
          console.log('✅ Request accepted by another driver:', data);
          // Could remove request from UI
        });
        break;

      case 'valet_supervisor':
      case 'parking_location_supervisor':
        // Supervisors listen for completions and verifications
        SocketService.on(SocketService.EVENTS.PARK_COMPLETED, (data: any) => {
          console.log('🅿️ Park completed:', data);
          // Could update parked vehicles list
        });
        SocketService.on(SocketService.EVENTS.PICKUP_COMPLETED, (data: any) => {
          console.log('🅿️ Pickup completed:', data);
          // Could update parked vehicles list
        });
        SocketService.on(SocketService.EVENTS.VEHICLE_VERIFIED, (data: any) => {
          console.log('✅ Vehicle verified:', data);
          // Could update verification status
        });
        break;

      case 'admin':
        // Admins listen for all events
        SocketService.on(SocketService.EVENTS.NEW_PARK_REQUEST, (data: any) => {
          console.log('📊 New park request for monitoring:', data);
        });
        SocketService.on(SocketService.EVENTS.PARK_COMPLETED, (data: any) => {
          console.log('📊 Park completed for monitoring:', data);
        });
        break;
    }
  };

  const getDashboardComponent = (userRole: string) => {
    switch (userRole) {
      case 'driver':
        return DriverDashboard;
      case 'admin':
        return AdminDashboard;
      case 'valet_supervisor':
        return ValetDashboard;
      case 'parking_location_supervisor':
        return ParkLocationDashboard;
      default:
        console.warn(`Unknown user role: ${userRole}, defaulting to DriverDashboard`);
        return DriverDashboard;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Valet Parking...</Text>
      </View>
    );
  }

  return (
    <PaperProvider>
      <NavigationContainer>
        <StatusBar
          backgroundColor={COLORS.primary}
          barStyle="light-content"
        />
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: COLORS.background }
          }}
        >
          {!isAuthenticated ? (
            // Auth Stack
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
              {/* <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} /> */}
            </>
          ) : (
            // Main App with Tab Navigation and additional screens
            <>
              <Stack.Screen name="MainTabs">
                {() => {
                  console.log('Rendering MainTabs for user:', user?.name, 'with role:', user?.role);
                  return user ? <RoleBasedTabNavigator user={user} /> : <DriverDashboard />;
                }}
              </Stack.Screen>
              <Stack.Screen name="UserManagement" component={UserManagementScreen} />
              <Stack.Screen name="AddVehicle" component={AddVehicleScreen} />
              <Stack.Screen name="RequestPickup" component={RequestPickupScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});

export default App;
