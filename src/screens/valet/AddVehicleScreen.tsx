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
} from 'react-native';
import { TextInput, Surface } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import AccessibleButton from '../../components/AccessibleButton';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants';
import { apiService } from '../../services/ApiService';

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
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    const { phoneNumber, customerName, licensePlate } = formData;

    if (!licensePlate.trim()) {
      Alert.alert('Error', 'License plate is required');
      return false;
    }

    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Phone number is required');
      return false;
    }

    if (!customerName.trim()) {
      Alert.alert('Error', 'Customer name is required');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const result = await apiService.createParkRequest({
        phoneNumber: formData.phoneNumber,
        customerName: formData.customerName,
        licensePlate: formData.licensePlate,
        make: '', // Optional fields
        model: '',
        color: '',
      });

      if (result) {
        Alert.alert(
          'Success',
          'Vehicle park request created successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Error creating park request:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to create park request. Please try again.'
      );
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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Surface style={styles.formCard} elevation={2}>
          <View style={styles.formHeader}>
            <Icon name="local-parking" size={32} color={COLORS.primary} />
            <Text style={styles.formTitle}>Park New Vehicle</Text>
            <Text style={styles.formSubtitle}>Enter vehicle and customer details</Text>
          </View>

          <View style={styles.form}>
            {/* Priority Fields - License Plate First */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vehicle Details</Text>

              <TextInput
                label="License Plate *"
                value={formData.licensePlate}
                onChangeText={(value) => handleInputChange('licensePlate', value)}
                mode="outlined"
                autoCapitalize="characters"
                style={styles.input}
                placeholder="ABC 123"
                accessibilityLabel="License plate input"
                accessibilityHint="Enter vehicle license plate number (required)"
              />
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
    paddingBottom: SPACING.xl,
  },
  formCard: {
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#FFFFFF',
    padding: SPACING.lg,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
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
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  input: {
    marginBottom: SPACING.md,
    backgroundColor: '#FFFFFF',
  },
  submitButton: {
    marginTop: SPACING.lg,
  },
});

export default AddVehicleScreen;
