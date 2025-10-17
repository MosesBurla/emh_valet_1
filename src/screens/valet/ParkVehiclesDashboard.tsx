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
  FlatList,
  Dimensions,
} from 'react-native';
import { Surface, Searchbar, Chip } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import AccessibleButton from '../../components/AccessibleButton';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants';
import { apiService } from '../../services/ApiService';

type RootStackParamList = {
  ParkVehiclesDashboard: undefined;
  ParkedVehicles: undefined;
  RequestPickup: { vehicleId: string; vehicleInfo: any };
  ValetDashboard: undefined;
};

type ParkVehiclesDashboardNavigationProp = StackNavigationProp<RootStackParamList>;

interface ParkedVehicle {
  id: string;
  _id: string;
  number: string;
  make: string;
  model: string;
  color: string;
  ownerName: string;
  ownerPhone: string;
  status: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  isSelfParked?: boolean;
  driverName?: string;
  driverPhone?: string;
}

const { width } = Dimensions.get('window');

const ParkVehiclesDashboard: React.FC = () => {
  const navigation = useNavigation<ParkVehiclesDashboardNavigationProp>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [parkedVehicles, setParkedVehicles] = useState<ParkedVehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<ParkedVehicle[]>([]);
  const [stats, setStats] = useState({
    totalParked: 0,
    verified: 0,
    unverified: 0,
    selfPickup: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    filterVehicles();
  }, [searchQuery, parkedVehicles]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load dashboard statistics
      const dashboardStats = await apiService.getValetDashboardStats();

      // Update stats state with proper API response structure
      setStats({
        totalParked: dashboardStats.totalParked,
        verified: dashboardStats.totalVerified,
        unverified: dashboardStats.totalParked - dashboardStats.totalVerified,
        selfPickup: dashboardStats.totalSelfPickup,
      });

      // Load parked vehicles list
      const vehiclesResult = await apiService.getParkedVehicles();

      if (vehiclesResult && Array.isArray(vehiclesResult)) {
        // Transform API response to match our interface
        const transformedVehicles: ParkedVehicle[] = vehiclesResult.map((vehicle: any) => {
          // Check if vehicle is self-parked (no driver details)
          const hasDriverInfo = vehicle.driverName || vehicle.driverPhone ||
                               vehicle.parkDriverId || vehicle.parkDriverName;
          const isSelfParked = !hasDriverInfo;

          return {
            id: vehicle.id || vehicle._id,
            _id: vehicle._id,
            number: vehicle.number,
            make: vehicle.make,
            model: vehicle.model,
            color: vehicle.color,
            ownerName: vehicle.ownerName || 'Unknown Owner',
            ownerPhone: vehicle.ownerPhone || 'N/A',
            status: vehicle.status || 'parked',
            isVerified: vehicle.isVerified || false,
            isSelfParked: isSelfParked,
            driverName: vehicle.driverName || vehicle.parkDriverName,
            driverPhone: vehicle.driverPhone || vehicle.parkDriverPhone,
            createdAt: vehicle.createdAt || new Date().toISOString(),
            updatedAt: vehicle.updatedAt || new Date().toISOString(),
          };
        });
        setParkedVehicles(transformedVehicles);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load parked vehicles data');
    } finally {
      setLoading(false);
    }
  };

  const filterVehicles = () => {
    if (!searchQuery.trim()) {
      setFilteredVehicles(parkedVehicles);
    } else {
      const filtered = parkedVehicles.filter(vehicle =>
        vehicle.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.ownerName.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredVehicles(filtered);
    }
  };

  const handleVerifyVehicle = async (vehicle: ParkedVehicle) => {
    Alert.alert(
      'Verify Vehicle',
      `Verify ${vehicle.number}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Verify',
          onPress: async () => {
            try {
              await apiService.post('/supervisor/verify-park-request', {
                carNumber: vehicle.number,
              });

              Alert.alert('Success', 'Vehicle verified successfully');
              loadDashboardData(); // Refresh data
            } catch (error) {
              console.error('Error verifying vehicle:', error);
              Alert.alert('Error', 'Failed to verify vehicle');
            }
          },
        },
      ]
    );
  };

  const handleMarkSelfPickup = async (vehicle: ParkedVehicle) => {
    Alert.alert(
      'Mark Self Pickup',
      `Mark ${vehicle.number} for self pickup?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Mark Self Pickup',
          onPress: async () => {
            try {
              await apiService.markSelfPickup(vehicle.id);
              Alert.alert('Success', 'Vehicle marked for self pickup');
              loadDashboardData(); // Refresh data
            } catch (error) {
              console.error('Error marking self pickup:', error);
              Alert.alert('Error', 'Failed to mark vehicle for self pickup');
            }
          },
        },
      ]
    );
  };

  const handleMarkSelfPark = async (vehicle: ParkedVehicle) => {
    Alert.alert(
      'Mark Self Park',
      `Mark ${vehicle.number} as self-parked? This means the vehicle was parked by the owner.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Mark Self Park',
          onPress: async () => {
            try {
              // Use the generic post method to update vehicle status
              await apiService.post(`/supervisor/mark-self-park/${vehicle.id}`, {
                isSelfParked: true,
                status: 'self_parked'
              });
              Alert.alert('Success', 'Vehicle marked as self-parked');
              loadDashboardData(); // Refresh data
            } catch (error) {
              console.error('Error marking self park:', error);
              Alert.alert('Error', 'Failed to mark vehicle as self-parked');
            }
          },
        },
      ]
    );
  };

  const handleRequestPickup = async (vehicle: ParkedVehicle) => {
    Alert.alert(
      'Request Valet Pickup',
      `Request valet pickup for ${vehicle.number}? A valet driver will be notified to retrieve this vehicle.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Request Pickup',
          onPress: async () => {
            try {
              // Navigate to request pickup screen with vehicle info
              navigation.navigate('RequestPickup', {
                vehicleId: vehicle.id,
                vehicleInfo: vehicle
              });
            } catch (error) {
              console.error('Error requesting pickup:', error);
              Alert.alert('Error', 'Failed to request valet pickup');
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const StatCard = ({ title, value, icon, color }: any) => (
    <TouchableOpacity style={styles.statsCard} activeOpacity={0.7}>
      <View style={styles.statsCardContent}>
        <View style={[styles.statsIcon, { backgroundColor: color + '20' }]}>
          <Icon name={icon} size={20} color={color} />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statsLabel}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

  const VehicleCard = ({ vehicle }: { vehicle: ParkedVehicle }) => (
    <Surface style={styles.vehicleCard} elevation={0}>
      <View style={styles.vehicleCardContent}>
        <View style={styles.vehicleHeader}>
          <View style={styles.vehicleMainInfo}>
            <View style={styles.licensePlateContainer}>
              <Text style={styles.licensePlate}>{vehicle.number}</Text>
            </View>
            <View style={styles.vehicleDetails}>
              <Text style={styles.vehicleName}>{vehicle.make} {vehicle.model}</Text>
              <Text style={styles.vehicleColor}>{vehicle.color}</Text>
            </View>
          </View>
          <View style={styles.vehicleStatusContainer}>
            <Chip
              style={[
                styles.statusChip,
                vehicle.isVerified
                  ? { backgroundColor: 'rgba(34, 197, 94, 0.1)' }
                  : { backgroundColor: 'rgba(251, 191, 36, 0.1)' },
              ]}
              textStyle={[
                styles.statusText,
                vehicle.isVerified
                  ? { color: '#22c55e' }
                  : { color: '#fbbf24' },
              ]}
            >
              {vehicle.isVerified ? 'Verified' : 'Pending'}
            </Chip>
            {vehicle.isSelfParked && (
              <View style={styles.selfParkedIndicator}>
                <Icon name="person-outline" size={14} color="#6366f1" />
              </View>
            )}
          </View>
        </View>

        <View style={styles.vehicleMeta}>
          <View style={styles.metaRow}>
            <Icon name="person" size={16} color="#64748b" />
            <Text style={styles.metaText}>{vehicle.ownerName}</Text>
          </View>
          <View style={styles.metaRow}>
            <Icon name="phone" size={16} color="#64748b" />
            <Text style={styles.metaText}>{vehicle.ownerPhone}</Text>
          </View>
          <View style={styles.metaRow}>
            <Icon name="schedule" size={16} color="#64748b" />
            <Text style={styles.metaText}>
              {new Date(vehicle.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.vehicleActions}>
          {!vehicle.isVerified ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.primaryAction}
                onPress={() => handleVerifyVehicle(vehicle)}
              >
                <View style={styles.verifyButtonGradient}>
                  <Icon name="verified" size={16} color="#FFFFFF" />
                  <Text style={styles.actionText}>Verify</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryAction}
                onPress={() => handleMarkSelfPark(vehicle)}
              >
                <Text style={styles.secondaryActionText}>Self Park</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.tertiaryAction}
                onPress={() => handleMarkSelfPickup(vehicle)}
              >
                <Text style={styles.tertiaryActionText}>Self Pickup</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryAction}
                onPress={() => handleRequestPickup(vehicle)}
              >
                <View style={styles.pickupButtonGradient}>
                  <Icon name="local-shipping" size={16} color="#FFFFFF" />
                  <Text style={styles.actionText}>Valet Pickup</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Surface>
  );

  if (loading) {
    return <LoadingSkeleton type="full" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#f8fafc" barStyle="dark-content" />

      {/* Modern Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <Icon name="local-parking" size={28} color="#FFFFFF" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Parking Operations</Text>
              <Text style={styles.headerSubtitle}>Manage your parked vehicles</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.headerAction}>
            <Icon name="notifications-outline" size={24} color="#FFFFFF" />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1e293b']}
            tintColor="#1e293b"
            progressBackgroundColor="#f1f5f9"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Surface style={styles.welcomeCard} elevation={0}>
            <View style={styles.welcomeContent}>
              <View style={styles.welcomeIcon}>
                <Icon name="analytics" size={24} color="#3b82f6" />
              </View>
              <View style={styles.welcomeText}>
                <Text style={styles.welcomeTitle}>Dashboard Overview</Text>
                <Text style={styles.welcomeSubtitle}>Monitor your parking operations</Text>
              </View>
              <View style={styles.welcomeBadge}>
                <Text style={styles.welcomeBadgeText}>Live</Text>
              </View>
            </View>
          </Surface>
        </View>



        {/* Search Section */}
        <View style={styles.searchSection}>
          <Surface style={styles.searchCard} elevation={0}>
            <Searchbar
              placeholder="Search vehicles..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchBar}
              inputStyle={styles.searchInput}
              iconColor="#64748b"
              placeholderTextColor="#94a3b8"
            />
          </Surface>
        </View>

        {/* Vehicles Section */}
        <View style={styles.vehiclesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Vehicles</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ParkedVehicles')}>
              <Text style={styles.viewAllButton}>View All</Text>
            </TouchableOpacity>
          </View>

          {filteredVehicles.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Icon name="local-parking" size={48} color="#cbd5e1" />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No vehicles found' : 'No parked vehicles'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'Try adjusting your search terms'
                  : 'Vehicles will appear here when parked'
                }
              </Text>
            </View>
          ) : (
            <View style={styles.vehiclesList}>
              {filteredVehicles.slice(0, 5).map((vehicle) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} />
              ))}
            </View>
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
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    paddingTop: SPACING.xl + 10,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
    fontWeight: '400',
  },
  headerAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    backgroundColor: '#ff4757',
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
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
  searchSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  vehicleSearchSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  vehicleSearchBar: {
    elevation: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchBar: {
    elevation: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchInput: {
    fontSize: 15,
    fontWeight: '500',
  },
  statsSection: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    letterSpacing: 0.3,
  },
  statsGrid: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
    gap: SPACING.xs,
  },
  statsCard: {
    flex: 1,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  statsCardContent: {
    padding: SPACING.md,
    alignItems: 'center',
  },
  statsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statsNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    letterSpacing: 0.3,
  },
  statsLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  vehiclesSection: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  viewAllText: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  vehicleCard: {
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#FFFFFF',
    padding: SPACING.md,
    marginBottom: SPACING.md,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  vehicleInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  licensePlate: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 0,
    letterSpacing: 0.5,
  },
  selfParkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
    marginLeft: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  selfParkedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366f1',
    marginLeft: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  vehicleName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    lineHeight: 22,
  },
  vehicleColor: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  vehicleStatus: {
    marginLeft: SPACING.md,
  },
  statusChip: {
    height: 32,
    paddingHorizontal: SPACING.sm,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  vehicleDetails: {
    marginBottom: SPACING.lg,
    backgroundColor: '#f8fafc',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  detailText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
    fontWeight: '500',
  },
  vehicleActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  verifyButton: {
    flex: 1,
  },
  selfPickupButton: {
    flex: 1,
  },
  selfParkButton: {
    flex: 1,
  },
  requestPickupButton: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: SPACING.sm,
  },
  actionsSection: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  actionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 18,
  },
  // New modern styles
  welcomeSection: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  welcomeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  welcomeBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
    marginLeft: SPACING.md,
  },
  welcomeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22c55e',
  },
  searchCard: {
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: '#FFFFFF',
  },
  viewAllButton: {
    fontSize: 15,
    color: '#3b82f6',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.xl,
  },
  emptyIcon: {
    marginBottom: SPACING.lg,
  },
  vehiclesList: {
    marginTop: SPACING.md,
  },
  vehicleCardContent: {
    flex: 1,
  },
  vehicleMainInfo: {
    flex: 1,
  },
  licensePlateContainer: {
    marginBottom: SPACING.sm,
  },
  vehicleDetails: {
    marginTop: SPACING.xs,
  },
  vehicleStatusContainer: {
    alignItems: 'flex-end',
    gap: SPACING.xs,
  },
  selfParkedIndicator: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  vehicleMeta: {
    backgroundColor: '#f8fafc',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  metaText: {
    fontSize: 15,
    color: '#334155',
    marginLeft: SPACING.sm,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  primaryAction: {
    flex: 1,
  },
  secondaryAction: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tertiaryAction: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonGradient: {
    backgroundColor: '#10b981',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  pickupButtonGradient: {
    backgroundColor: '#3b82f6',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryActionText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  tertiaryActionText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    backgroundColor: '#ff4757',
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: SPACING.xs,
    letterSpacing: 0.3,
  },
});

export default ParkVehiclesDashboard;
