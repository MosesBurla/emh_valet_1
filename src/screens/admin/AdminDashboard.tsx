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
import { Card, Chip, Surface } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AccessibleButton from '../../components/AccessibleButton';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { COLORS, SPACING, BORDER_RADIUS, STORAGE_KEYS, USER_ROLES } from '../../constants';
import { apiService, User } from '../../services/ApiService';

type RootStackParamList = {
  AdminDashboard: undefined;
  UserManagement: undefined;
  History: undefined;
  Profile: undefined;
  Login: undefined;
  PendingRegistrations: undefined;
  SystemStatistics: undefined;
  ParkingLocations: undefined;
  SystemHealth: undefined;
};

type AdminDashboardNavigationProp = StackNavigationProp<RootStackParamList>;

const AdminDashboard: React.FC = () => {
  const navigation = useNavigation<AdminDashboardNavigationProp>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [showAllPending, setShowAllPending] = useState(false);

  useEffect(() => {
    loadDashboardData();
    loadPendingUsers();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load statistics and health data
      const statsResult = await apiService.getStatistics();
      const healthResult = await apiService.getSystemHealth();

      if (statsResult && healthResult) {
        setStats({
          totalUsers: healthResult.users?.total || 0,
          activeUsers: healthResult.users?.active || 0,
          pendingUsers: healthResult.users?.pending || 0,
          totalVehicles: healthResult.vehicles?.total || 0,
          parkedVehicles: healthResult.vehicles?.parked || 0,
          totalRequests: statsResult.overview?.totalRequests || 0,
          requestsByStatus: statsResult.requestsByStatus || [],
          vehiclesByStatus: statsResult.vehiclesByStatus || [],
          feedbackStats: statsResult.feedbackStats || { avgRating: 0, totalFeedback: 0 },
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
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

  const loadPendingUsers = async () => {
    try {
      const result = await apiService.getPendingRegistrations();
      if (result) {
        setPendingUsers(result || []);
      }
    } catch (error) {
      console.error('Error loading pending users:', error);
    }
  };

  const handleApproveUser = async (userId: string, role: string) => {
    try {
      const result = await apiService.approveUser(userId, role);
      if (result) {
        Alert.alert('Success', 'User approved successfully');
        await loadDashboardData();
        await loadPendingUsers();
      }
    } catch (error) {
      console.error('Error approving user:', error);
      Alert.alert('Error', 'Failed to approve user');
    }
  };

  const handleRejectUser = async (userId: string) => {
    Alert.alert(
      'Confirm Rejection',
      'Are you sure you want to reject this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await apiService.rejectUser(userId);
              if (result) {
                Alert.alert('Success', 'User rejected successfully');
                await loadPendingUsers();
                await loadDashboardData();
              }
            } catch (error) {
              console.error('Error rejecting user:', error);
              Alert.alert('Error', 'Failed to reject user');
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    await loadPendingUsers();
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
              <Icon name="admin-panel-settings" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Admin Dashboard</Text>
              <Text style={styles.headerSubtitle}>Welcome back! Here's your system overview</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.headerAction}>
            <Icon name="notifications-outline" size={24} color="#FFFFFF" />
            <View style={styles.notificationDot} />
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
            <Icon name="analytics" size={32} color={COLORS.primary} />
            <View style={styles.welcomeText}>
              <Text style={styles.welcomeTitle}>System Status</Text>
              <Text style={styles.welcomeSubtitle}>Everything is running smoothly</Text>
            </View>
            <View style={styles.statusIndicator}>
              <Icon name="check-circle" size={20} color={COLORS.success} />
            </View>
          </View>
        </Surface>

        {/* Statistics Grid */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>

          <View style={styles.statsGrid}>
            {/* Users Card */}
            <Surface style={styles.statsCard} elevation={3}>
              <TouchableOpacity style={styles.statsCardTouchable}>
                <View style={styles.statsCardHeader}>
                  <View style={[styles.statsIcon, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                    <Icon name="people" size={24} color="#6366f1" />
                  </View>
                  <Icon name="trending-up" size={16} color={COLORS.success} />
                </View>
                <Text style={styles.statsNumber}>{stats?.totalUsers || 0}</Text>
                <Text style={styles.statsLabel}>Total Users</Text>
                <Text style={styles.statsSubtext}>{stats?.activeUsers || 0} active users</Text>
              </TouchableOpacity>
            </Surface>

            {/* Vehicles Card */}
            <Surface style={styles.statsCard} elevation={3}>
              <TouchableOpacity style={styles.statsCardTouchable}>
                <View style={styles.statsCardHeader}>
                  <View style={[styles.statsIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                    <Icon name="local-parking" size={24} color="#10b981" />
                  </View>
                  <Icon name="info" size={16} color={COLORS.textSecondary} />
                </View>
                <Text style={styles.statsNumber}>{stats?.totalVehicles || 0}</Text>
                <Text style={styles.statsLabel}>Total Vehicles</Text>
                <Text style={styles.statsSubtext}>{stats?.parkedVehicles || 0} currently parked</Text>
              </TouchableOpacity>
            </Surface>
          </View>

          <View style={styles.statsGrid}>
            {/* Requests Card */}
            <Surface style={styles.statsCard} elevation={3}>
              <TouchableOpacity style={styles.statsCardTouchable}>
                <View style={styles.statsCardHeader}>
                  <View style={[styles.statsIcon, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                    <Icon name="assignment" size={24} color="#8b5cf6" />
                  </View>
                </View>
                <Text style={styles.statsNumber}>{stats?.totalRequests || 0}</Text>
                <Text style={styles.statsLabel}>Total Requests</Text>
                <Text style={styles.statsSubtext}>All time requests</Text>
              </TouchableOpacity>
            </Surface>

            {/* Completed Card */}
            <Surface style={styles.statsCard} elevation={3}>
              <TouchableOpacity style={styles.statsCardTouchable}>
                <View style={styles.statsCardHeader}>
                  <View style={[styles.statsIcon, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                    <Icon name="check-circle" size={24} color="#22c55e" />
                  </View>
                  <Icon name="verified" size={16} color={COLORS.success} />
                </View>
                <Text style={styles.statsNumber}>
                  {stats?.requestsByStatus?.find((s: any) => s._id === 'completed' || s._id === 'verified' || s._id === 'self_pickup')?.count || 0}
                </Text>
                <Text style={styles.statsLabel}>Completed</Text>
                <Text style={styles.statsSubtext}>Successfully finished</Text>
              </TouchableOpacity>
            </Surface>
          </View>

          <View style={styles.statsGrid}>
            {/* Rating Card */}
            <Surface style={styles.statsCard} elevation={3}>
              <TouchableOpacity style={styles.statsCardTouchable}>
                <View style={styles.statsCardHeader}>
                  <View style={[styles.statsIcon, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                    <Icon name="star" size={24} color="#f59e0b" />
                  </View>
                </View>
                <Text style={styles.statsNumber}>
                  {stats?.feedbackStats?.avgRating ? stats.feedbackStats.avgRating.toFixed(1) : '0.0'}
                </Text>
                <Text style={styles.statsLabel}>Avg Rating</Text>
                <Text style={styles.statsSubtext}>Customer satisfaction</Text>
              </TouchableOpacity>
            </Surface>

            {/* Available Card */}
            <Surface style={styles.statsCard} elevation={3}>
              <TouchableOpacity style={styles.statsCardTouchable}>
                <View style={styles.statsCardHeader}>
                  <View style={[styles.statsIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                    <Icon name="electric-car" size={24} color="#3b82f6" />
                  </View>
                </View>
                <Text style={styles.statsNumber}>
                  {stats?.vehiclesByStatus?.find((s: any) => s._id === 'available')?.count || 0}
                </Text>
                <Text style={styles.statsLabel}>Available</Text>
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
              onPress={() => navigation.navigate('UserManagement')}
            >
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                <Icon name="manage-accounts" size={24} color="#6366f1" />
              </View>
              <Text style={styles.actionTitle}>User Management</Text>
              <Text style={styles.actionSubtitle}>Manage system users</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => Alert.alert('Reports', 'Reports feature coming soon')}
            >
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Icon name="assessment" size={24} color="#10b981" />
              </View>
              <Text style={styles.actionTitle}>View Reports</Text>
              <Text style={styles.actionSubtitle}>Analytics & insights</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pending Approvals */}
        {pendingUsers.length > 0 && (
          <View style={styles.approvalsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pending Approvals</Text>
              <TouchableOpacity onPress={() => setShowAllPending(!showAllPending)}>
                <Text style={styles.viewAllButton}>
                  {showAllPending ? 'Show Less' : `View All (${pendingUsers.length})`}
                </Text>
              </TouchableOpacity>
            </View>

            <Surface style={styles.approvalsCard} elevation={2}>
              {pendingUsers.slice(0, showAllPending ? undefined : 3).map((user, index) => (
                <View key={user._id} style={[styles.approvalItem, index > 0 && styles.approvalItemBorder]}>
                  <View style={styles.userInfo}>
                    <View style={styles.userAvatar}>
                      <Text style={styles.userInitial}>{user.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.userDetails}>
                      <Text style={styles.userName}>{user.name}</Text>
                      <Text style={styles.userEmail}>{user.email}</Text>
                      <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>{user.role.replace('_', ' ').toUpperCase()}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.approvalActions}>
                    <TouchableOpacity
                      style={styles.approveButton}
                      onPress={() => handleApproveUser(user._id, user.role)}
                    >
                      <Icon name="check" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => handleRejectUser(user._id)}
                    >
                      <Icon name="close" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {!showAllPending && pendingUsers.length > 3 && (
                <TouchableOpacity
                  style={styles.viewMoreCard}
                  onPress={() => setShowAllPending(true)}
                >
                  <Icon name="keyboard-arrow-down" size={20} color={COLORS.primary} />
                  <Text style={styles.viewMoreCardText}>View {pendingUsers.length - 3} more pending users</Text>
                </TouchableOpacity>
              )}
            </Surface>
          </View>
        )}
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
  approvalsSection: {
    marginTop: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  viewAllButton: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  approvalsCard: {
    marginHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  approvalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  approvalItemBorder: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  userInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  roleBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 10,
    color: COLORS.warning,
    fontWeight: '500',
  },
  approvalActions: {
    flexDirection: 'row',
    marginLeft: SPACING.md,
  },
  approveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.xs,
  },
  rejectButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewMoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    margin: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  viewMoreCardText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
    marginLeft: SPACING.xs,
  },
});

export default AdminDashboard;
