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
} from 'react-native';
import { Surface, Card, Chip } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import AccessibleButton from '../../components/AccessibleButton';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants';
import { apiService } from '../../services/ApiService';

type RootStackParamList = {
  ParkedVehicles: undefined;
  RequestPickup: { vehicleId: string; vehicleInfo: any };
  ValetDashboard: undefined;
};

type ParkedVehiclesNavigationProp = StackNavigationProp<RootStackParamList>;

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

const ParkedVehiclesScreen: React.FC = () => {
  const navigation = useNavigation<ParkedVehiclesNavigationProp>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [parkedVehicles, setParkedVehicles] = useState<ParkedVehicle[]>([]);

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

  const handleRequestPickup = (vehicle: ParkedVehicle) => {
    Alert.alert(
      'Request Pickup',
      `Request pickup for ${vehicle.number} - ${vehicle.make} ${vehicle.model}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Request Pickup',
          onPress: () => {
            navigation.navigate('RequestPickup', {
              vehicleId: vehicle.id,
              vehicleInfo: vehicle,
            });
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadParkedVehicles();
    setRefreshing(false);
  };

  const renderVehicleItem = ({ item }: { item: ParkedVehicle }) => (
    <Surface style={styles.vehicleCard} elevation={2}>
      <View style={styles.vehicleHeader}>
        <View style={styles.vehicleInfo}>
          <Text style={styles.licensePlate}>{item.number}</Text>
          <Text style={styles.vehicleName}>
            {item.make} {item.model}
          </Text>
          <Text style={styles.vehicleColor}>{item.color}</Text>
        </View>
        <View style={styles.statusContainer}>
          <Chip
            style={[
              styles.statusChip,
              item.status === 'parked'
                ? { backgroundColor: COLORS.success + '20' }
                : { backgroundColor: COLORS.warning + '20' },
            ]}
            textStyle={[
              styles.statusText,
              item.status === 'parked'
                ? { color: COLORS.success }
                : { color: COLORS.warning },
            ]}
          >
            {item.status.toUpperCase()}
          </Chip>
        </View>
      </View>

      <View style={styles.vehicleDetails}>
        <View style={styles.detailRow}>
          <Icon name="person" size={16} color={COLORS.textSecondary} />
          <Text style={styles.detailText}>{item.ownerName}</Text>
        </View>
        <View style={styles.detailRow}>
          <Icon name="phone" size={16} color={COLORS.textSecondary} />
          <Text style={styles.detailText}>{item.ownerPhone}</Text>
        </View>
        <View style={styles.detailRow}>
          <Icon name="access-time" size={16} color={COLORS.textSecondary} />
          <Text style={styles.detailText}>
            Parked: {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.vehicleActions}>
        <AccessibleButton
          title="Request Pickup"
          onPress={() => handleRequestPickup(item)}
          variant="outline"
          size="small"
          accessibilityLabel={`Request pickup for ${item.number}`}
          style={styles.actionButton}
        />
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
            <Text style={styles.headerTitle}>Parked Vehicles</Text>
            <Text style={styles.headerSubtitle}>
              {parkedVehicles.length} vehicles parked
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

      {parkedVehicles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="local-parking" size={64} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>No Parked Vehicles</Text>
          <Text style={styles.emptySubtitle}>
            No vehicles are currently parked in the system
          </Text>
        </View>
      ) : (
        <FlatList
          data={parkedVehicles}
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
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: SPACING.md,
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
  listContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  vehicleCard: {
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#FFFFFF',
    padding: SPACING.lg,
    marginBottom: SPACING.md,
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
  licensePlate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  vehicleColor: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statusContainer: {
    marginLeft: SPACING.md,
  },
  statusChip: {
    height: 28,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  vehicleDetails: {
    marginBottom: SPACING.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
  },
  vehicleActions: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: SPACING.md,
  },
  actionButton: {
    width: '100%',
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

export default ParkedVehiclesScreen;
