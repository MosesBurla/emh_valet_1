import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  AppState,
  AppStateStatus,
} from 'react-native';
import { Surface, Card } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Icon1 from 'react-native-vector-icons/FontAwesome5';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AccessibleButton from '../../components/AccessibleButton';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import SocketService from '../../services/SocketService';
// import { NotificationService } from '../../services/NotificationService';
import { ParkingRequest } from '../../types';
import { COLORS, SPACING, BORDER_RADIUS, USER_ROLES, STORAGE_KEYS } from '../../constants';
import { apiService } from '../../services/ApiService';
import { getCurrentLocation, locationService } from '../../services/LocationService';

type RootStackParamList = {
  DriverDashboard: undefined;
  RequestDetails: { request: ParkingRequest };
  Login: undefined;
};

type DriverDashboardNavigationProp = StackNavigationProp<RootStackParamList>;

const DriverDashboard: React.FC = () => {
  const navigation = useNavigation<DriverDashboardNavigationProp>();
  const [requests, setRequests] = useState<ParkingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingRequest, setAcceptingRequest] = useState(false);
  const [parkingRequest, setParkingRequest] = useState(false);
  const [handingOverRequest, setHandingOverRequest] = useState(false);

  // Fixed parking location coordinates
  const PARKING_LOCATION = {
    latitude: 17.530411,
    longitude: 78.440178,
  };

  // Distance calculation utility function using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  // Location verification function
  const verifyParkingLocation = async (): Promise<boolean> => {
    try {
      // Get driver's current location
      const driverLocation = await getCurrentLocation();

      if (!driverLocation) {
        Alert.alert('Location Required', 'Unable to get your current location. Please enable location services and try again.');
        return false;
      }

      // Calculate distance from driver to parking location
      const distance = calculateDistance(
        driverLocation.latitude,
        driverLocation.longitude,
        PARKING_LOCATION.latitude,
        PARKING_LOCATION.longitude
      );

      // Check if driver is within 100 meters of parking location
      if (distance > 100) {
        Alert.alert(
          'Location Verification Failed',
          `You must be at the parking location to perform this action.`
        );
        return false;
      }

      return true; // Driver is at parking location
    } catch (error: any) {
      console.error('Location verification error:', error);
      let errorMessage = 'Failed to verify your location. Please try again.';

      if (error && error.code) {
        switch (error.code) {
          case 1: // PERMISSION_DENIED
            errorMessage = 'Location permission denied. Please enable location permissions in your device settings and try again.';
            break;
          case 2: // POSITION_UNAVAILABLE
            errorMessage = 'Location unavailable. Please check your GPS settings and ensure you have a signal.';
            break;
          case 3: // TIMEOUT
            errorMessage = 'Location request timed out. Please ensure you have a clear view of the sky and try again.';
            break;
          default:
            errorMessage = 'Unable to determine your location. Please check your location settings and try again.';
        }
      }

      Alert.alert('Location Error', errorMessage);
      return false;
    }
  };

  useEffect(() => {
    loadRequests();
    setupSocketListeners();

    // App state listener to handle background/foreground transitions
    const appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      console.log('App state changed to:', nextAppState);

      if (nextAppState === 'active') {
        // App came to foreground - ensure socket is connected
        if (!SocketService.isConnected()) {
          console.log('Attempting to reconnect socket on app foreground');
          SocketService.reconnect();
        } else {
          console.log('Socket already connected on app foreground');
        }
      }
    });

    return () => {
      SocketService.off('new-park-request');
      SocketService.off('new-pickup-request');
      SocketService.off('request_updated');
      SocketService.off('request-accepted');
      appStateSubscription.remove();
    };
  }, []);

  const setupSocketListeners = () => {
    // Listen for new park requests from backend - show notification/alert only
    SocketService.on('new-park-request', (data: any) => {
      console.log('New park request notification:', data);
      Alert.alert(
        'New Parking Request',
        `New parking request received for vehicle ${data.vehicle.number || 'Unknown'}`,
        [
          { text: 'OK' },
          { text: 'View', onPress: () => onRefresh() }
        ]
      );
    });

    // Listen for new pickup requests from backend - show notification/alert only
    SocketService.on('new-pickup-request', (data: any) => {
      console.log('New pickup request notification:', data);
      Alert.alert(
        'New Pickup Request',
        `New pickup request received for vehicle ${data.vehicle.number || 'Unknown'}`,
        [
          { text: 'OK' },
          { text: 'View', onPress: () => onRefresh() }
        ]
      );
    });
  };

  const loadRequests = async () => {
    try {
      setLoading(true);
      // Fetch incoming requests from backend API
      const requestsData = await apiService.getIncomingRequests();

      if (requestsData.success && Array.isArray(requestsData.data)) {
        // Transform backend data to match frontend interface
        const transformedRequests: ParkingRequest[] = requestsData.data.map((request: any) => ({
          id: request._id || request.id,
          type: request.type,
          status: request.status,
          location: request.locationFrom?.address || 'Unknown Location',
          licensePlate: request.vehicleId?.number || 'Unknown',
          ownerName: request.vehicleId?.ownerName || 'Unknown',
          ownerPhone: request.vehicleId?.ownerPhone || 'Unknown',
          vehicleMake: request.vehicleId?.make,
          vehicleModel: request.vehicleId?.model,
          vehicleColor: request.vehicleId?.color,
          estimatedTime: 15, // Default estimated time
          priority: 'standard', // Default priority
          createdAt: request.createdAt,
          acceptedAt: request.acceptedAt,
          // Additional fields from API response
          locationFrom: request.locationFrom,
          vehicleId: request.vehicleId,
          createdBy: request.createdBy,
          isSelfParked: request.isSelfParked,
          isSelfPickup: request.isSelfPickup,
          notes: request.notes,
          updatedAt: request.updatedAt,
          __v: request.__v,
        }));
        setRequests(transformedRequests);
      } else {
        Alert.alert('Error', 'Failed to load requests - invalid response format');
      }
    } catch (error) {
      console.error('Error loading requests:', error);
      Alert.alert('Error', 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (request: ParkingRequest) => {
    setAcceptingRequest(true);
    try {
      // Verify driver is at parking location before accepting pickup requests
      if (request.type === 'pickup') {
        const isAtParkingLocation = await verifyParkingLocation();
        if (!isAtParkingLocation) {
          return; // Location verification failed, don't proceed
        }
      }

      // For park requests, check against the request's locationFrom (valet location)
      if (request.type === 'park') {
        if (!request.locationFrom?.latitude || !request.locationFrom?.longitude) {
          Alert.alert('Invalid Request', 'Request location information is missing.');
          return;
        }

        let driverLocation;
        try {
          // Get driver's current location
          driverLocation = await locationService.getCurrentLocation();
        } catch (error: any) {
          console.error('Location error:', error);
          let errorMessage = 'Unable to get your current location. Please enable location services and try again.';

          if (error && error.code) {
            switch (error.code) {
              case 1: // PERMISSION_DENIED
                errorMessage = 'Location permission denied. Please enable location permissions in your device settings and try again.';
                break;
              case 2: // POSITION_UNAVAILABLE
                errorMessage = 'Location unavailable. Please check your GPS settings and ensure you have a signal.';
                break;
              case 3: // TIMEOUT
                errorMessage = 'Location request timed out. Please ensure you have a clear view of the sky and try again.';
                break;
              default:
                errorMessage = 'Unable to determine your location. Please check your location settings and try again.';
            }
          }

          Alert.alert('Location Required', errorMessage);
          return;
        }

        // Calculate distance between driver and valet location
        const distance = calculateDistance(
          driverLocation.latitude,
          driverLocation.longitude,
          request.locationFrom.latitude,
          request.locationFrom.longitude
        );

        // For park requests, still use 25 meters range to pickup from customer
        if (distance > 70) {
          Alert.alert(
            'Location Verification Failed',
            `You must be at the customer's location to accept this parking request.`
          );
          return;
        }
      }

      // Driver is at correct location, proceed with accepting the request
      const result = await apiService.acceptRequest(request.id);

      if (result.success) {
        // Refresh the list to show updated requests
        await loadRequests();
      } else {
        Alert.alert('Request Acceptance Failed', result.message || 'Failed to accept request');
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      Alert.alert('Request Acceptance Failed', 'Unable to accept the request. Please check your connection and try again.');
    } finally {
      setAcceptingRequest(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      navigation.replace('Login');
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert('Error', 'Failed to logout');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const handleMarkAsParked = async (request: ParkingRequest) => {
    setParkingRequest(true);
    try {
      // Verify driver is at parking location before marking vehicle as parked
      const isAtParkingLocation = await verifyParkingLocation();
      if (!isAtParkingLocation) {
        return; // Location verification failed, don't proceed
      }

      const result = await apiService.markParked(request.id);

      if (result.success) {
        // Refresh the list to show updated requests
        await loadRequests();

        Alert.alert(
          'Vehicle Parked Successfully',
          `Vehicle ${request.licensePlate} has been marked as parked and the request is now complete.`
        );
      } else {
        Alert.alert('Parking Failed', result.message || 'Unable to mark vehicle as parked. Please try again.');
      }
    } catch (error) {
      console.error('Error marking as parked:', error);
      Alert.alert('Parking Failed', 'Unable to mark vehicle as parked. Please check your connection and try again.');
    } finally {
      setParkingRequest(false);
    }
  };

  const handleMarkAsHandedOver = async (request: ParkingRequest) => {
    setHandingOverRequest(true);
    try {
      const result = await apiService.markHandedOver(request.id);

      if (result.success) {
        // Refresh the list to show updated requests
        await loadRequests();

        Alert.alert(
          'Handover Completed Successfully',
          `Vehicle ${request.licensePlate} handover has been completed and the request is now finished.`
        );
      } else {
        Alert.alert('Handover Failed', result.message || 'Unable to complete handover. Please try again.');
      }
    } catch (error) {
      console.error('Error completing handover:', error);
      Alert.alert('Handover Failed', 'Unable to complete handover. Please check your connection and try again.');
    } finally {
      setHandingOverRequest(false);
    }
  };



  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Icon name="hourglass-empty" size={48} color={COLORS.textSecondary} />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      {/* Modern Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Icon name="local-taxi" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Driver Dashboard</Text>
              <Text style={styles.headerSubtitle}>Ready to handle requests</Text>
            </View>
          </View>
          
            <Icon1 name="dove" size={24} color="#FFFFFF" />
          
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
            progressBackgroundColor="#FFFFFF"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Card */}
        <Surface style={styles.welcomeCard} elevation={2}>
          <View style={styles.welcomeContent}>
            <Icon name="local-taxi" size={32} color={COLORS.primary} />
            <View style={styles.welcomeText}>
              <Text style={styles.welcomeTitle}>Service Status</Text>
              <Text style={styles.welcomeSubtitle}>Connected and ready</Text>
            </View>
            <View style={styles.statusIndicator}>
              <Icon name="check-circle" size={20} color={COLORS.success} />
            </View>
          </View>
        </Surface>

        {/* Requests Section */}
        <View style={styles.requestsSection}>
          <Text style={styles.sectionTitle}>All Requests</Text>
          {requests.length > 0 ? (
            <Card style={styles.activityCard}>
              {requests.map((item, index) => (
                <View key={item.id || index} style={styles.activityItem}>
                  <View style={[styles.activityIcon, { backgroundColor: item.status === 'accepted' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)' }]}>
                    <Icon name="directions-car" size={24} color={item.status === 'accepted' ? "#10b981" : "#f59e0b"} />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>{item.licensePlate}</Text>
                    <Text style={styles.activitySubtitle}>
                      {item.ownerName} • {item.vehicleMake && `${item.vehicleMake} ${item.vehicleModel}`} • {item.type}
                    </Text>
                    <Text style={styles.activityTime}>
                      Estimated: {item.estimatedTime} mins
                    </Text>
                  </View>
                  {item.status === 'accepted' ? (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: item.type === 'park' ? COLORS.success : COLORS.warning }]}
                      onPress={() => {
                        if (item.type === 'park') {
                          handleMarkAsParked(item);
                        } else {
                          handleMarkAsHandedOver(item);
                        }
                      }}
                      disabled={parkingRequest || handingOverRequest}
                    >
                      <Icon name={item.type === 'park' ? "check" : "local-shipping"} size={16} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>
                        {item.type === 'park'
                          ? (parkingRequest ? "Parking..." : "Park")
                          : (handingOverRequest ? "Handing..." : "Handover")
                        }
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: COLORS.primary }]}
                      onPress={() => handleAcceptRequest(item)}
                      disabled={acceptingRequest}
                    >
                      <Icon name="check" size={16} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>
                        {acceptingRequest ? "Accepting..." : "Accept"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </Card>
          ) : (
            <Card style={styles.emptyStateCard}>
              <View style={styles.emptyContainer}>
                <Icon name="inbox" size={48} color={COLORS.textSecondary} />
                <Text style={styles.emptyText}>No requests available</Text>
                <Text style={styles.emptySubtext}>
                  Pull down to refresh or wait for new requests
                </Text>
              </View>
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  actionButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: SPACING.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: '#757575',
    fontWeight: '500',
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    paddingTop: SPACING.xl + 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  headerAction: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    backgroundColor: '#ef4444',
    borderRadius: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  welcomeCard: {
    margin: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#FFFFFF',
  },
  welcomeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  welcomeText: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statusIndicator: {
    marginLeft: SPACING.md,
  },

  requestsSection: {
    marginTop: SPACING.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    marginLeft: SPACING.lg,
  },
  activityCard: {
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    paddingHorizontal: SPACING.md,
  },
  emptyStateCard: {
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
});

export default DriverDashboard;
