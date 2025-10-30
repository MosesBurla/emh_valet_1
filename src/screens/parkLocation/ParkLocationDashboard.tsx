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
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Card, Surface } from 'react-native-paper';
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
      setSearchText(''); // Clear search input after successful verification
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
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      {/* Modern Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Icon name="location-city" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Parked Vehicles Dashboard</Text>
              <Text style={styles.headerSubtitle}>Manage parking operations</Text>
            </View>
          </View>
          {/* <TouchableOpacity style={styles.headerAction} onPress={handleLogout}>
            <Icon name="logout" size={24} color="#FFFFFF" />
          </TouchableOpacity> */}
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

        {/* Statistics Grid */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Today's Overview</Text>

          <View style={styles.statsGrid}>
            <Surface style={styles.statsCard} elevation={3}>
              <View style={styles.statsCardContent}>
                <View style={styles.statsCardHeader}>
                  <View style={[styles.statsIcon, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                    <Icon name="warning" size={24} color="#f59e0b" />
                  </View>
                </View>
                <Text style={styles.statsNumber}>{parkedVehicles.filter(v => !v.isVerified).length}</Text>
                <Text style={styles.statsLabel}>Need Verification</Text>
                <Text style={styles.statsSubtext}>Awaiting validation</Text>
              </View>
            </Surface>

            <Surface style={styles.statsCard} elevation={3}>
              <View style={styles.statsCardContent}>
                <View style={styles.statsCardHeader}>
                  <View style={[styles.statsIcon, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                    <Icon name="check-circle" size={24} color="#22c55e" />
                  </View>
                </View>
                <Text style={styles.statsNumber}>{parkedVehicles.length}</Text>
                <Text style={styles.statsLabel}>Total Parked</Text>
                <Text style={styles.statsSubtext}>All verified vehicles</Text>
              </View>
            </Surface>
          </View>
        </View>



        {/* Parked Vehicles Section */}
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
            <Card style={styles.activityCard}>
              {filteredVehicles.map((item, index) => {
                const isVerified = item.isVerified;
                return (
                  <View key={item.id || index} style={styles.activityItem}>
                    <View style={[styles.activityIcon, { backgroundColor: isVerified ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)' }]}>
                      <Icon name="directions-car" size={24} color={isVerified ? "#10b981" : "#f59e0b"} />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle}>{item.licensePlate}</Text>
                      <Text style={styles.activitySubtitle}>
                        {item.ownerName} • {item.vehicleMake} {item.vehicleModel} ({item.vehicleColor})
                      </Text>
                      <Text style={styles.activityTime}>
                        Parked: {new Date(item.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    {!isVerified ? (
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: COLORS.warning }]}
                        onPress={() => handleVerify(item.licensePlate)}
                      >
                        <Icon name="check" size={20} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Verify</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: COLORS.primary }]}
                        onPress={() => handleMarkSelfPickup(item.id)}
                      >
                        <Icon name="local-shipping" size={20} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Pickup</Text>
                    
                        
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </Card>
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
  scrollContent: {
    paddingBottom: SPACING.xl,
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
  statsSection: {
    marginTop: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  statsCard: {
    flex: 1,
    margin: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#FFFFFF',
  },
  statsCardContent: {
    padding: SPACING.md,
  },
  statsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  statsLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  statsSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  quickActionsContainer: {
    padding: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    marginLeft:SPACING.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  parkedVehiclesContainer: {
    padding: SPACING.md,
  },
  activityCard: {
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
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
