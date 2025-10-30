import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Surface, Chip } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import AccessibleButton from '../../components/AccessibleButton';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants';
import { apiService } from '../../services/ApiService';

type RootStackParamList = {
  RequestPickup: undefined;
  ValetDashboard: undefined;
};

type RequestPickupNavigationProp = StackNavigationProp<RootStackParamList>;

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
}

const RequestPickupScreen: React.FC = () => {
  const navigation = useNavigation<RequestPickupNavigationProp>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [parkedVehicles, setParkedVehicles] = useState<ParkedVehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<ParkedVehicle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [submittingPickup, setSubmittingPickup] = useState<string | null>(null);

  useEffect(() => {
    loadParkedVehicles();
  }, []);

  const loadParkedVehicles = async () => {
    try {
      setLoading(true);

      const result = await apiService.getParkedVehicles();

      // Handle standardized API response format
      if (result.success && result.data && Array.isArray(result.data)) {
        // Transform API response to match our interface
        const transformedVehicles: ParkedVehicle[] = result.data.map((vehicle: any) => ({
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
          createdAt: vehicle.createdAt || new Date().toISOString(),
          updatedAt: vehicle.updatedAt || new Date().toISOString(),
        }));
        setParkedVehicles(transformedVehicles);
      } else {
        console.error('Failed to load parked vehicles:', result.message);
        Alert.alert('Error', result.message || 'Failed to load parked vehicles');
      }
    } catch (error) {
      console.error('Error loading parked vehicles:', error);
      Alert.alert('Error', 'Failed to load parked vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPickup = async (vehicle: ParkedVehicle) => {
    try {
      setSubmittingPickup(vehicle.id);

      const result = await apiService.createPickupRequest({
        vehicleId: vehicle.id,
        locationFrom: "40.7128,-74.0060",
        notes: `Pickup requested for ${vehicle.number} - ${vehicle.make} ${vehicle.model}`,
      });

      // Check standardized API response
      if (result.success) {
        Alert.alert(
          'Success',
          result.message || `Pickup request created for ${vehicle.number}!`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Refresh the list to remove the vehicle that was picked up
                loadParkedVehicles();
              },
            },
          ]
        );
      } else {
        // Handle failure case with standardized error response
        console.error('Failed to create pickup request:', result.message);
        Alert.alert('Error', result.message || 'Failed to create pickup request. Please try again.');
      }
    } catch (error: any) {
      console.error('Error creating pickup request:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to create pickup request. Please try again.'
      );
    } finally {
      setSubmittingPickup(null);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadParkedVehicles();
    setRefreshing(false);
  };

  // Filter vehicles based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredVehicles(parkedVehicles);
    } else {
      const filtered = parkedVehicles.filter(vehicle =>
        vehicle.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.ownerName.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredVehicles(filtered);
    }
  }, [searchQuery, parkedVehicles]);

  const renderVehicleItem = ({ item }: { item: ParkedVehicle }) => (
    <Surface style={styles.vehicleCard} elevation={3}>
      <View style={styles.vehicleContent}>
        <View style={[styles.vehicleIcon, { backgroundColor: item.isVerified ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)' }]}>
          <Icon name="directions-car" size={24} color={item.isVerified ? "#10b981" : "#f59e0b"} />
        </View>
        <View style={styles.vehicleDetails}>
          <Text style={styles.licensePlate}>{item.number}</Text>
          <Text style={styles.vehicleModel}>{item.make} {item.model}</Text>
        
          <Text style={styles.customerName}>{item.ownerName}</Text>
          <Text style={styles.parkedTime}>
            Parked: {new Date(item.createdAt).toLocaleDateString()} at {new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </Text>
        </View>
        <View style={styles.actionContainer}>
          {item.isVerified ? (
            <TouchableOpacity
              style={[
                styles.pickupButton,
                submittingPickup === item.id && styles.pickupButtonDisabled
              ]}
              onPress={() => handleRequestPickup(item)}
              disabled={submittingPickup === item.id}
            >
              <Icon name="local-shipping" size={16} color="#FFFFFF" />
              <Text style={[
                styles.pickupButtonText,
                submittingPickup === item.id && styles.pickupButtonTextDisabled
              ]}>
                {submittingPickup === item.id ? "•••" : "Pickup"}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.verificationPendingContainer}>
              <Icon name="hourglass-empty" size={16} color={COLORS.warning} />
              <Text style={styles.verificationPendingText}>Pending</Text>
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
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Request Pickup</Text>
            <Text style={styles.headerSubtitle}>
              Select a vehicle to request pickup
            </Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefresh}
          >
            <Icon name="refresh" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by license plate or customer name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.textSecondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Icon name="close" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {parkedVehicles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="local-parking" size={64} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>No Parked Vehicles</Text>
          <Text style={styles.emptySubtitle}>
            No vehicles are currently available for pickup
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredVehicles}
          renderItem={renderVehicleItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
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
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  clearButton: {
    marginLeft: SPACING.sm,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  vehicleCard: {
    flex: 1,
    margin: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#FFFFFF',
    elevation: 3,
    padding: SPACING.md,
  },
  vehicleContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  vehicleDetails: {
    flex: 1,
  },
  licensePlate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  vehicleModel: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  vehicleColor: {
    fontSize: 13,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  customerName: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  parkedTime: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  actionContainer: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  pickupButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    minWidth: 80,
    alignItems: 'center',
  },
  pickupButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
  },
  pickupButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pickupButtonTextDisabled: {
    color: '#FFFFFF',
  },
  verificationPendingChip: {
    backgroundColor: COLORS.warning + '20',
    marginTop: SPACING.xs,
  },
  verificationPendingChipText: {
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: '600',
  },
  verificationPendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.warning + '20',
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.warning + '40',
    minHeight: 36,
  },
  verificationPendingText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.warning,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default RequestPickupScreen;
