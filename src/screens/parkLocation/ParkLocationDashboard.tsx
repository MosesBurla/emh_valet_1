import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  RefreshControl,
  Alert,
  SafeAreaView,
  TextInput,
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
  const [searchText, setSearchText] = useState('');

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
          createdBy: vehicle.createdBy?._id || 'Unknown',
          isSelfParked: false,
          isSelfPickup: false,
          updatedAt: vehicle.updatedAt,
          __v: vehicle.__v || 0,
          isVerified: vehicle.isVerified,
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

  const filteredVehicles = useMemo(() => {
    if (!searchText) return parkedVehicles;
    return parkedVehicles.filter(vehicle =>
      vehicle.licensePlate.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [parkedVehicles, searchText]);

  const isValidCarNumber = /^[A-Za-z]{2}\d{2}[A-Za-z]{2}\d{4}$/.test(searchText);

  const handleVerify = async (carNumber: string) => {
    const result = await apiService.verifyParkRequest({ carNumber });
    if (result.success) {
      Alert.alert('Success', 'Vehicle verified successfully');
      await loadParkedVehicles();
    } else {
      Alert.alert('Error', result.message || 'Failed to verify vehicle');
    }
  };

  const handleMarkSelfPickup = async (vehicleId: string) => {
    const result = await apiService.markSelfPickup(vehicleId);
    if (result.success) {
      Alert.alert('Success', 'Self pickup marked successfully');
      await loadParkedVehicles();
    } else {
      Alert.alert('Error', result.message || 'Failed to mark self pickup');
    }
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
        </View>



        <View style={styles.parkedVehiclesContainer}>
          <Text style={styles.sectionTitle}>Parked Vehicles</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search vehicle by car number"
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor={COLORS.textSecondary}
          />
          {filteredVehicles.length > 0 ? (
            <FlatList
              data={filteredVehicles}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Card style={styles.vehicleCard}>
                  <Card.Content>
                    <View style={styles.vehicleRow}>
                      <Text style={styles.vehicleLicensePlate}>{item.licensePlate}</Text>
                      <Text style={styles.vehicleStatus}>{item.status}</Text>
                    </View>
                    <Text style={styles.vehicleOwner}>Owner: {item.ownerName} ({item.ownerPhone})</Text>
                    <Text style={styles.vehicleDetails}>
                      {item.vehicleMake} {item.vehicleModel} ({item.vehicleColor}) - Location: {item.location}
                    </Text>
                    {!item.isVerified && (
                      <AccessibleButton
                        title="Verify"
                        onPress={() => handleVerify(item.licensePlate)}
                        variant="primary"
                        size="small"
                        accessibilityLabel="Verify vehicle"
                        style={styles.verifyButton}
                      />
                    )}
                    {item.isVerified && (
                      <AccessibleButton
                        title="Mark Self Pickup"
                        onPress={() => handleMarkSelfPickup(item.id)}
                        variant="secondary"
                        size="small"
                        accessibilityLabel="Mark vehicle for self pickup"
                        style={styles.selfPickupButton}
                      />
                    )}
                  </Card.Content>
                </Card>
              )}
              scrollEnabled={false}
            />
          ) : searchText ? (
            <Card style={styles.addCard}>
              <Card.Content style={styles.addContainer}>
                <Text style={styles.addText}>No vehicle found with "{searchText}"</Text>
                <AccessibleButton
                  title="Add & Verify"
                  disabled={!isValidCarNumber}
                  onPress={() => handleVerify(searchText)}
                  variant={isValidCarNumber ? "primary" : "outline"}
                  accessibilityLabel="Add and verify vehicle"
                  style={styles.addButton}
                />
                {!isValidCarNumber && searchText && (
                  <Text style={styles.validationText}>Car number must be in format: AA00AA0000</Text>
                )}
              </Card.Content>
            </Card>
          ) : (
            <Card style={styles.noVehiclesCard}>
              <Card.Content>
                <Text style={styles.noVehiclesText}>All lots are available. No vehicles currently parked.</Text>
              </Card.Content>
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
  parkedVehiclesContainer: {
    padding: SPACING.md,
  },
  vehicleCard: {
    marginBottom: SPACING.md,
    elevation: 2,
  },
  vehicleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  vehicleLicensePlate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  vehicleStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
    textTransform: 'capitalize',
  },
  vehicleOwner: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  vehicleDetails: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  noVehiclesCard: {
    elevation: 1,
  },
  noVehiclesText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
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
  searchInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    fontSize: 16,
    backgroundColor: COLORS.card,
  },
  verifyButton: {
    marginTop: SPACING.md,
  },
  selfPickupButton: {
    marginTop: SPACING.sm,
  },
  addCard: {
    elevation: 1,
  },
  addContainer: {
    alignItems: 'center',
    padding: SPACING.lg,
  },
  addText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  addButton: {
    marginBottom: SPACING.sm,
  },
  validationText: {
    fontSize: 14,
    color: COLORS.error,
  },
});

export default ParkLocationDashboard;
