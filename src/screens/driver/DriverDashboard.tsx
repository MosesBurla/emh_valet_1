import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Card, Chip } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
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

  useEffect(() => {
    loadRequests();
    setupSocketListeners();

    return () => {
      SocketService.off('new_request');
      SocketService.off('request_updated');
    };
  }, []);

  const setupSocketListeners = () => {
    SocketService.on('new_request', (request: ParkingRequest) => {
      setRequests(prev => [request, ...prev]);
      console.log('New request received:', request);
    });

    SocketService.on('request_updated', (updatedRequest: ParkingRequest) => {
      setRequests(prev =>
        prev.map(req => req.id === updatedRequest.id ? updatedRequest : req)
      );
    });

    SocketService.on('request_accepted', (data: { requestId: string, driverName: string }) => {
      setRequests(prev =>
        prev.filter(req => req.id !== data.requestId)
      );
      console.log('Request accepted:', data);
    });
  };

  const loadRequests = async () => {
    try {
      setLoading(true);
      // Fetch incoming requests from backend API
      const result = await apiService.getIncomingRequests();

      if (result.success && result.data) {
        // Transform backend data to match frontend interface
        const transformedRequests: ParkingRequest[] = result.data.map((request: any) => ({
          id: request._id || request.id,
          type: request.type,
          status: request.status,
          location: request.locationFrom?.address || 'Unknown Location',
          licensePlate: request.vehicleId?.number || 'Unknown',
          ownerName: request.vehicleId?.ownerName || 'Unknown',
          ownerPhone: request.vehicleId?.ownerPhone || 'Unknown',
          vehicleMake: request.vehicleId?.make,
          vehicleModel: request.vehicleId?.model,
          estimatedTime: 15, // Default estimated time
          priority: 'standard', // Default priority
          createdAt: request.createdAt,
          acceptedAt: request.acceptedAt,
        }));
        setRequests(transformedRequests);
      } else {
        Alert.alert('Error', result.message || 'Failed to load requests');
      }
    } catch (error) {
      console.error('Error loading requests:', error);
      Alert.alert('Error', 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (request: ParkingRequest) => {
    try {
      await SocketService.acceptRequest(request.id);

      // Update local state immediately for better UX
      setRequests(prev =>
        prev.map(req =>
          req.id === request.id
            ? { ...req, status: 'accepted' as const, acceptedAt: new Date().toISOString() }
            : req
        )
      );

      Alert.alert(
        'Request Accepted',
        `Request for ${request.type} service accepted successfully`,
        [
          { text: 'OK', onPress: () => viewRequestDetails(request) },
        ]
      );
    } catch (error) {
      console.error('Error accepting request:', error);
      Alert.alert('Error', 'Failed to accept request');
    }
  };

  const viewRequestDetails = (request: ParkingRequest) => {
    navigation.navigate('RequestDetails', { request });
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

  const renderRequest = ({ item }: { item: ParkingRequest }) => (
    <Card style={styles.requestCard}>
      <Card.Content>
        <View style={styles.requestHeader}>
          <View style={styles.locationContainer}>
            <Icon name="location-on" size={20} color={COLORS.primary} />
            <Text style={styles.location}>{item.location}</Text>
          </View>
          <Chip
            mode="outlined"
            style={[
              styles.typeChip,
              item.type === 'pickup' && styles.pickupChip,
              item.type === 'park' && styles.parkChip,
            ]}
          >
            {item.type.toUpperCase()}
          </Chip>
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.plate}>License Plate: {item.licensePlate}</Text>
          <Text style={styles.owner}>Owner: {item.ownerName}</Text>
          <Text style={styles.phone}>Phone: {item.ownerPhone}</Text>
          {item.vehicleMake && (
            <Text style={styles.vehicle}>
              Vehicle: {item.vehicleMake} {item.vehicleModel}
            </Text>
          )}
          <Text style={styles.estimatedTime}>
            Estimated Time: {item.estimatedTime} minutes
          </Text>
        </View>

        <View style={styles.actions}>
          <AccessibleButton
            title="View Details"
            onPress={() => viewRequestDetails(item)}
            variant="outline"
            size="small"
            accessibilityLabel={`View details for ${item.licensePlate}`}
            style={styles.detailsButton}
          />
          <AccessibleButton
            title="Accept"
            onPress={() => handleAcceptRequest(item)}
            variant="primary"
            size="small"
            accessibilityLabel={`Accept request for ${item.licensePlate}`}
            accessibilityHint={`Accept the ${item.type} request for ${item.ownerName}`}
            style={styles.acceptButton}
          />
        </View>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return <LoadingSkeleton type="card" count={3} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <Icon name="local-taxi" size={28} color={COLORS.primary} />
            <Text style={styles.title}>Driver Dashboard</Text>
          </View>
          <View style={styles.headerBadge}>
            <Text style={styles.onlineStatus}>● Online</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Icon name="playlist-add-check" size={24} color={COLORS.primary} />
          </View>
          <Text style={styles.statNumber}>{requests.length}</Text>
          <Text style={styles.statLabel}>Available Requests</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Icon name="work" size={24} color={COLORS.secondary} />
          </View>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Active Jobs</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Icon name="attach-money" size={24} color={COLORS.success} />
          </View>
          <Text style={styles.statNumber}>$127</Text>
          <Text style={styles.statLabel}>Today's Earnings</Text>
        </View>
      </View>

      <FlatList
        data={requests}
        renderItem={renderRequest}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="inbox" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>No requests available</Text>
            <Text style={styles.emptySubtext}>
              Pull down to refresh or wait for new requests
            </Text>
          </View>
        }
        contentContainerStyle={requests.length === 0 && styles.emptyList}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  headerBadge: {
    backgroundColor: COLORS.successLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
  },
  onlineStatus: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: '600',
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
  requestCard: {
    margin: SPACING.md,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  location: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginLeft: SPACING.xs,
  },
  typeChip: {
    alignSelf: 'flex-start',
  },
  pickupChip: {
    backgroundColor: COLORS.warning,
  },
  parkChip: {
    backgroundColor: COLORS.success,
  },
  detailsContainer: {
    marginBottom: SPACING.md,
  },
  plate: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  owner: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  phone: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  vehicle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  estimatedTime: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  detailsButton: {
    flex: 1,
  },
  acceptButton: {
    flex: 1,
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
  emptyList: {
    flexGrow: 1,
  },
});

export default DriverDashboard;
