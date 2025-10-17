import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Card } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AccessibleButton from '../../components/AccessibleButton';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { ParkingRequest } from '../../types';
import { COLORS, SPACING, BORDER_RADIUS, STORAGE_KEYS, USER_ROLES } from '../../constants';
import { apiService } from '../../services/ApiService';

type RootStackParamList = {
  ParkLocationDashboard: undefined;
  VehicleVerification: undefined;
  ParkedVehicles: undefined;
  History: undefined;
  Profile: undefined;
  Login: undefined;
};

type ParkLocationDashboardNavigationProp = StackNavigationProp<RootStackParamList>;

const ParkLocationDashboard: React.FC = () => {
  const navigation = useNavigation<ParkLocationDashboardNavigationProp>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [parkedVehicles, setParkedVehicles] = useState<ParkingRequest[]>([]);

  useEffect(() => {
    loadParkedVehicles();
  }, []);

  const loadParkedVehicles = async () => {
    try {
      setLoading(true);

      // Fetch parked vehicles from backend API
      const result = await apiService.getParkedVehicles();

      if (result.success && result.data) {
        // Transform backend data to match frontend interface
        const transformedVehicles: ParkingRequest[] = result.data.map((vehicle: any) => ({
          id: vehicle._id || vehicle.id,
          type: 'park', // All parked vehicles are park requests
          status: vehicle.status,
          location: vehicle.currentLocation?.address || 'Unknown Location',
          licensePlate: vehicle.number,
          ownerName: vehicle.ownerName,
          ownerPhone: vehicle.ownerPhone,
          vehicleMake: vehicle.make,
          vehicleModel: vehicle.model,
          vehicleColor: vehicle.color,
          estimatedTime: 15, // Default estimated time
          priority: 'standard', // Default priority
          createdAt: vehicle.createdAt,
          acceptedAt: vehicle.createdAt, // Use created time as accepted time for parked vehicles
        }));
        setParkedVehicles(transformedVehicles);
      } else {
        Alert.alert('Error', result.message || 'Failed to load parked vehicles');
      }
    } catch (error) {
      console.error('Error loading parked vehicles:', error);
      Alert.alert('Error', 'Failed to load parked vehicles');
    } finally {
      setLoading(false);
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
    await loadParkedVehicles();
    setRefreshing(false);
  };

  if (loading) {
    return <LoadingSkeleton type="full" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.titleContainer}>
              <Icon name="location-city" size={28} color={COLORS.primary} />
              <Text style={styles.title}>Park Location</Text>
            </View>
            <AccessibleButton
              title="Logout"
              onPress={handleLogout}
              variant="outline"
              size="small"
              accessibilityLabel="Logout button"
              accessibilityHint="Tap to logout from the application"
              style={styles.logoutButton}
            />
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Icon name="local-parking" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.statNumber}>{parkedVehicles.length}</Text>
            <Text style={styles.statLabel}>Parked Vehicles</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Icon name="verified" size={24} color={COLORS.success} />
            </View>
            <Text style={styles.statNumber}>89</Text>
            <Text style={styles.statLabel}>Verified Today</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Icon name="timeline" size={24} color={COLORS.accent} />
            </View>
            <Text style={styles.statNumber}>245</Text>
            <Text style={styles.statLabel}>Total Capacity</Text>
          </View>
        </View>

        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <AccessibleButton
              title="Vehicle Verification"
              onPress={() => navigation.navigate('VehicleVerification')}
              variant="primary"
              accessibilityLabel="Verify vehicle"
              style={styles.actionButton}
            />
            <AccessibleButton
              title="View Parked Vehicles"
              onPress={() => navigation.navigate('ParkedVehicles')}
              variant="outline"
              accessibilityLabel="View all parked vehicles"
              style={styles.actionButton}
            />
          </View>
        </View>

        <Card style={styles.capacityCard}>
          <Card.Content style={styles.capacityContent}>
            <Text style={styles.sectionTitle}>Capacity Status</Text>
            <View style={styles.capacityInfo}>
              <View style={styles.capacityItem}>
                <Text style={styles.capacityLabel}>Current Occupancy:</Text>
                <Text style={styles.capacityValue}>82%</Text>
              </View>
              <View style={styles.capacityBar}>
                <View style={styles.capacityFill} />
              </View>
            </View>
            <View style={styles.zonesContainer}>
              <Text style={styles.zonesTitle}>Zone Status:</Text>
              <View style={styles.zoneItem}>
                <Text style={styles.zoneName}>Zone A:</Text>
                <Text style={styles.zoneStatus}>45/50 spots</Text>
              </View>
              <View style={styles.zoneItem}>
                <Text style={styles.zoneName}>Zone B:</Text>
                <Text style={styles.zoneStatus}>38/50 spots</Text>
              </View>
              <View style={styles.zoneItem}>
                <Text style={styles.zoneName}>VIP Zone:</Text>
                <Text style={styles.zoneStatus}>23/25 spots</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: COLORS.card,
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
  },
  logoutButton: {
    marginLeft: SPACING.md,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: COLORS.backgroundSecondary,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.md,
    margin: SPACING.xs,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    elevation: 2,
  },
  statIconContainer: {
    marginBottom: SPACING.sm,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  quickActionsContainer: {
    padding: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 0.48,
  },
  capacityCard: {
    margin: SPACING.md,
    elevation: 2,
  },
  capacityContent: {
    padding: SPACING.lg,
  },
  capacityInfo: {
    marginBottom: SPACING.lg,
  },
  capacityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  capacityLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  capacityValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  capacityBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
  },
  capacityFill: {
    height: '100%',
    width: '82%',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.sm,
  },
  zonesContainer: {
    marginTop: SPACING.md,
  },
  zonesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  zoneItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  zoneName: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  zoneStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});

export default ParkLocationDashboard;
