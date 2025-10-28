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
  Modal,
  TextInput,
  StatusBar,
} from 'react-native';
import { Card, Button, Portal, Chip } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { COLORS, SPACING, BORDER_RADIUS, USER_ROLES } from '../../constants';
import { apiService, User } from '../../services/ApiService';

type RootStackParamList = {
  AdminDashboard: undefined;
  UserManagement: undefined;
};

type UserManagementNavigationProp = StackNavigationProp<RootStackParamList>;

const UserManagementScreen: React.FC = () => {
  const navigation = useNavigation<UserManagementNavigationProp>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([loadUsers(), loadPendingUsers()]);
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const result = await apiService.getAllUsers();
      if (result.success && result.data && Array.isArray(result.data)) {
        setUsers(result.data);
      } else {
        console.error('Failed to load users:', result.message);
        Alert.alert('Error', result.message || 'Failed to load users');
        setUsers([]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingUsers = async () => {
    try {
      const result = await apiService.getPendingRegistrations();
      if (result.success && result.data && Array.isArray(result.data)) {
        setPendingUsers(result.data);
      } else {
        console.error('Failed to load pending users:', result.message);
        Alert.alert('Error', result.message || 'Failed to load pending users');
        setPendingUsers([]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load pending users');
      setPendingUsers([]);
    }
  };

  const handleApproveUser = async (userId: string, role: string) => {
    try {
      const result = await apiService.approveUser(userId, role);
      if (result.success) {
        Alert.alert('Success', result.message || 'User approved successfully');
        await loadData();
      } else {
        console.error('Failed to approve user:', result.message);
        Alert.alert('Error', result.message || 'Failed to approve user');
      }
    } catch (error) {
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
              if (result.success) {
                Alert.alert('Success', result.message || 'User rejected successfully');
                await loadPendingUsers();
              } else {
                console.error('Failed to reject user:', result.message);
                Alert.alert('Error', result.message || 'Failed to reject user');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to reject user');
            }
          },
        },
      ]
    );
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    try {
      const result = await apiService.editUser(selectedUser._id, editForm);
      if (result.success) {
        Alert.alert('Success', result.message || 'User updated successfully');
        setShowEditModal(false);
        setSelectedUser(null);
        await loadUsers();
      } else {
        console.error('Failed to update user:', result.message);
        Alert.alert('Error', result.message || 'Failed to update user');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update user');
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      email: user.email || '',
      phone: user.phone,
    });
    setShowEditModal(true);
  };

  const updateUserRole = async () => {
    if (!selectedUser) return;

    try {
      const result = await apiService.editUser(selectedUser._id, { role: newRole });
      if (result.success) {
        Alert.alert('Success', result.message || 'User role updated successfully');
        setShowRoleModal(false);
        setSelectedUser(null);
        await loadUsers();
      } else {
        console.error('Failed to update user role:', result.message);
        Alert.alert('Error', result.message || 'Failed to update user role');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update user role');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#E3F2FD';
      case 'driver': return '#E8F5E8';
      case 'valet_supervisor': return '#FFF3E0';
      case 'parking_location_supervisor': return '#F3E5F5';
      default: return '#F5F5F5';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'approved' ? '#E8F5E8' : '#FFF3E0';
  };

  const UserCard = ({ user, isPending = false }: { user: User; isPending?: boolean }) => (
    <Card style={styles.userCard}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.userRow}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userDetail}>{user.email}</Text>
            <Text style={styles.userDetail}>{user.phone}</Text>
          </View>

          <View style={styles.userActions}>
            <Chip
              style={[styles.chip, { backgroundColor: getStatusColor(user.status) }]}
              textStyle={styles.chipText}
            >
              {user.status}
            </Chip>

            <Chip
              style={[styles.chip, { backgroundColor: getRoleColor(user.role) }]}
              textStyle={styles.roleChipText}
            >
              {user.role.replaceAll('_', ' ').toUpperCase()}
            </Chip>

            <View style={styles.buttonRow}>
              {isPending ? (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => handleApproveUser(user._id, user.role)}
                  >
                    <Icon name="check" size={18} color="#2E7D32" />
                    <Text style={[styles.buttonText, { color: '#2E7D32' }]}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleRejectUser(user._id)}
                  >
                    <Icon name="close" size={18} color="#D32F2F" />
                    <Text style={[styles.buttonText, { color: '#D32F2F' }]}>Reject</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => openEditModal(user)}
                  >
                    <Icon name="edit" size={18} color="#1976D2" />
                    <Text style={[styles.buttonText, { color: '#1976D2' }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.roleButton]}
                    onPress={() => {
                      setSelectedUser(user);
                      setNewRole(user.role);
                      setShowRoleModal(true);
                    }}
                  >
                    <Icon name="manage-accounts" size={18} color="#7B1FA2" />
                    <Text style={[styles.buttonText, { color: '#7B1FA2' }]}>Role</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Icon name="hourglass-empty" size={48} color={COLORS.textSecondary} />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#1976D2" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Icon name="people" size={24} color="#1976D2" />
          <Text style={styles.headerText}>User Management</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Pending Users Section */}
        {pendingUsers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Approvals ({pendingUsers.length})</Text>
            {pendingUsers.map((user) => (
              <UserCard key={user._id} user={user} isPending />
            ))}
          </View>
        )}

        {/* Approved Users Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Approved Users ({users.length})</Text>
          {users.map((user) => (
            <UserCard key={user._id} user={user} />
          ))}
        </View>

        {/* Empty State */}
        {users.length === 0 && pendingUsers.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="people-outline" size={64} color="#B0BEC5" />
            <Text style={styles.emptyStateText}>No users found</Text>
          </View>
        )}
      </ScrollView>

      {/* Role Update Modal */}
      <Portal>
        <Modal
          visible={showRoleModal}
          onDismiss={() => setShowRoleModal(false)}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Update User Role</Text>
                <TouchableOpacity onPress={() => setShowRoleModal(false)}>
                  <Icon name="close" size={24} color="#757575" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalLabel}>Select Role</Text>
              <View style={styles.roleOptions}>
                {Object.values(USER_ROLES).map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.roleOption,
                      newRole === role && styles.selectedRoleOption,
                    ]}
                    onPress={() => setNewRole(role)}
                  >
                    <Text
                      style={[
                        styles.roleOptionText,
                        newRole === role && styles.selectedRoleOptionText,
                      ]}
                    >
                      {role.replaceAll('_', ' ').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <Button
                  mode="outlined"
                  onPress={() => setShowRoleModal(false)}
                  style={styles.cancelButton}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={updateUserRole}
                  style={styles.confirmButton}
                >
                  Update Role
                </Button>
              </View>
            </View>
          </View>
        </Modal>
      </Portal>

      {/* Edit User Modal */}
      <Portal>
        <Modal
          visible={showEditModal}
          onDismiss={() => setShowEditModal(false)}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit User Details</Text>
                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                  <Icon name="close" size={24} color="#757575" />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={editForm.name}
                onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                placeholderTextColor="#B0BEC5"
              />

              <TextInput
                style={styles.input}
                placeholder="Email Address"
                value={editForm.email}
                onChangeText={(text) => setEditForm({ ...editForm, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#B0BEC5"
              />

              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                value={editForm.phone}
                onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                keyboardType="phone-pad"
                placeholderTextColor="#B0BEC5"
              />

              <View style={styles.modalActions}>
                <Button
                  mode="outlined"
                  onPress={() => setShowEditModal(false)}
                  style={styles.cancelButton}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleEditUser}
                  style={styles.confirmButton}
                >
                  Save Changes
                </Button>
              </View>
            </View>
          </View>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: '#757575',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingLeft: SPACING.md,
    paddingTop: 40,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: SPACING.sm,
    marginRight: SPACING.md,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
    marginLeft: SPACING.sm,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginBottom: SPACING.lg,
  },
  userCard: {
    marginBottom: SPACING.md,
    elevation: 2,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#FFFFFF',
  },
  cardContent: {
    padding: SPACING.lg,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginBottom: SPACING.xs,
  },
  userDetail: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 2,
  },
  userActions: {
    alignItems: 'flex-end',
  },
  chip: {
    marginBottom: SPACING.sm,
    height: 32,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#212121',
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1976D2',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    minWidth: 80,
    justifyContent: 'center',
  },
  approveButton: {
    backgroundColor: '#E8F5E8',
  },
  rejectButton: {
    backgroundColor: '#FFEBEE',
  },
  editButton: {
    backgroundColor: '#E3F2FD',
  },
  roleButton: {
    backgroundColor: '#F3E5F5',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: SPACING.xs,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#B0BEC5',
    marginTop: SPACING.md,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    margin: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    width: '90%',
    maxWidth: 400,
  },
  modalContent: {
    maxHeight: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
  },
  modalLabel: {
    fontSize: 16,
    color: '#212121',
    marginBottom: SPACING.md,
    fontWeight: '500',
  },
  roleOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  roleOption: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  selectedRoleOption: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
  },
  roleOptionText: {
    color: '#212121',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedRoleOptionText: {
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.md,
  },
  cancelButton: {
    borderColor: '#757575',
  },
  confirmButton: {
    backgroundColor: '#1976D2',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    fontSize: 16,
    color: '#212121',
    backgroundColor: '#FFFFFF',
  },
});

export default UserManagementScreen;
