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

      if (result && Array.isArray(result)) {
        // Transform API response to match our interface
        const transformedVehicles: ParkedVehicle[] = result.map((vehicle: any) => ({
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
        Alert.alert('Error', 'Failed to load parked vehicles');
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
        locationFrom: {
          lat: 40.7128,
          lng: -74.0060,
        },
        notes: `Pickup requested for ${vehicle.number} - ${vehicle.make} ${vehicle.model}`,
      });

      if (result) {
        Alert.alert(
          'Success',
          `Pickup request created for ${vehicle.number}!`,
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
    <Surface style={styles.vehicleCard} elevation={1}>
      <View style={styles.vehicleContent}>
        <View style={styles.vehicleInfo}>
          <Text style={styles.licensePlate}>{item.number}</Text>
          <Text style={styles.customerName}>{item.ownerName}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.pickupButton,
            submittingPickup === item.id && styles.pickupButtonDisabled
          ]}
          onPress={() => handleRequestPickup(item)}
          disabled={submittingPickup === item.id}
        >
          <Text style={[
            styles.pickupButtonText,
            submittingPickup === item.id && styles.pickupButtonTextDisabled
          ]}>
            {submittingPickup === item.id ? "Creating..." : "Pickup"}
          </Text>
        </TouchableOpacity>
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
  listContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  vehicleCard: {
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#FFFFFF',
    marginBottom: SPACING.sm,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  vehicleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  vehicleInfo: {
    flex: 1,
  },
  licensePlate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  customerName: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  pickupButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  pickupButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
  },
  pickupButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  pickupButtonTextDisabled: {
    color: '#FFFFFF',
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
