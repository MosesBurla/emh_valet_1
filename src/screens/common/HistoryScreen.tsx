import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  SafeAreaView,
  Animated,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ScrollView,
  Platform,
} from 'react-native';
import { Card, Chip, Searchbar, Menu, Divider, FAB, Badge } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import AccessibleButton from '../../components/AccessibleButton';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { ParkingHistory, User } from '../../types';
import { COLORS, SPACING, BORDER_RADIUS, STORAGE_KEYS } from '../../constants';
import { apiService } from '../../services/ApiService';

const HistoryScreen: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'today' | 'week' | 'month' | 'park' | 'pickup'>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'park' | 'pickup'>('all');
  const [userRole, setUserRole] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0 });

  // Pagination and lazy loading
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [searching, setSearching] = useState(false);

  // Date selection
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);

  // Enhanced filter states
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<{start: Date | null, end: Date | null}>({start: null, end: null});

  // Modern filter bottom sheet state
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [filterSheetHeight, setFilterSheetHeight] = useState(0);

  // Date picker state
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'start' | 'end'>('start');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Animation values
  const scrollY = new Animated.Value(0);
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    loadHistory();
    getUserRole();
  }, []);

  const getUserRole = async () => {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (userData) {
        const user = JSON.parse(userData);
        setUserRole(user.role);
      }
    } catch (error) {
      console.error('Error getting user role:', error);
    }
  };

  const loadHistory = async (page: number = 1, search?: string) => {
    try {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);

      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (userData) {
        const user = JSON.parse(userData);
        let response: any = { history: [] };

        // Build query parameters for API search
        const queryParams = new URLSearchParams();
        if (search) queryParams.append('searchValue', search);
        if (selectedFilter !== 'all') {
          const dateFrom = getDateFromFilter(selectedFilter);
          if (dateFrom) queryParams.append('dateFrom', dateFrom);
        }
        queryParams.append('page', page.toString());
        queryParams.append('limit', '20');

        // Use different API endpoints based on user role
        if (user.role === 'driver') {
          response.history = await apiService.getDriverHistory();
        } else if (user.role === 'admin') {
          const queryObj = Object.fromEntries(queryParams.entries());
          response = await apiService.getComprehensiveHistory(queryObj);
        } else if (user.role === 'supervisor' || user.role === 'valet_supervisor' || user.role === 'parking_location_supervisor') {
          response.history = await apiService.getSupervisorHistory();
        } else {
          response.history = await apiService.getDriverHistory();
        }

        const data = response.history || [];

        // Transform API data to better utilize the available fields
        const transformedData: any[] = data.map((item: any) => ({
          id: item._id || item.id,
          requestId: item.requestId,
          vehicleId: item.vehicleId,
          action: item.action,
          details: item.details || {},
          timestamp: item.timestamp || item.createdAt,
          performedBy: item.performedBy || {},
          // Extract additional data from nested objects
          licensePlate: item.details?.carNumber || item.vehicleId?.number || 'N/A',
          ownerName: item.details?.ownerName || 'N/A',
          ownerPhone: item.details?.ownerPhone || '',
          type: item.details?.requestType || item.action?.replace('_request', '') || 'park',
          location: item.details?.location || 'N/A',
          status: getStatusFromAction(item.action),
          driverName: item.details?.parkDriverName || item.details?.pickupDriverName || item.performedBy?.name,
          isSelfService: item.action?.includes('self_'),
          serviceType: item.action?.includes('self_parked') ? 'Self Park' : item.action?.includes('self_pickup') ? 'Self Pickup' : null,
          notes: item.details?.notes || '',
          vehicleMake: item.vehicleId?.make || '',
          vehicleModel: item.vehicleId?.model || '',
        }));

        if (page === 1) {
          setHistory(transformedData);
        } else {
          setHistory(prev => [...prev, ...transformedData]);
        }

        // Update pagination state
        setHasMorePages(data.length === 20);
        setCurrentPage(page);

        // Calculate stats
        const completed = transformedData.filter(item => item.status === 'completed').length;
        const pending = transformedData.filter(item => item.status === 'pending').length;
        setStats({
          total: transformedData.length,
          completed,
          pending
        });
      }
    } catch (error) {
      console.error('Error loading history:', error);
      Alert.alert('Error', 'Failed to load history');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setSearching(false);
    }
  };

  const getDateFromFilter = (filter: string): string | null => {
    const today: Date = new Date();
    switch (filter) {
      case 'today':
        return today.toISOString().split('T')[0];
      case 'week': {
        const weekAgo: Date = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        return weekAgo.toISOString().split('T')[0];
      }
      case 'month': {
        const monthAgo: Date = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        return monthAgo.toISOString().split('T')[0];
      }
      default:
        return null;
    }
  };

  const getStatusFromAction = (action: string) => {
    if (!action) return 'completed';
    if (action.includes('completed') || action.includes('verified') || action.includes('handed_over')) {
      return 'completed';
    }
    if (action.includes('pending') || action.includes('request')) {
      return 'pending';
    }
    return 'completed';
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      // Navigation will be handled by parent component
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert('Error', 'Failed to logout');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const filteredAndSortedHistory = history
    .filter((item) => {
      const matchesSearch = searchQuery === '' ||
        item.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.driverName?.toLowerCase().includes(searchQuery.toLowerCase());

      // Apply type filter
      if (selectedTypeFilter !== 'all' && item.type !== selectedTypeFilter) {
        return false;
      }

      // Apply status filter
      if (selectedStatusFilter !== 'all' && item.status !== selectedStatusFilter) {
        return false;
      }

      // Apply date range filter
      if (selectedDateRange.start && selectedDateRange.end) {
        const itemDate = new Date(item.timestamp);
        if (itemDate < selectedDateRange.start || itemDate > selectedDateRange.end) {
          return false;
        }
      }

      // Apply legacy date filters
      if (selectedFilter === 'all') return matchesSearch;
      if (selectedFilter === 'today') {
        const today = new Date().toDateString();
        const itemDate = new Date(item.timestamp).toDateString();
        return matchesSearch && itemDate === today;
      }
      if (selectedFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const itemDate = new Date(item.timestamp);
        return matchesSearch && itemDate >= weekAgo;
      }
      if (selectedFilter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        const itemDate = new Date(item.timestamp);
        return matchesSearch && itemDate >= monthAgo;
      }
      return matchesSearch;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

  const handleFilterSelect = (filter: 'all' | 'today' | 'week' | 'month') => {
    console.log('Filter selected:', filter);
    setSelectedFilter(filter);
    setFilterMenuVisible(false);
    setCurrentPage(1);
    loadHistory(1, searchQuery);
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return COLORS.success;
      case 'pending':
        return COLORS.warning;
      case 'cancelled':
        return COLORS.error;
      default:
        return COLORS.textSecondary;
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'park' ? 'local-parking' : 'drive-eta';
  };

  const renderHistoryItem = ({ item }: { item: any }) => (
    <Animated.View style={{ opacity: 1 }}>
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          {/* Compact Header */}
          <View style={styles.cardHeader}>
            <View style={styles.leftSection}>
              <View style={styles.typeContainer}>
                <Icon
                  name={getTypeIcon(item.type)}
                  size={16}
                  color={COLORS.primary}
                />
                <Text style={styles.typeText}>
                  {item.isSelfService ? item.serviceType : (item.type === 'park' ? 'Parking' : 'Pickup')}
                </Text>
              </View>
              <Text style={styles.licensePlate}>{item.licensePlate}</Text>
            </View>
            <View style={styles.rightSection}>
              <Chip
                mode="flat"
                style={[
                  styles.statusChip,
                  { backgroundColor: getStatusColor(item.status) + '25' }
                ]}
                textStyle={{ color: getStatusColor(item.status), fontSize: 10 }}
              >
                {item.status.toUpperCase()}
              </Chip>
              <Text style={styles.timestamp}>
                {formatDate(item.timestamp)}
              </Text>
            </View>
          </View>

          {/* Compact Info Section */}
          <View style={styles.compactInfo}>
            <View style={styles.mainInfo}>
              <Icon name="person" size={14} color={COLORS.textSecondary} />
              <Text style={styles.ownerName}>{item.ownerName}</Text>
              {item.driverName && !item.isSelfService && (
                <View style={styles.driverInfo}>
                  <Icon name="person-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.driverName}>{item.driverName}</Text>
                </View>
              )}
              {item.isSelfService && (
                <View style={styles.selfServiceInfo}>
                  <Icon name="self-improvement" size={14} color={COLORS.accent} />
                  <Text style={styles.selfServiceText}>{item.serviceType}</Text>
                </View>
              )}
            </View>

            {(item.vehicleMake || item.vehicleModel) && (
              <View style={styles.vehicleInfo}>
                <Icon name="directions-car" size={14} color={COLORS.textSecondary} />
                <Text style={styles.vehicleText}>
                  {[item.vehicleMake, item.vehicleModel].filter(Boolean).join(' ')}
                </Text>
              </View>
            )}
          </View>

          {/* Notes Section - Only if exists */}
          {item.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.notesText} numberOfLines={2}>{item.notes}</Text>
            </View>
          )}
        </Card.Content>
      </Card>
    </Animated.View>
  );

  const loadMoreData = () => {
    if (hasMorePages && !loadingMore && !searching) {
      loadHistory(currentPage + 1);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setSearching(true);
    setCurrentPage(1);
    await loadHistory(1, query);
  };

  const handleFilterChange = async (filter: 'all' | 'today' | 'week' | 'month') => {
    setSelectedFilter(filter);
    setFilterMenuVisible(false);
    setCurrentPage(1);
    await loadHistory(1, searchQuery);
  };

  const handleTypeFilter = async (type: 'all' | 'park' | 'pickup') => {
    setSelectedTypeFilter(type);
    setFilterMenuVisible(false);
    setCurrentPage(1);

    // Apply type filter to current data
    if (type !== 'all') {
      setHistory(prev => prev.filter(item => item.type === type));
    } else {
      // Reload all data if switching back to all types
      await loadHistory(1, searchQuery);
    }
  };

  // Date picker handlers
  const onStartDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setSelectedDateRange(prev => ({
        ...prev,
        start: selectedDate
      }));
    }
  };

  const onEndDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setSelectedDateRange(prev => ({
        ...prev,
        end: selectedDate
      }));
    }
  };

  const showStartDatePickerModal = () => {
    setShowStartDatePicker(true);
  };

  const showEndDatePickerModal = () => {
    setShowEndDatePicker(true);
  };

  if (loading) {
    return <LoadingSkeleton type="card" count={3} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.surface}
        translucent={false}
      />
      {/* Search and Filter Row */}
      <View style={styles.searchFilterContainer}>
        <View style={styles.searchBarContainer}>
          <Searchbar
            placeholder="license plate or driver phone"
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            iconColor={COLORS.primary}
            placeholderTextColor={COLORS.textSecondary}
            loading={searching}
            onSubmitEditing={({ nativeEvent: { text } }) => handleSearch(text)}
            onIconPress={() => handleSearch(searchQuery)}
          />
        </View>
        <TouchableOpacity
          style={styles.filterButtonInline}
          onPress={() => {
            console.log('Filter button pressed');
            setShowFilterSheet(true);
          }}
        >
          <Icon name="filter-list" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Enhanced Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Request History</Text>
      </View>

      {/* Modern Filter Bottom Sheet */}
      {showFilterSheet && (
        <View style={styles.bottomSheetOverlay}>
          <TouchableOpacity
            style={styles.overlayTouchable}
            onPress={() => setShowFilterSheet(false)}
            activeOpacity={1}
          />
          <Animated.View
            style={[
              styles.filterBottomSheet,
              {
                transform: [{ translateY: 0 }], // You can add animation here
              }
            ]}
          >
            {/* Drag Handle */}
            <View style={styles.dragHandle} />

            <View style={styles.filterSheetHeader}>
              <Text style={styles.filterSheetTitle}>Filter Options</Text>
              <TouchableOpacity
                onPress={() => setShowFilterSheet(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={20} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.filterSheetContent}
              showsVerticalScrollIndicator={true}
              bounces={false}
            >
              {/* Status Filters */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Status</Text>
                <View style={styles.chipGrid}>
                  {[
                    { key: 'all', label: 'All Status' },
                    { key: 'pending', label: 'Pending' },
                    { key: 'accepted', label: 'Accepted' },
                    { key: 'completed', label: 'Completed' },
                    { key: 'verified', label: 'Verified' },
                    { key: 'handed_over', label: 'Handed Over' },
                    { key: 'self_parked', label: 'Self Parked' },
                    { key: 'self_pickup', label: 'Self Pickup' },
                  ].map((status) => (
                    <Chip
                      key={status.key}
                      mode={selectedStatusFilter === status.key ? 'flat' : 'outlined'}
                      onPress={() => setSelectedStatusFilter(status.key)}
                      style={[
                        styles.filterChip,
                        selectedStatusFilter === status.key && styles.filterChipSelected
                      ]}
                      textStyle={[
                        styles.filterChipText,
                        selectedStatusFilter === status.key && styles.filterChipTextSelected
                      ]}
                      icon={selectedStatusFilter === status.key ? 'check' : ''}
                    >
                      {status.label}
                    </Chip>
                  ))}
                </View>
              </View>

              {/* Type Filters */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Type</Text>
                <View style={styles.chipGrid}>
                  {[
                    { key: 'all', label: 'All Types' },
                    { key: 'park', label: 'Parking Only' },
                    { key: 'pickup', label: 'Pickup Only' },
                  ].map((type) => (
                    <Chip
                      key={type.key}
                      mode={selectedTypeFilter === type.key ? 'flat' : 'outlined'}
                      onPress={() => setSelectedTypeFilter(type.key as 'all' | 'park' | 'pickup')}
                      style={[
                        styles.filterChip,
                        selectedTypeFilter === type.key && styles.filterChipSelected
                      ]}
                      textStyle={[
                        styles.filterChipText,
                        selectedTypeFilter === type.key && styles.filterChipTextSelected
                      ]}
                      icon={selectedTypeFilter === type.key ? 'check' : ''}
                    >
                      {type.label}
                    </Chip>
                  ))}
                </View>
              </View>

              {/* Date Filters */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Date Range</Text>
                <View style={styles.chipGrid}>
                  {[
                    { key: 'today', label: 'Today' },
                    { key: 'week', label: 'This Week' },
                    { key: 'month', label: 'This Month' },
                  ].map((dateFilter) => (
                    <Chip
                      key={dateFilter.key}
                      mode={selectedFilter === dateFilter.key ? 'flat' : 'outlined'}
                      onPress={() => setSelectedFilter(dateFilter.key as 'all' | 'today' | 'week' | 'month')}
                      style={[
                        styles.filterChip,
                        selectedFilter === dateFilter.key && styles.filterChipSelected
                      ]}
                      textStyle={[
                        styles.filterChipText,
                        selectedFilter === dateFilter.key && styles.filterChipTextSelected
                      ]}
                      icon={selectedFilter === dateFilter.key ? 'check' : ''}
                    >
                      {dateFilter.label}
                    </Chip>
                  ))}

                  <Chip
                    mode={selectedDateRange.start && selectedDateRange.end ? 'flat' : 'outlined'}
                    onPress={() => {
                      setShowCustomDatePicker(true);
                      setPickerMode('start');
                    }}
                    style={[
                      styles.filterChip,
                      (selectedDateRange.start && selectedDateRange.end) && styles.filterChipSelected
                    ]}
                    textStyle={[
                      styles.filterChipText,
                      (selectedDateRange.start && selectedDateRange.end) && styles.filterChipTextSelected
                    ]}
                    icon={(selectedDateRange.start && selectedDateRange.end) ? 'check' : ''}
                  >
                    {selectedDateRange.start && selectedDateRange.end
                      ? `${selectedDateRange.start.toLocaleDateString()} - ${selectedDateRange.end.toLocaleDateString()}`
                      : 'Custom Range'
                    }
                  </Chip>
                </View>
              </View>
            </ScrollView>

            <View style={styles.filterSheetActions}>
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => {
                  setSelectedFilter('all');
                  setSelectedTypeFilter('all');
                  setSelectedStatusFilter('all');
                  setSelectedDateRange({start: null, end: null});
                  setShowFilterSheet(false);
                }}
              >
                <Text style={styles.clearFiltersText}>Clear All</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.applyFiltersButton}
                onPress={() => {
                  setShowFilterSheet(false);
                  setHistory(prev => [...prev]);
                }}
              >
                <Text style={styles.applyFiltersText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}

      {/* Custom Date Picker Modal */}
      {showCustomDatePicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModal}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>
                Select {pickerMode === 'start' ? 'Start' : 'End'} Date
              </Text>
              <TouchableOpacity
                onPress={() => setShowCustomDatePicker(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.datePickerContent}>
              {/* Current Selection Display */}
              <View style={styles.dateSelectionDisplay}>
                <View style={styles.dateSelectionItem}>
                  <Text style={styles.dateSelectionLabel}>Start Date:</Text>
                  <Text style={[
                    styles.dateSelectionValue,
                    !selectedDateRange.start && styles.dateSelectionValueEmpty
                  ]}>
                    {selectedDateRange.start
                      ? selectedDateRange.start.toLocaleDateString()
                      : 'Not selected'
                    }
                  </Text>
                </View>
                <View style={styles.dateSelectionItem}>
                  <Text style={styles.dateSelectionLabel}>End Date:</Text>
                  <Text style={[
                    styles.dateSelectionValue,
                    !selectedDateRange.end && styles.dateSelectionValueEmpty
                  ]}>
                    {selectedDateRange.end
                      ? selectedDateRange.end.toLocaleDateString()
                      : 'Not selected'
                    }
                  </Text>
                </View>
              </View>

              {/* Date Selection Options */}
              <Text style={styles.filterSectionTitle}>Quick Select</Text>
              <View style={styles.chipContainer}>
                <Chip
                  mode="outlined"
                  onPress={() => {
                    const today = new Date();
                    setSelectedDateRange(prev => ({
                      ...prev,
                      [pickerMode]: today
                    }));
                    setPickerMode(pickerMode === 'start' ? 'end' : 'start');
                  }}
                  style={styles.filterChip}
                  textStyle={styles.filterChipText}
                >
                  Today
                </Chip>

                <Chip
                  mode="outlined"
                  onPress={() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    setSelectedDateRange(prev => ({
                      ...prev,
                      [pickerMode]: yesterday
                    }));
                    setPickerMode(pickerMode === 'start' ? 'end' : 'start');
                  }}
                  style={styles.filterChip}
                  textStyle={styles.filterChipText}
                >
                  Yesterday
                </Chip>

                <Chip
                  mode="outlined"
                  onPress={() => {
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    setSelectedDateRange(prev => ({
                      ...prev,
                      [pickerMode]: weekAgo
                    }));
                    setPickerMode(pickerMode === 'start' ? 'end' : 'start');
                  }}
                  style={styles.filterChip}
                  textStyle={styles.filterChipText}
                >
                  Week Ago
                </Chip>

                <Chip
                  mode="outlined"
                  onPress={() => {
                    const monthAgo = new Date();
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    setSelectedDateRange(prev => ({
                      ...prev,
                      [pickerMode]: monthAgo
                    }));
                    setPickerMode(pickerMode === 'start' ? 'end' : 'start');
                  }}
                  style={styles.filterChip}
                  textStyle={styles.filterChipText}
                >
                  Month Ago
                </Chip>
              </View>

              {/* Manual Date Input */}
              <Text style={styles.filterSectionTitle}>Or Select Date</Text>
              <View style={styles.dateInputContainer}>
                <TouchableOpacity
                  style={styles.dateInputButton}
                  onPress={showStartDatePickerModal}
                >
                  <Icon name="calendar-today" size={20} color={COLORS.primary} />
                  <Text style={styles.dateInputText}>
                    {selectedDateRange.start
                      ? `Start: ${selectedDateRange.start.toLocaleDateString()}`
                      : 'Select Start Date'
                    }
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dateInputButton}
                  onPress={showEndDatePickerModal}
                >
                  <Icon name="event" size={20} color={COLORS.primary} />
                  <Text style={styles.dateInputText}>
                    {selectedDateRange.end
                      ? `End: ${selectedDateRange.end.toLocaleDateString()}`
                      : 'Select End Date'
                    }
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Date Time Pickers */}
              {showStartDatePicker && (
                <DateTimePicker
                  value={selectedDateRange.start || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onStartDateChange}
                  is24Hour={false}
                  minimumDate={new Date(1900, 0, 1)}
                  maximumDate={new Date(2100, 11, 31)}
                />
              )}

              {showEndDatePicker && (
                <DateTimePicker
                  value={selectedDateRange.end || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onEndDateChange}
                  is24Hour={false}
                  minimumDate={new Date(1900, 0, 1)}
                  maximumDate={new Date(2100, 11, 31)}
                />
              )}
            </View>

            <View style={styles.filterModalActions}>
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => {
                  setSelectedDateRange({start: null, end: null});
                  setShowCustomDatePicker(false);
                }}
              >
                <Text style={styles.clearFiltersText}>Clear</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.applyFiltersButton,
                  (!selectedDateRange.start || !selectedDateRange.end) && styles.applyFiltersButtonDisabled
                ]}
                onPress={() => {
                  if (selectedDateRange.start && selectedDateRange.end) {
                    setShowCustomDatePicker(false);
                    // Force re-filtering
                    setHistory(prev => [...prev]);
                  }
                }}
                disabled={!selectedDateRange.start || !selectedDateRange.end}
              >
                <Text style={[
                  styles.applyFiltersText,
                  (!selectedDateRange.start || !selectedDateRange.end) && styles.applyFiltersTextDisabled
                ]}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Results Summary - Commented out as requested */}
      {/* {!loading && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText}>
            {filteredAndSortedHistory.length} of {history.length} requests
            {selectedFilter !== 'all' && ` (${selectedFilter})`}
          </Text>
        </View>
      )} */}

      <FlatList
        data={filteredAndSortedHistory}
        renderItem={renderHistoryItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="history" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>
              {searchQuery || selectedFilter !== 'all'
                ? 'No matching history found'
                : 'No history found'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || selectedFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Your completed requests will appear here'}
            </Text>
          </View>
        }
        contentContainerStyle={[
          filteredAndSortedHistory.length === 0 && styles.emptyList,
          { paddingBottom: SPACING.xl }
        ]}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMoreData}
        onEndReachedThreshold={0.1}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMore}>
              <Text style={styles.loadingMoreText}>Loading more...</Text>
            </View>
          ) : !hasMorePages ? (
            <View style={styles.endOfList}>
              <Text style={styles.endOfListText}>No more items to load</Text>
            </View>
          ) : null
        }
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  filterButton: {
    padding: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  // New layout styles
  searchFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl, // Increased top padding for better status bar spacing
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  searchBarContainer: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  searchBar: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    backgroundColor: COLORS.background,
  },
  filterButtonInline: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  // Legacy search container (keeping for compatibility)
  searchContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  filterAnchor: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  summaryContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  summaryText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  card: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  cardContent: {
    padding: SPACING.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  leftSection: {
    flex: 1,
  },
  rightSection: {
    alignItems: 'flex-end',
    marginLeft: SPACING.xs,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  typeIcon: {
    marginRight: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  licensePlate: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  // Compact info styles
  compactInfo: {
    marginBottom: SPACING.xs,
  },
  mainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  locationContainer: {
    flex: 1,
    marginLeft: SPACING.xs,
  },
  ownerName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginLeft: SPACING.xs,
    flex: 1,
  },
  location: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  vehicleText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  selfServiceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  selfServiceText: {
    fontSize: 13,
    color: COLORS.accent,
    fontWeight: '600',
    marginLeft: SPACING.xs,
  },
  driverName: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  // Legacy info styles
  infoSection: {
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statusSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statusContainer: {
    flex: 1,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  notesSection: {
    backgroundColor: COLORS.background,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.md,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  actionSection: {
    alignItems: 'flex-end',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  detailsButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginRight: SPACING.xs,
  },
  // Legacy styles (keeping for compatibility)
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  completedChip: {
    backgroundColor: COLORS.success,
  },
  cancelledChip: {
    backgroundColor: COLORS.error,
  },
  plate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  owner: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  details: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  time: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  driver: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  cost: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  ratingContainer: {
    alignItems: 'flex-start',
  },
  rating: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '600',
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
  loadingMore: {
    padding: SPACING.md,
    alignItems: 'center',
  },
  loadingMoreText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  endOfList: {
    padding: SPACING.md,
    alignItems: 'center',
  },
  endOfListText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  // Modern Filter Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  filterModal: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    width: '95%',
    maxWidth: 420,
    maxHeight: '85%',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  filterModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.2,
  },
  closeButton: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.xxl,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterModalContent: {
    padding: SPACING.lg,
    maxHeight: 400,
    flexGrow: 1,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    marginTop: SPACING.lg,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterOptionSelected: {
    backgroundColor: COLORS.primary + '10',
    borderColor: COLORS.primary + '30',
  },
  filterOptionText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    marginLeft: SPACING.md,
    flex: 1,
    fontWeight: '500',
  },
  filterOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  filterDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.lg,
  },
  filterModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.md,
  },
  clearFiltersButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearFiltersText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  applyFiltersButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyFiltersText: {
    fontSize: 15,
    color: COLORS.surface,
    fontWeight: '700',
  },
  // Modern Bottom Sheet Styles
  bottomSheetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  overlayTouchable: {
    flex: 1,
  },
  filterBottomSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '85%',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: BORDER_RADIUS.xxl,
    alignSelf: 'center',
    marginVertical: SPACING.sm,
  },
  filterSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.2,
  },
  filterSheetContent: {
    padding: SPACING.lg,
    maxHeight: 450,
    flexGrow: 1,
  },
  filterSection: {
    marginBottom: SPACING.lg,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  filterSheetActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  // Modern Chip Filter Styles
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  filterChip: {
    margin: 0,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  filterChipTextSelected: {
    color: COLORS.surface,
    fontWeight: '600',
  },
  // Modern Date Picker Modal Styles
  datePickerModal: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    width: '95%',
    maxWidth: 400,
    maxHeight: '80%',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  datePickerContent: {
    padding: SPACING.lg,
    flexGrow: 1,
  },
  dateSelectionDisplay: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateSelectionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: SPACING.sm,
  },
  dateSelectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: 0.2,
  },
  dateSelectionValue: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '600',
  },
  dateSelectionValueEmpty: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  dateInputContainer: {
    gap: SPACING.md,
  },
  dateInputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dateInputText: {
    fontSize: 16,
    color: COLORS.primary,
    marginLeft: SPACING.md,
    fontWeight: '600',
  },
  applyFiltersButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
  },
  applyFiltersTextDisabled: {
    color: COLORS.surface,
  },
});

export default HistoryScreen;
