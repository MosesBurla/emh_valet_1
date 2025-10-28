import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { TextInput, Surface } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { apiService, Vehicle } from '../services/ApiService';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants';

interface VehicleAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onVehicleSelect: (vehicle: Vehicle) => void;
  placeholder?: string;
  style?: any;
  disabled?: boolean;
  maxLength?: number;
  stopSearchAfterSelect?: boolean;
  resetSelection?: boolean;
}

const VehicleAutocomplete: React.FC<VehicleAutocompleteProps> = ({
  value,
  onChangeText,
  onVehicleSelect,
  placeholder = "Enter license plate",
  style,
  disabled = false,
  maxLength = 6,
  stopSearchAfterSelect = true,
  resetSelection = false,
}) => {
  const [suggestions, setSuggestions] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isSelected, setIsSelected] = useState(false);

  useEffect(() => {
    // Reset selection state when resetSelection prop changes
    if (resetSelection) {
      setIsSelected(false);
    }
  }, [resetSelection]);

  useEffect(() => {
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Don't search if already selected and stopSearchAfterSelect is true
    if (stopSearchAfterSelect && isSelected && value.length > maxLength) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Only search if we have at least 4 characters and not exceeding maxLength
    if (value.length >= 4 && value.length <= maxLength) {
      const timeout = setTimeout(() => {
        searchVehicles(value);
      }, 300); // Debounce search

      setSearchTimeout(timeout);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [value, isSelected, stopSearchAfterSelect, maxLength]);

  const handleSelectVehicle = (vehicle: Vehicle) => {
    onChangeText(vehicle.number);
    onVehicleSelect(vehicle);
    setShowSuggestions(false);
    setIsSelected(true); // Mark as selected to prevent further searches
  };

  const searchVehicles = async (query: string) => {
    try {
      setLoading(true);
      const result = await apiService.searchVehicles(query);

      // Handle standardized API response format
      if (result.success && result.data && Array.isArray(result.data)) {
        setSuggestions(result.data);
        setShowSuggestions(result.data.length > 0);
      } else {
        console.error('Vehicle search failed:', result.message);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error searching vehicles:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setLoading(false);
    }
  };

  const renderSuggestion = ({ item }: { item: Vehicle }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSelectVehicle(item)}
      accessibilityLabel={`Select vehicle ${item.number}`}
      accessibilityHint={`Select ${item.make} ${item.model} with license plate ${item.number}`}
    >
      <View style={styles.suggestionContent}>
        <View style={styles.vehicleInfo}>
          <Text style={styles.licensePlate}>{item.number}</Text>
          <Text style={styles.vehicleDetails}>
            {item.make} {item.model} • {item.color}
          </Text>
          <Text style={styles.ownerInfo}>
            Owner: {item.ownerName || 'Unknown'} • {item.ownerPhone || 'No phone'}
          </Text>
        </View>
        <Icon name="chevron-right" size={20} color={COLORS.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputContainer}>
        <TextInput
          label="License Plate *"
          value={value}
          onChangeText={onChangeText}
          mode="outlined"
          autoCapitalize="characters"
          style={styles.input}
          placeholder={placeholder}
          accessibilityLabel="License plate input"
          accessibilityHint="Enter vehicle license plate number (required)"
          disabled={disabled}
          right={
            loading ? (
              <TextInput.Icon
                icon={() => <ActivityIndicator size="small" color={COLORS.primary} />}
              />
            ) : value.length >= 4 ? (
              <TextInput.Icon
                icon={() => <Icon name="search" size={20} color={COLORS.primary} />}
              />
            ) : null
          }
        />
      </View>

      {showSuggestions && (
        <Surface style={styles.suggestionsContainer} elevation={4}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.id || item._id || item.number}
            renderItem={renderSuggestion}
            style={styles.suggestionsList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        </Surface>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#FFFFFF',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    maxHeight: 200,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#FFFFFF',
    zIndex: 1000,
  },
  suggestionsList: {
    borderRadius: BORDER_RADIUS.md,
  },
  suggestionItem: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vehicleInfo: {
    flex: 1,
  },
  licensePlate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  vehicleDetails: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  ownerInfo: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});

export default VehicleAutocomplete;
