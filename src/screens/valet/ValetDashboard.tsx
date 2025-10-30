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
} from 'react-native';
import { Card, Surface } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AccessibleButton from '../../components/AccessibleButton';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { COLORS, SPACING, BORDER_RADIUS, STORAGE_KEYS } from '../../constants';
import { apiService } from '../../services/ApiService';

type RootStackParamList = {
  ValetDashboard: undefined;
  AddVehicle: undefined;
  RequestPickup: undefined;
  History: undefined;
  Profile: undefined;
  Login: undefined;
};

type ValetDashboardNavigationProp = StackNavigationProp<RootStackParamList>;

const ValetDashboard: React.FC = () => {
  const navigation = useNavigation<ValetDashboardNavigationProp>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [parkedVehicles, setParkedVehicles] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load dashboard statistics
      const statsResponse = await apiService.getValetDashboardStats?.();
      const parkedResponse = await apiService.getParkedVehicles();

      if (statsResponse && statsResponse.success) {
        setStats(statsResponse.data);
      }

      if (parkedResponse && parkedResponse.success && Array.isArray(parkedResponse.data)) {
        setParkedVehicles(parkedResponse.data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Could add error alert using error.message from standardized response
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
    await loadDashboardData();
    setRefreshing(false);
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
              <Icon name="local-parking" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Valet Dashboard</Text>
              <Text style={styles.headerSubtitle}>Manage your parking operations</Text>
            </View>
          </View>
          {/* <TouchableOpacity style={styles.headerAction}>
            <Icon name="notifications" size={24} color="#FFFFFF" />
            <View style={styles.notificationDot} />
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
        {/* Welcome Card */}
        <Surface style={styles.welcomeCard} elevation={2}>
          <View style={styles.welcomeContent}>
            <Icon name="local-parking" size={32} color={COLORS.primary} />
            <View style={styles.welcomeText}>
              <Text style={styles.welcomeTitle}>Valet Operations</Text>
              <Text style={styles.welcomeSubtitle}>Ready to serve customers</Text>
            </View>
            <View style={styles.statusIndicator}>
              <Icon name="check-circle" size={20} color={COLORS.success} />
            </View>
          </View>
        </Surface>

        {/* Statistics Grid */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Today's Overview</Text>

          <View style={styles.statsGrid}>
            {/* Parked Vehicles Card */}
            <Surface style={styles.statsCard} elevation={3}>
              <TouchableOpacity style={styles.statsCardTouchable}>
                <Text style={styles.statsNumber}>{stats?.totalParked || parkedVehicles.length}</Text>
                <Text style={styles.statsLabel}>Parked Vehicles</Text>
                <Text style={styles.statsSubtext}>Currently parked</Text>
              </TouchableOpacity>
            </Surface>

            {/* Today's Requests Card */}
            <Surface style={styles.statsCard} elevation={3}>
              <TouchableOpacity style={styles.statsCardTouchable}>
                <Text style={styles.statsNumber}>{stats?.totalRequests || 0}</Text>
                <Text style={styles.statsLabel}>Total Requests</Text>
                <Text style={styles.statsSubtext}>All time requests</Text>
              </TouchableOpacity>
            </Surface>

            {/* Verified Card */}
            <Surface style={styles.statsCard} elevation={3}>
              <TouchableOpacity style={styles.statsCardTouchable}>
                <Text style={styles.statsNumber}>{stats?.totalVerified || 0}</Text>
                <Text style={styles.statsLabel}>Verified</Text>
                <Text style={styles.statsSubtext}>Verified vehicles</Text>
              </TouchableOpacity>
            </Surface>

            {/* Available Drivers Card */}
            <Surface style={styles.statsCard} elevation={3}>
              <TouchableOpacity style={styles.statsCardTouchable}>
                <Text style={styles.statsNumber}>{stats?.availableDrivers || 0}</Text>
                <Text style={styles.statsLabel}>Available Drivers</Text>
                <Text style={styles.statsSubtext}>Ready for service</Text>
              </TouchableOpacity>
            </Surface>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('AddVehicle')}
            >
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                <Icon name="add-circle" size={24} color="#6366f1" />
              </View>
              <Text style={styles.actionTitle}>Add Vehicle</Text>
              <Text style={styles.actionSubtitle}>Park new vehicle</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('RequestPickup')}
            >
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                <Icon name="local-shipping" size={24} color="#f59e0b" />
              </View>
              <Text style={styles.actionTitle}>Request Pickup</Text>
              <Text style={styles.actionSubtitle}>Request vehicle retrieval</Text>
            </TouchableOpacity>
          </View>
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
  statsSection: {
    marginTop: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
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
  statsCardTouchable: {
    padding: SPACING.md,
  },
  statsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statsIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  statsLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  statsSubtext: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  actionsSection: {
    marginTop: SPACING.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    margin: SPACING.xs,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    elevation: 2,
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 2,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  activitySection: {
    marginTop: SPACING.md,
  },
  activityCard: {
    marginHorizontal: SPACING.md,
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
  },
});

export default ValetDashboard;
