import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Card, Avatar, Chip, Surface } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AccessibleButton from '../../components/AccessibleButton';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { User } from '../../types';
import { COLORS, SPACING, BORDER_RADIUS, STORAGE_KEYS } from '../../constants';

const lightTheme = {
  background: COLORS.background,
  surface: COLORS.surface,
  surfaceSecondary: COLORS.surfaceSecondary,
  textPrimary: COLORS.textPrimary,
  textSecondary: COLORS.textSecondary,
  card: COLORS.card,
  border: COLORS.border,
};

const darkTheme = {
  background: COLORS.backgroundDark,
  surface: COLORS.surfaceDark,
  surfaceSecondary: COLORS.surfaceDark,
  textPrimary: COLORS.textPrimaryDark,
  textSecondary: COLORS.textSecondaryDark,
  card: COLORS.surfaceDark,
  border: COLORS.borderDark,
};

const ProfileScreen: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    loadUserProfile();

    // Animate profile appearance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
              await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
              // Navigation will be handled by App.tsx when it detects no auth
              Alert.alert('Logged Out', 'You have been successfully logged out');
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'Failed to logout');
            }
          }
        }
      ]
    );
  };

  const handleEditProfile = () => {
    Alert.alert('Edit Profile', 'Edit profile functionality would be implemented here');
  };

  const handleChangePassword = () => {
    Alert.alert('Change Password', 'Change password functionality would be implemented here');
  };

  const handleSettings = () => {
    Alert.alert('Settings', 'Settings functionality would be implemented here');
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  if (loading) {
    return <LoadingSkeleton type="full" />;
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Icon name="person" size={64} color={COLORS.textSecondary} />
          <Text style={styles.errorText}>Unable to load profile</Text>
          <AccessibleButton
            title="Retry"
            onPress={loadUserProfile}
            variant="outline"
            accessibilityLabel="Retry loading profile"
          />
        </View>
      </SafeAreaView>
    );
  }

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={theme.surface}
      />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: theme.surface }]}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Profile</Text>
          <TouchableOpacity
            style={styles.darkModeToggle}
            onPress={toggleDarkMode}
            accessibilityLabel={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            accessibilityHint="Toggle between light and dark themes"
          >
            <Icon
              name={isDarkMode ? "light-mode" : "dark-mode"}
              size={24}
              color={theme.textPrimary}
            />
          </TouchableOpacity>
        </View>

        <Animated.View
          style={[
            styles.profileCardContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Card style={[styles.profileCard, { backgroundColor: theme.surface }]}>
            <Card.Content style={[styles.profileContent, { backgroundColor: theme.surface }]}>
              <View style={styles.avatarContainer}>
                <Surface style={[styles.avatarSurface, { backgroundColor: theme.surfaceSecondary }]} elevation={3}>
                  <Avatar.Text
                    size={90}
                    label={user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    style={styles.avatar}
                  />
                </Surface>
                <Text style={[styles.name, { color: theme.textPrimary }]}>{user.name}</Text>
                <View style={[styles.roleContainer, { backgroundColor: theme.surfaceSecondary }]}>
                  <Icon name="verified-user" size={14} color={COLORS.primary} />
                  <Text style={[styles.role, { color: COLORS.primary }]}>{user.role.replace('_', ' ').toUpperCase()}</Text>
                </View>
                <Surface style={[styles.statusSurface, { backgroundColor: theme.surfaceSecondary }]} elevation={2}>
                  <Chip
                    mode="outlined"
                    style={[
                      styles.statusChip,
                      user.status === 'active' && styles.activeChip,
                      user.status === 'inactive' && styles.inactiveChip,
                      user.status === 'pending' && styles.pendingChip,
                    ]}
                  >
                    <Icon
                      name={
                        user.status === 'active' ? 'check-circle' :
                        user.status === 'inactive' ? 'cancel' : 'schedule'
                      }
                      size={14}
                      color={
                        user.status === 'active' ? COLORS.success :
                        user.status === 'inactive' ? COLORS.error : COLORS.warning
                      }
                    />
                    {' ' + user.status.toUpperCase()}
                  </Chip>
                </Surface>
              </View>
            </Card.Content>
          </Card>
        </Animated.View>

        <Card style={[styles.infoCard, { backgroundColor: theme.surface }]}>
          <Card.Content style={[styles.infoContent, { backgroundColor: theme.surface }]}>
            <View style={styles.sectionHeader}>
              <Icon name="contact-mail" size={22} color={COLORS.primary} />
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Contact Information</Text>
            </View>

            <TouchableOpacity style={[styles.infoItem, { backgroundColor: theme.card }]}>
              <View style={styles.infoRow}>
                <View style={[styles.iconContainer, { backgroundColor: theme.surfaceSecondary }]}>
                  <Icon name="email" size={18} color={COLORS.primary} />
                </View>
                <View style={styles.infoText}>
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Email Address</Text>
                  <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{user.email || 'Not provided'}</Text>
                </View>
                <Icon name="chevron-right" size={20} color={theme.textSecondary} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.infoItem, { backgroundColor: theme.card }]}>
              <View style={styles.infoRow}>
                <View style={[styles.iconContainer, { backgroundColor: theme.surfaceSecondary }]}>
                  <Icon name="phone" size={18} color={COLORS.primary} />
                </View>
                <View style={styles.infoText}>
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Phone Number</Text>
                  <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{user.phone}</Text>
                </View>
                <Icon name="chevron-right" size={20} color={theme.textSecondary} />
              </View>
            </TouchableOpacity>

            {user.licenseNumber && (
              <TouchableOpacity style={[styles.infoItem, { backgroundColor: theme.card }]}>
                <View style={styles.infoRow}>
                  <View style={[styles.iconContainer, { backgroundColor: theme.surfaceSecondary }]}>
                    <Icon name="assignment" size={18} color={COLORS.primary} />
                  </View>
                  <View style={styles.infoText}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>License Number</Text>
                    <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{user.licenseNumber}</Text>
                  </View>
                  <Icon name="chevron-right" size={20} color={theme.textSecondary} />
                </View>
              </TouchableOpacity>
            )}

            {user.licenseExpiry && (
              <TouchableOpacity style={[styles.infoItem, { backgroundColor: theme.card }]}>
                <View style={styles.infoRow}>
                  <View style={[styles.iconContainer, { backgroundColor: theme.surfaceSecondary }]}>
                    <Icon name="event" size={18} color={COLORS.primary} />
                  </View>
                  <View style={styles.infoText}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>License Expiry</Text>
                    <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{user.licenseExpiry}</Text>
                  </View>
                  <Icon name="chevron-right" size={20} color={theme.textSecondary} />
                </View>
              </TouchableOpacity>
            )}
          </Card.Content>
        </Card>



        <Card style={[styles.logoutCard, { backgroundColor: theme.surface }]}>
          <Card.Content style={[styles.logoutContent, { backgroundColor: theme.surface }]}>
            <TouchableOpacity
              style={[styles.logoutButton, { backgroundColor: theme.card }]}
              onPress={handleLogout}
              accessibilityLabel="Logout from application"
              accessibilityHint="Sign out from your account"
            >
              <View style={[styles.logoutIconContainer, { backgroundColor: COLORS.error + '20' }]}>
                <Icon name="logout" size={18} color={COLORS.error} />
              </View>
              <View style={styles.logoutText}>
                <Text style={[styles.logoutTitle, { color: COLORS.error }]}>Logout</Text>
                <Text style={[styles.logoutSubtitle, { color: theme.textSecondary }]}>Sign out from your account</Text>
              </View>
              <Icon name="chevron-right" size={20} color={COLORS.error} />
            </TouchableOpacity>
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
    paddingTop: StatusBar.currentHeight || 0,
  },
  scrollContainer: {
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
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
  darkModeToggle: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.backgroundSecondary,
  },
  profileCardContainer: {
    margin: SPACING.md,
  },
  profileCard: {
    margin: SPACING.md,
    elevation: 4,
    borderRadius: BORDER_RADIUS.lg,
  },
  profileContent: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.surface,
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatarSurface: {
    borderRadius: 45,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.backgroundSecondary,
  },
  avatar: {
    backgroundColor: COLORS.primary,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  role: {
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: SPACING.xs,
    fontWeight: '600',
  },
  statusSurface: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: BORDER_RADIUS.md,
  },
  statusChip: {
    backgroundColor: 'transparent',
  },
  statusChipText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  activeChip: {
    backgroundColor: COLORS.success,
  },
  inactiveChip: {
    backgroundColor: COLORS.error,
  },
  pendingChip: {
    backgroundColor: COLORS.warning,
  },
  infoCard: {
    margin: SPACING.md,
    elevation: 4,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },

  infoContent: {
    padding: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 0,
    marginLeft: SPACING.sm,
  },
  infoItem: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  infoText: {
    marginLeft: 0,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: SPACING.xs,
  },
  infoValue: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  actionsCard: {
    margin: SPACING.md,
    elevation: 4,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },

  actionsContent: {
    padding: 0,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  actionText: {
    flex: 1,
    marginLeft: 0,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  actionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  actionButton: {
    marginBottom: SPACING.md,
  },
  logoutCard: {
    margin: SPACING.md,
    elevation: 4,
    borderRadius: BORDER_RADIUS.lg,
  },
  logoutContent: {
    padding: 0,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
  },
  logoutIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.error + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  logoutText: {
    flex: 1,
    marginLeft: 0,
  },
  logoutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.error,
    marginBottom: SPACING.xs,
  },
  logoutSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    marginTop: SPACING.md,
  },
});

export default ProfileScreen;
