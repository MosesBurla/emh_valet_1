import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { TextInput, Surface } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import AccessibleButton from '../../components/AccessibleButton';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import VehicleAutocomplete from '../../components/VehicleAutocomplete';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants';
import { apiService, Vehicle } from '../../services/ApiService';
import ApiResponse from '../../services/ApiResponse';
import { getCurrentLocation } from '../../services/LocationService';

type RootStackParamList = {
  AddVehicle: undefined;
  ValetDashboard: undefined;
};

type AddVehicleNavigationProp = StackNavigationProp<RootStackParamList>;

const AddVehicleScreen: React.FC = () => {
  const navigation = useNavigation<AddVehicleNavigationProp>();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    phoneNumber: '',
    customerName: '',
    licensePlate: '',
    make: '',
    model: '',
  });
  const [resetAutocomplete, setResetAutocomplete] = useState(false);
  const [errors, setErrors] = useState({
    licensePlate: false,
    make: false,
    model: false,
    phoneNumber: false,
    customerName: false,
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field
    setErrors(prev => ({
      ...prev,
      [field]: false,
    }));

    // Reset selection state when user manually types in license plate field
    if (field === 'licensePlate') {
      setResetAutocomplete(prev => !prev); // Toggle to trigger reset
    }
  };

  const handleVehicleSelect = (vehicle: Vehicle) => {
    // Auto-populate customer information when a vehicle is selected
    setFormData(prev => ({
      ...prev,
      phoneNumber: vehicle.ownerPhone || '',
      customerName: vehicle.ownerName || '',
    }));
  };

  const validateForm = () => {
    const { phoneNumber, customerName, licensePlate, make, model } = formData;

    const newErrors = {
      licensePlate: !licensePlate.trim(),
      make: !make.trim(),
      model: !model.trim(),
      phoneNumber: !phoneNumber.trim(),
      customerName: !customerName.trim(),
    };

    setErrors(newErrors);

    return Object.values(newErrors).every(error => !error);
  };


  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Get current location using the dedicated location service
     const loc = await getCurrentLocation();
      if (!loc) {
        // Location service handles its own error alerts
        setLoading(false);
        return;
      }

      const result = await apiService.createParkRequest({
        phoneNumber: formData.phoneNumber,
        customerName: formData.customerName,
        licensePlate: formData.licensePlate,
        make: formData.make,
        model: formData.model,
        locationFrom: {
          latitude: loc.latitude,
          longitude: loc.longitude
        },
      });

      // Check standardized API response
      if (result.success) {
        Alert.alert(
          'Success',
          result.message || 'Vehicle park request created successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        // Handle failure case with standardized error response
        const errorResponse = ApiResponse.error(
          result.error || 'RequestError',
          result.message || 'Failed to create park request. Please try again.'
        );
        Alert.alert('Error', errorResponse.message);
      }
    } catch (error: any) {
      console.error('Error creating park request:', error);

      // Handle errors with standardized format using ApiResponse helper
      const errorMessage = error?.error || 'Failed to create park request. Please try again.';
      const statusCode = error?.status;

      // Handle duplicate park request error
      if (errorMessage.includes('Park request already exists for this vehicle') ||
          errorMessage.includes('duplicate') || errorMessage.includes('already exists')) {
        const duplicateResponse = ApiResponse.conflict(
          'A park request already exists for this vehicle. Please check the vehicle status or contact support.'
        );
        Alert.alert(
          'Duplicate Request',
          duplicateResponse.message,
          [
            {
              text: 'OK',
              style: 'default',
            },
          ]
        );
      }
      // Handle validation errors (400 status code)
      else if (statusCode === 400) {
        const validationResponse = ApiResponse.badRequest(
          errorMessage || 'Please check your input data and try again.'
        );
        Alert.alert(
          'Validation Error',
          validationResponse.message,
          [
            {
              text: 'OK',
              style: 'default',
            },
          ]
        );
      }
      // Handle unauthorized errors (401 status code)
      else if (statusCode === 401) {
        const authResponse = ApiResponse.unauthorized(
          'Please log in again to continue.'
        );
        Alert.alert(
          'Authentication Required',
          authResponse.message,
          [
            {
              text: 'OK',
              style: 'default',
            },
          ]
        );
      }
      // Handle forbidden errors (403 status code)
      else if (statusCode === 403) {
        const forbiddenResponse = ApiResponse.forbidden(
          'You do not have permission to perform this action.'
        );
        Alert.alert(
          'Access Denied',
          forbiddenResponse.message,
          [
            {
              text: 'OK',
              style: 'default',
            },
          ]
        );
      }
      // Handle not found errors (404 status code)
      else if (statusCode === 404) {
        const notFoundResponse = ApiResponse.notFound(
          'The requested service could not be found. Please contact support.'
        );
        Alert.alert(
          'Service Not Found',
          notFoundResponse.message,
          [
            {
              text: 'OK',
              style: 'default',
            },
          ]
        );
      }
      // Handle server errors (500 status code)
      else if (statusCode >= 500) {
        const serverResponse = ApiResponse.error(
          'ServerError',
          'Server is temporarily unavailable. Please try again later.'
        );
        Alert.alert(
          'Server Error',
          serverResponse.message,
          [
            {
              text: 'OK',
              style: 'default',
            },
          ]
        );
      }
      // Handle other types of errors with generic error response
      else {
        const genericResponse = ApiResponse.error(
          'RequestError',
          errorMessage
        );
        Alert.alert(
          'Error',
          genericResponse.message
        );
      }
    } finally {
      setLoading(false);
    }
  };

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
            <Text style={styles.headerTitle}>Add Vehicle</Text>
            <Text style={styles.headerSubtitle}>Create a new park request</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoiding}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Surface style={styles.formCard} elevation={4}>
          <View style={styles.formHeader}>
            <Icon name="local-parking" size={32} color={COLORS.primary} />
            <Text style={styles.formTitle}>Park New Vehicle</Text>
            <Text style={styles.formSubtitle}>Enter vehicle and customer details</Text>
          </View>

          <View style={styles.form}>
            {/* Priority Fields - License Plate First */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vehicle Details</Text>

              <VehicleAutocomplete
                value={formData.licensePlate}
                onChangeText={(value) => handleInputChange('licensePlate', value)}
                onVehicleSelect={handleVehicleSelect}
                placeholder="Enter license plate (min 4 characters for search)"
                style={styles.input}
                maxLength={6}
                stopSearchAfterSelect={true}
                resetSelection={resetAutocomplete}
              />

              {/* Make and Model in a row */}
              <View style={styles.row}>
                <TextInput
                  label="Make *"
                  value={formData.make}
                  onChangeText={(value) => handleInputChange('make', value)}
                  mode="outlined"
                  style={[styles.input, styles.halfInput]}
                  placeholder="e.g., Honda"
                  error={errors.make}
                  accessibilityLabel="Vehicle make input"
                  accessibilityHint="Enter vehicle make (required)"
                />

                <TextInput
                  label="Model *"
                  value={formData.model}
                  onChangeText={(value) => handleInputChange('model', value)}
                  mode="outlined"
                  style={[styles.input, styles.halfInput]}
                  placeholder="e.g., 2024"
                  error={errors.model}
                  accessibilityLabel="Vehicle model input"
                  accessibilityHint="Enter vehicle model (required)"
                />
              </View>
            </View>

            {/* Customer Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Customer Information</Text>

              <TextInput
                label="Phone Number *"
                value={formData.phoneNumber}
                onChangeText={(value) => handleInputChange('phoneNumber', value)}
                mode="outlined"
                keyboardType="phone-pad"
                style={styles.input}
                placeholder="+1234567890"
                error={errors.phoneNumber}
                accessibilityLabel="Phone number input"
                accessibilityHint="Enter customer's phone number (required)"
              />

              <TextInput
                label="Customer Name *"
                value={formData.customerName}
                onChangeText={(value) => handleInputChange('customerName', value)}
                mode="outlined"
                style={styles.input}
                placeholder="Enter customer name"
                error={errors.customerName}
                accessibilityLabel="Customer name input"
                accessibilityHint="Enter customer's full name (required)"
              />
            </View>

            {/* Submit Button */}
            <AccessibleButton
              title={loading ? "Creating..." : "Create Park Request"}
              onPress={handleSubmit}
              variant="primary"
              size="large"
              disabled={loading}
              accessibilityLabel="Create park request button"
              accessibilityHint="Submit the form to create a new park request"
              style={styles.submitButton}
            />
          </View>
        </Surface>
      </ScrollView>
      </KeyboardAvoidingView>
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
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.md,
  },
  formCard: {
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#FFFFFF',
    padding: SPACING.md,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  formSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  section: {
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  input: {
    marginBottom: SPACING.md,
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    flex: 0.48, // slightly less than 0.5 for margin
    marginBottom: SPACING.md,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoiding: {
    flex: 1,
  },
  submitButton: {
    marginTop: SPACING.sm,
  },
});

export default AddVehicleScreen;
