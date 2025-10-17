import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  SafeAreaView,
  Animated,
} from 'react-native';
import { TextInput, Card, RadioButton, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';

import AccessibleButton from '../../components/AccessibleButton';
import { COLORS, SPACING, BORDER_RADIUS, STORAGE_KEYS, USER_ROLES } from '../../constants';
import { apiService } from '../../services/ApiService';

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  OTPVerification: { phone: string };
  MainTabs: undefined;
};

type RegisterScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    role: USER_ROLES.DRIVER,
    licenseNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);
  const [isLicenseFocused, setIsLicenseFocused] = useState(false);

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];
  const logoScale = useState(new Animated.Value(1))[0];

  useEffect(() => {
    // Entrance animation
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

    // Logo pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, {
          toValue: 1.1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, []);

  const handleRegister = async () => {
    setLoading(true);
    try {
      // Prepare registration data
      const [firstName, ...lastNameParts] = formData.fullName.split(' ');
      const lastName = lastNameParts.join(' ');

      const registrationData = {
        name: formData.fullName,
        phone: formData.phone,
        role: formData.role,
        licenseDetails: formData.role === USER_ROLES.DRIVER ? {
          number: formData.licenseNumber,
        } : undefined,
      };

      const result = await apiService.register(registrationData);

      if (result.success) {
        Alert.alert(
          'Success',
          result.message || 'Account created successfully! Please verify your phone number.',
          [{
            text: 'OK',
            onPress: () => {
              // Navigate back to login for OTP verification
              navigation.navigate('Login');
            }
          }]
        );
      } else {
        Alert.alert('Registration Failed', result.message || 'Please try again');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
        <Text style={styles.loadingText}>Creating account...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            {/* Animated Header */}
            <Animated.View
              style={[
                styles.header,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.logoContainer,
                  {
                    transform: [{ scale: logoScale }],
                  },
                ]}
              >
                <View style={styles.logoIcon}>
                  <Icon name="person-add" size={32} color={COLORS.secondary} />
                </View>
              </Animated.View>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join Valet Service</Text>
            </Animated.View>

            {/* Clean Card */}
            <Animated.View
              style={[
                styles.cardContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <Card style={styles.card}>
                <Card.Content style={styles.cardContent}>
                  {/* Full Name */}
                  <View style={[styles.inputContainer, isNameFocused && styles.inputContainerFocused]}>
                    <Text style={[styles.inputLabel, isNameFocused && styles.inputLabelFocused]}>Full Name</Text>
                    <TextInput
                      value={formData.fullName}
                      onChangeText={(text) => setFormData((prev) => ({ ...prev, fullName: text }))}
                      onFocus={() => setIsNameFocused(true)}
                      onBlur={() => setIsNameFocused(false)}
                      placeholder="Enter full name"
                      placeholderTextColor={COLORS.textMuted}
                      style={[styles.input, isNameFocused && styles.inputFocused]}
                      mode="outlined"
                      left={<TextInput.Icon icon={() => <Icon name="person" size={20} color={isNameFocused ? COLORS.secondary : COLORS.textSecondary} />} />}
                      accessibilityLabel="Full name input"
                      accessibilityHint="Enter your complete name"
                      theme={{
                        colors: {
                          primary: COLORS.secondary,
                          background: COLORS.backgroundSecondary,
                        },
                      }}
                    />
                  </View>

                  {/* Phone Number */}
                  <View style={[styles.inputContainer, isPhoneFocused && styles.inputContainerFocused]}>
                    <Text style={[styles.inputLabel, isPhoneFocused && styles.inputLabelFocused]}>Phone Number</Text>
                    <TextInput
                      value={formData.phone}
                      onChangeText={(text) => setFormData((prev) => ({ ...prev, phone: text }))}
                      onFocus={() => setIsPhoneFocused(true)}
                      onBlur={() => setIsPhoneFocused(false)}
                      placeholder="Enter phone number"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="phone-pad"
                      autoComplete="tel"
                      style={[styles.input, isPhoneFocused && styles.inputFocused]}
                      mode="outlined"
                      left={<TextInput.Icon icon={() => <Icon name="phone" size={20} color={isPhoneFocused ? COLORS.secondary : COLORS.textSecondary} />} />}
                      accessibilityLabel="Phone number input"
                      accessibilityHint="Enter your mobile number"
                      theme={{
                        colors: {
                          primary: COLORS.secondary,
                          background: COLORS.backgroundSecondary,
                        },
                      }}
                    />
                  </View>

                  {/* Service Type Selection */}
                  <Animated.View
                    style={[
                      styles.section,
                      {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                      },
                    ]}
                  >
                    <RadioButton.Group
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, role: value as any }))}
                      value={formData.role}
                    >
                      <View style={styles.radioContainer}>
                        <View style={styles.radioOption}>
                          <RadioButton value={USER_ROLES.DRIVER} color={COLORS.secondary} />
                          <View style={styles.radioContent}>
                            <Text style={styles.radioTitle}>Driver</Text>
                          </View>
                        </View>

                        <View style={styles.radioOption}>
                          <RadioButton value={USER_ROLES.VALET_SUPERVISOR} color={COLORS.secondary} />
                          <View style={styles.radioContent}>
                            <Text style={styles.radioTitle}>Valet Supervisor</Text>
                          </View>
                        </View>
                      </View>
                    </RadioButton.Group>
                  </Animated.View>

                  {/* Driver License (if driver selected) */}
                  {formData.role === USER_ROLES.DRIVER && (
                    <Animated.View
                      style={[
                        styles.inputContainer,
                        isLicenseFocused && styles.inputContainerFocused,
                        {
                          opacity: fadeAnim,
                          transform: [{ translateY: slideAnim }],
                        },
                      ]}
                    >
                      <Text style={[styles.inputLabel, isLicenseFocused && styles.inputLabelFocused]}>Driver License Number</Text>
                      <TextInput
                        value={formData.licenseNumber}
                        onChangeText={(text) => setFormData((prev) => ({ ...prev, licenseNumber: text }))}
                        onFocus={() => setIsLicenseFocused(true)}
                        onBlur={() => setIsLicenseFocused(false)}
                        placeholder="Enter license number"
                        placeholderTextColor={COLORS.textMuted}
                        autoCapitalize="characters"
                        style={[styles.input, isLicenseFocused && styles.inputFocused]}
                        mode="outlined"
                        left={<TextInput.Icon icon={() => <Icon name="assignment" size={20} color={isLicenseFocused ? COLORS.secondary : COLORS.textSecondary} />} />}
                        accessibilityLabel="Driver license input"
                        accessibilityHint="Enter your driver's license number"
                        theme={{
                          colors: {
                            primary: COLORS.secondary,
                            background: COLORS.backgroundSecondary,
                          },
                        }}
                      />
                    </Animated.View>
                  )}

                  {/* Register Button */}
                  <AccessibleButton
                    title="Create Account"
                    onPress={handleRegister}
                    variant="primary"
                    accessibilityLabel="Create account button"
                    accessibilityHint="Tap to create your new account"
                    style={styles.registerButton}
                    icon={
                      loading ? (
                        <ActivityIndicator size="small" color={COLORS.background} />
                      ) : (
                        <Icon name="person-add" size={20} color={COLORS.background} />
                      )
                    }
                  />

                  {/* Terms and Conditions */}
                  <Animated.Text
                    style={[
                      styles.termsText,
                      {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                      },
                    ]}
                  >
                    By creating an account, you agree to our{' '}
                    <Text style={styles.termsLink}>Terms</Text> and{' '}
                    <Text style={styles.termsLink}>Privacy Policy</Text>
                  </Animated.Text>
                </Card.Content>
              </Card>
            </Animated.View>

            {/* Footer */}
            <Animated.View
              style={[
                styles.footer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <AccessibleButton
                  title="Sign In"
                  onPress={() => navigation.navigate('Login')}
                  variant="outline"
                  size="small"
                  accessibilityLabel="Sign in button"
                  accessibilityHint="Tap to go to login screen"
                  textStyle={styles.loginButtonText}
                />
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: 0,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  logoIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.secondary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 0,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    opacity: 0.9,
  },
  cardContainer: {
    marginBottom: 0,
  },
  card: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  cardContent: {
    padding: SPACING.md,
  },
  inputContainer: {
    marginBottom: 0,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.xs,
  },
  inputContainerFocused: {
    backgroundColor: COLORS.secondary + '10',
    borderRadius: BORDER_RADIUS.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 0,
  },
  inputLabelFocused: {
    color: COLORS.secondary,
    fontWeight: '700',
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
  },
  inputFocused: {
    borderColor: COLORS.secondary,
    borderWidth: 2,
  },
  section: {
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 0,
  },
  radioContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'stretch',
    width: '100%',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.backgroundSecondary + '80',
    flex: 1,
    marginHorizontal: SPACING.xs,
  },
  radioContent: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  radioTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  radioDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  registerButton: {
    marginTop: SPACING.lg,
    marginBottom: 0,
    borderRadius: BORDER_RADIUS.lg,
    elevation: 4,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  termsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: SPACING.md,
  },
  termsLink: {
    color: COLORS.secondary,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background + 'E0',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  loginText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  loginButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RegisterScreen;
