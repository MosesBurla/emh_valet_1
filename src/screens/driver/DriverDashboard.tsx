import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  RefreshControl,
  Alert,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  StatusBar,
} from 'react-native';
import { Card, Chip, Badge, Surface } from 'react-native-paper';
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
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ParkingRequest | null>(null);
  const [acceptingRequest, setAcceptingRequest] = useState(false);
  const [parkingRequest, setParkingRequest] = useState(false);
  const [handingOverRequest, setHandingOverRequest] = useState(false);

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
      // Call the backend API to accept the request
      const result = await apiService.acceptRequest(request.id);

      if (result.success) {
        // Refresh the list to show updated requests
        await loadRequests();

        // Close modal if it was open (not needed anymore)
        setShowRequestModal(false);
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

  const handleMarkAsParked = async (request: ParkingRequest) => {
    setParkingRequest(true);
    try {
      const result = await apiService.markParked(request.id);

      if (result.success) {
        // Refresh the list to show updated requests
        await loadRequests();

        Alert.alert(
          'Vehicle Parked Successfully',
          `Vehicle ${request.licensePlate} has been marked as parked and the request is now complete.`,
          [
            { text: 'OK', onPress: () => setShowRequestModal(false) },
          ]
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
          `Vehicle ${request.licensePlate} handover has been completed and the request is now finished.`,
          [
            { text: 'OK', onPress: () => setShowRequestModal(false) },
          ]
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



  const renderRequest = ({ item }: { item: ParkingRequest }) => (
    <Card style={[
      styles.requestCard,
      item.status === 'accepted' && styles.acceptedRequestCard,
    ]}>
      <Card.Content>
        <View style={styles.requestHeader}>
          <View style={styles.locationContainer}>
            <Icon name="location-on" size={20} color={COLORS.primary} />
            <Text style={styles.location}>{item.location}</Text>
          </View>
          {item.status === 'accepted' ? (
            <Chip
              mode="flat"
              style={styles.acceptedStatusChip}
            >
              ACCEPTED
            </Chip>
          ) : (
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
          )}
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
          {item.status === 'accepted' ? (
            <AccessibleButton
              title={
                item.type === 'park'
                  ? (parkingRequest ? "Parking..." : "Mark Parked")
                  : (handingOverRequest ? "Handing Over..." : "Mark Handed Over")
              }
              onPress={() => {
                if (item.type === 'park') {
                  handleMarkAsParked(item);
                } else {
                  handleMarkAsHandedOver(item);
                }
              }}
              variant="primary"
              size="small"
              disabled={parkingRequest || handingOverRequest}
              accessibilityLabel={
                item.type === 'park'
                  ? `Mark ${item.licensePlate} as parked`
                  : `Mark ${item.licensePlate} handover as complete`
              }
              accessibilityHint={
                item.type === 'park'
                  ? `Mark this vehicle as successfully parked`
                  : `Mark this vehicle handover as completed`
              }
              style={item.type === 'park' ? styles.parkButton : styles.pickupButton}
            />
          ) : (
            <AccessibleButton
              title={acceptingRequest ? "Accepting..." : "Accept"}
              onPress={() => handleAcceptRequest(item)}
              variant="primary"
              size="small"
              disabled={acceptingRequest}
              accessibilityLabel={`Accept request for ${item.licensePlate}`}
              accessibilityHint={`Accept the ${item.type} request for ${item.ownerName}`}
              style={styles.acceptButton}
            />
          )}
        </View>
      </Card.Content>
    </Card>
  );

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
              <Icon name="local-taxi" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Driver Dashboard</Text>
              <Text style={styles.headerSubtitle}>Ready to handle requests</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.headerAction}>
            <Icon name="notifications-outline" size={24} color="#FFFFFF" />
            {requests.length > 0 && (
              <View style={styles.notificationDot} />
            )}
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
            <FlatList
              data={requests}
              renderItem={renderRequest}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              style={styles.requestsList}
            />
          ) : (
            <Surface style={styles.emptyCard} elevation={2}>
              <View style={styles.emptyContainer}>
                <Icon name="inbox" size={48} color={COLORS.textSecondary} />
                <Text style={styles.emptyText}>No requests available</Text>
                <Text style={styles.emptySubtext}>
                  Pull down to refresh or wait for new requests
                </Text>
              </View>
            </Surface>
          )}
        </View>
      </ScrollView>

      {/* Request Details Modal */}
      <Modal
        visible={showRequestModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowRequestModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowRequestModal(false)}
              style={styles.modalBackButton}
            >
              <Icon name="arrow-back" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Request Details</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          {selectedRequest && (
            <View style={styles.modalContent}>
              <Card style={styles.modalCard}>
                <Card.Content style={styles.modalCardContent}>
                  <View style={styles.statusContainer}>
                    <Text style={styles.statusLabel}>Status:</Text>
                    <Chip
                      mode="outlined"
                      style={[
                        styles.statusChip,
                        selectedRequest.status === 'accepted' && styles.acceptedChip,
                      ]}
                    >
                      {selectedRequest.status.toUpperCase()}
                    </Chip>
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Vehicle Information</Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.label}>License Plate:</Text>
                      <Text style={styles.value}>{selectedRequest.licensePlate}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.label}>Make/Model:</Text>
                      <Text style={styles.value}>
                        {selectedRequest.vehicleMake} {selectedRequest.vehicleModel}
                      </Text>
                    </View>
                    {selectedRequest.vehicleColor && (
                      <View style={styles.infoRow}>
                        <Text style={styles.label}>Color:</Text>
                        <Text style={styles.value}>{selectedRequest.vehicleColor}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Owner Information</Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.label}>Name:</Text>
                      <Text style={styles.value}>{selectedRequest.ownerName}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.label}>Phone:</Text>
                      <Text style={styles.value}>{selectedRequest.ownerPhone}</Text>
                    </View>
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Request Details</Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.label}>Type:</Text>
                      <Chip
                        mode="outlined"
                        style={[
                          styles.typeChip,
                          selectedRequest.type === 'pickup' && styles.pickupChip,
                          selectedRequest.type === 'park' && styles.parkChip,
                        ]}
                      >
                        {selectedRequest.type.toUpperCase()}
                      </Chip>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.label}>Location:</Text>
                      <Text style={styles.value}>{selectedRequest.location}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.label}>Estimated Time:</Text>
                      <Text style={styles.value}>{selectedRequest.estimatedTime} minutes</Text>
                    </View>
                    {selectedRequest.notes && (
                      <View style={styles.infoRow}>
                        <Text style={styles.label}>Notes:</Text>
                        <Text style={styles.value}>{selectedRequest.notes}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.modalActions}>
                    {selectedRequest.type === 'park' && (
                      <AccessibleButton
                        title={parkingRequest ? "Marking as Parked..." : "Mark as Parked"}
                        onPress={() => handleMarkAsParked(selectedRequest)}
                        variant="primary"
                        disabled={parkingRequest}
                        accessibilityLabel="Mark vehicle as parked"
                        accessibilityHint="Mark this vehicle as successfully parked"
                        style={styles.modalActionButton}
                      />
                    )}
                    {selectedRequest.type === 'pickup' && (
                      <AccessibleButton
                        title={handingOverRequest ? "Completing Handover..." : "Mark as Handed Over"}
                        onPress={() => handleMarkAsHandedOver(selectedRequest)}
                        variant="primary"
                        disabled={handingOverRequest}
                        accessibilityLabel="Mark handover as complete"
                        accessibilityHint="Mark this vehicle handover as completed"
                        style={styles.modalActionButton}
                      />
                    )}
                  </View>
                </Card.Content>
              </Card>
            </View>
          )}
        </SafeAreaView>
      </Modal>
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
  requestsList: {
    paddingHorizontal: SPACING.md,
  },
  emptyCard: {
    marginHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    padding: SPACING.xl,
  },
  requestCard: {
    margin: SPACING.md,
    elevation: 2,
  },
  acceptedRequestCard: {
    margin: SPACING.md,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
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
  parkButton: {
    flex: 1,
    backgroundColor: COLORS.success,
  },
  pickupButton: {
    flex: 1,
    backgroundColor: COLORS.warning,
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
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalBackButton: {
    padding: SPACING.xs,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  modalHeaderSpacer: {
    width: 32, // Same width as back button for centering
  },
  modalContent: {
    flex: 1,
    padding: SPACING.md,
  },
  modalCard: {
    flex: 1,
    elevation: 4,
  },
  modalCardContent: {
    flex: 1,
    padding: SPACING.lg,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginRight: SPACING.sm,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  acceptedChip: {
    backgroundColor: COLORS.secondary,
  },
  acceptedStatusChip: {
    backgroundColor: COLORS.secondary,
    color: COLORS.card,
    borderRadius: BORDER_RADIUS.sm,
  },
  activeChip: {
    backgroundColor: COLORS.secondary,
    color: COLORS.card,
    borderRadius: BORDER_RADIUS.sm,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  availableRequestsSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 2,
    textAlign: 'right',
  },
  modalActions: {
    marginTop: SPACING.xl,
    gap: SPACING.md,
  },
  modalActionButton: {
    marginBottom: SPACING.sm,
  },
});

export default DriverDashboard;
