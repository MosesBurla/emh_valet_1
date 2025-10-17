import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Card, Chip } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AccessibleButton from '../../components/AccessibleButton';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { ParkingRequest } from '../../types';
import { COLORS, SPACING, BORDER_RADIUS, STORAGE_KEYS } from '../../constants';
import { apiService } from '../../services/ApiService';

type RootStackParamList = {
  DriverDashboard: undefined;
  RequestDetails: { request: ParkingRequest };
  Login: undefined;
};

type RequestDetailsRouteProp = RouteProp<RootStackParamList, 'RequestDetails'>;
type RequestDetailsNavigationProp = StackNavigationProp<RootStackParamList>;

const RequestDetailsScreen: React.FC = () => {
  const navigation = useNavigation<RequestDetailsNavigationProp>();
  const route = useRoute<RequestDetailsRouteProp>();
  const { request } = route.params;

  const [loading, setLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(request.status);

  const handleMarkAsParked = async () => {
    setLoading(true);
    try {
      // Call backend API to mark vehicle as parked
      const result = await apiService.markParked(request.id);

      if (result.success) {
        setCurrentStatus('completed');
        Alert.alert(
          'Vehicle Parked',
          `Vehicle ${request.licensePlate} has been successfully parked`,
          [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to mark vehicle as parked');
      }
    } catch (error) {
      console.error('Error marking as parked:', error);
      Alert.alert('Error', 'Failed to mark vehicle as parked');
    } finally {
      setLoading(false);
    }
  };

  const handleHandoverComplete = async () => {
    setLoading(true);
    try {
      // Call backend API to mark handover as complete
      const result = await apiService.markHandedOver(request.id);

      if (result.success) {
        setCurrentStatus('completed');
        Alert.alert(
          'Handover Complete',
          `Handover for vehicle ${request.licensePlate} completed successfully`,
          [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to complete handover');
      }
    } catch (error) {
      console.error('Error completing handover:', error);
      Alert.alert('Error', 'Failed to complete handover');
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

  if (loading) {
    return <LoadingSkeleton type="full" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Request Details</Text>
        </View>

        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.statusContainer}>
              <Text style={styles.statusLabel}>Status:</Text>
              <Chip
                mode="outlined"
                style={[
                  styles.statusChip,
                  currentStatus === 'pending' && styles.pendingChip,
                  currentStatus === 'accepted' && styles.acceptedChip,
                  currentStatus === 'completed' && styles.completedChip,
                ]}
              >
                {currentStatus.toUpperCase()}
              </Chip>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vehicle Information</Text>
              <View style={styles.infoRow}>
                <Text style={styles.label}>License Plate:</Text>
                <Text style={styles.value}>{request.licensePlate}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Make/Model:</Text>
                <Text style={styles.value}>
                  {request.vehicleMake} {request.vehicleModel}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Color:</Text>
                <Text style={styles.value}>{request.vehicleColor}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Owner Information</Text>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Name:</Text>
                <Text style={styles.value}>{request.ownerName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Phone:</Text>
                <Text style={styles.value}>{request.ownerPhone}</Text>
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
                    request.type === 'pickup' && styles.pickupChip,
                    request.type === 'park' && styles.parkChip,
                  ]}
                >
                  {request.type.toUpperCase()}
                </Chip>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Location:</Text>
                <Text style={styles.value}>{request.location}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Priority:</Text>
                <Chip
                  mode="outlined"
                  style={[
                    styles.priorityChip,
                    request.priority === 'standard' && styles.standardChip,
                    request.priority === 'vip' && styles.vipChip,
                    request.priority === 'emergency' && styles.emergencyChip,
                  ]}
                >
                  {request.priority.toUpperCase()}
                </Chip>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Estimated Time:</Text>
                <Text style={styles.value}>{request.estimatedTime} minutes</Text>
              </View>
              {request.specialInstructions && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Special Instructions:</Text>
                  <Text style={styles.value}>{request.specialInstructions}</Text>
                </View>
              )}
            </View>

            <View style={styles.timestampsSection}>
              <Text style={styles.sectionTitle}>Timestamps</Text>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Created:</Text>
                <Text style={styles.value}>
                  {new Date(request.createdAt).toLocaleString()}
                </Text>
              </View>
              {request.acceptedAt && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Accepted:</Text>
                  <Text style={styles.value}>
                    {new Date(request.acceptedAt).toLocaleString()}
                  </Text>
                </View>
              )}
              {request.completedAt && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Completed:</Text>
                  <Text style={styles.value}>
                    {new Date(request.completedAt).toLocaleString()}
                  </Text>
                </View>
              )}
            </View>

            {currentStatus === 'accepted' && (
              <View style={styles.actionsSection}>
                <Text style={styles.sectionTitle}>Actions</Text>
                <View style={styles.actionButtons}>
                  {request.type === 'park' && (
                    <AccessibleButton
                      title="Mark as Parked"
                      onPress={handleMarkAsParked}
                      variant="primary"
                      accessibilityLabel="Mark vehicle as parked"
                      accessibilityHint="Mark this vehicle as successfully parked"
                      style={styles.actionButton}
                    />
                  )}
                  {request.type === 'pickup' && (
                    <AccessibleButton
                      title="Handover Complete"
                      onPress={handleHandoverComplete}
                      variant="primary"
                      accessibilityLabel="Mark handover as complete"
                      accessibilityHint="Mark this vehicle handover as completed"
                      style={styles.actionButton}
                    />
                  )}
                </View>
              </View>
            )}

            {currentStatus === 'completed' && (
              <View style={styles.completedSection}>
                <Icon name="check-circle" size={48} color={COLORS.success} />
                <Text style={styles.completedText}>
                  {request.type === 'park' ? 'Vehicle Parked' : 'Handover Completed'}
                </Text>
                <Text style={styles.completedSubtext}>
                  This request has been successfully completed
                </Text>
              </View>
            )}
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
  scrollContainer: {
    paddingBottom: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  logoutButton: {
    marginLeft: SPACING.md,
  },
  card: {
    margin: SPACING.md,
    elevation: 4,
  },
  cardContent: {
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
  pendingChip: {
    backgroundColor: COLORS.warning,
  },
  acceptedChip: {
    backgroundColor: COLORS.secondary,
  },
  completedChip: {
    backgroundColor: COLORS.success,
  },
  section: {
    marginBottom: SPACING.lg,
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
  typeChip: {
    alignSelf: 'flex-start',
  },
  pickupChip: {
    backgroundColor: COLORS.warning,
  },
  parkChip: {
    backgroundColor: COLORS.success,
  },
  priorityChip: {
    alignSelf: 'flex-start',
  },
  standardChip: {
    backgroundColor: COLORS.border,
  },
  vipChip: {
    backgroundColor: COLORS.accent,
  },
  emergencyChip: {
    backgroundColor: COLORS.error,
  },
  timestampsSection: {
    marginBottom: SPACING.lg,
  },
  actionsSection: {
    marginTop: SPACING.xl,
  },
  actionButtons: {
    gap: SPACING.md,
  },
  actionButton: {
    marginBottom: SPACING.sm,
  },
  completedSection: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.lg,
  },
  completedText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.success,
    marginTop: SPACING.md,
  },
  completedSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});

export default RequestDetailsScreen;
