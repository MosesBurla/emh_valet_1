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
  TouchableOpacity,
} from 'react-native';
import { TextInput, Card, Checkbox, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';

import AccessibleButton from '../../components/AccessibleButton';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { COLORS, SPACING, BORDER_RADIUS, STORAGE_KEYS, VALIDATION_RULES } from '../../constants';
import { apiService } from '../../services/ApiService';


type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  MainTabs: undefined;
};

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const [formData, setFormData] = useState({
    phone: '',
    otp: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);
  const [isOtpFocused, setIsOtpFocused] = useState(false);
  const [showChangePhone, setShowChangePhone] = useState(false);
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
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
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, []);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: number;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000) as any;
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!VALIDATION_RULES.PHONE_REGEX.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (otpSent && !formData.otp) {
      newErrors.otp = 'OTP is required';
    } else if (otpSent && formData.otp.length < 6) {
      newErrors.otp = 'OTP must be 6 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Verify OTP with backend API
      const result = await apiService.verifyOtp(formData.phone, formData.otp);

      // Check standardized API response
      if (result.success && result.data) {
        console.log('Login successful, storing auth data:', result.data.user);

        // Store auth token and user data
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, result.data.token);
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(result.data.user));

        console.log('Auth data stored, emitting event and navigating');

        // Force app to re-check authentication state by dispatching a custom event
        // This ensures the App component updates immediately
        try {
          const { DeviceEventEmitter } = require('react-native');
          console.log('Emitting auth state change event for successful login');
          DeviceEventEmitter.emit('authStateChanged', {
            authenticated: true,
            timestamp: new Date().toISOString(),
            user: result.data.user
          });
        } catch (error) {
          console.error('Could not emit auth state change event:', error);
        }

        // Reset navigation stack to main app
        console.log('Resetting navigation to MainTabs');
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      } else {
        console.log('Login failed:', result);
        Alert.alert('Login Failed', result.message || 'Please check your credentials');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Error', error.message || 'Unable to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!formData.phone) {
      Alert.alert('Error', 'Please enter your phone number first');
      return;
    }
    if (!VALIDATION_RULES.PHONE_REGEX.test(formData.phone)) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      // Send OTP via backend API
      const result = await apiService.sendOtp(formData.phone);

      if (result.success && result.data) {
        // Reset states when sending OTP
        setShowChangePhone(false);
        setOtpSent(true);
        setIsOtpMode(true);
        setCountdown(300); // 5 minutes for backend OTP
        setFormData(prev => ({ ...prev, otp: '' }));
        setErrors({});

        Alert.alert('OTP Sent', result.message || 'A 6-digit verification code has been sent to your phone number');
      } else {
        Alert.alert('Error', result.message || 'Failed to send verification code. Please try again.');
      }
    } catch (error: any) {
      console.error('Send OTP error:', error);
      Alert.alert('Error', error.message || 'Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = () => {
    if (countdown > 0) return;
    handleSendOTP();
  };

  const handleChangePhone = () => {
    setOtpSent(false);
    setCountdown(0);
    setFormData(prev => ({ ...prev, otp: '' }));
    setErrors({});
    setShowChangePhone(false);
    setVerificationId(null);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Signing you in...</Text>
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
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            style={styles.scrollView}
          >
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
                  <Icon name="local-parking" size={40} color={COLORS.primary} />
                </View>
              </Animated.View>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to your Valet Parking account</Text>
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
                  {/* Phone Input with Change Option */}
                  <View style={[styles.inputContainer, isPhoneFocused && styles.inputContainerFocused]}>
                    <View style={styles.inputHeader}>
                      <Text style={[styles.inputLabel, isPhoneFocused && styles.inputLabelFocused]}>Phone Number</Text>
                      {isOtpMode && !showChangePhone && (
                        <TouchableOpacity onPress={() => setShowChangePhone(true)} style={styles.changePhoneButton}>
                          <Text style={styles.changePhoneText}>Change</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <TextInput
                      value={formData.phone}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                      onFocus={() => setIsPhoneFocused(true)}
                      onBlur={() => setIsPhoneFocused(false)}
                      error={!!errors.phone}
                      placeholder="Enter your phone number"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="phone-pad"
                      autoComplete="tel"
                      editable={!isOtpMode || showChangePhone}
                      style={[
                        styles.input,
                        isPhoneFocused && styles.inputFocused,
                        errors.phone && styles.inputError,
                        (isOtpMode && !showChangePhone) && styles.inputDisabled,
                      ]}
                      mode="outlined"
                      left={<TextInput.Icon icon={() => <Icon name="phone" size={20} color={isPhoneFocused ? COLORS.primary : COLORS.textSecondary} />} />}
                      accessibilityLabel="Phone number input"
                      accessibilityHint="Enter your mobile number"
                      theme={{
                        colors: {
                          primary: COLORS.primary,
                          background: errors.phone ? COLORS.errorLight : COLORS.backgroundSecondary,
                        }
                      }}
                    />
                    {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                  </View>

                  {/* OTP Input - Only show in OTP mode */}
                  {isOtpMode && !showChangePhone && (
                    <Animated.View
                      style={[
                        styles.inputContainer,
                        isOtpFocused && styles.inputContainerFocused,
                        {
                          opacity: fadeAnim,
                          transform: [{ translateY: slideAnim }],
                        },
                      ]}
                    >
                      <Text style={[styles.inputLabel, isOtpFocused && styles.inputLabelFocused]}>Verification Code</Text>
                      <TextInput
                        value={formData.otp}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, otp: text }))}
                        onFocus={() => setIsOtpFocused(true)}
                        onBlur={() => setIsOtpFocused(false)}
                        error={!!errors.otp}
                        placeholder="Enter 6-digit code"
                        placeholderTextColor={COLORS.textMuted}
                        keyboardType="numeric"
                        maxLength={6}
                        style={[
                          styles.input,
                          isOtpFocused && styles.inputFocused,
                          errors.otp && styles.inputError,
                        ]}
                        mode="outlined"
                        left={<TextInput.Icon icon={() => <Icon name="sms" size={20} color={isOtpFocused ? COLORS.primary : COLORS.textSecondary} />} />}
                        accessibilityLabel="OTP input field"
                        accessibilityHint="Enter the 6-digit code sent to your phone"
                        theme={{
                          colors: {
                            primary: COLORS.primary,
                            background: errors.otp ? COLORS.errorLight : COLORS.backgroundSecondary,
                          }
                        }}
                      />
                      {errors.otp && <Text style={styles.errorText}>{errors.otp}</Text>}

                      {/* Resend OTP */}
                      <View style={styles.resendContainer}>
                        <Text style={styles.resendText}>
                          Didn't receive the code?{' '}
                          {countdown > 0 ? (
                            <Text style={styles.countdownText}>Resend in {countdown}s</Text>
                          ) : (
                            <Text style={styles.resendLink} onPress={handleResendOTP}>
                              Resend
                            </Text>
                          )}
                        </Text>
                      </View>
                    </Animated.View>
                  )}

                  {/* Action Button - Send OTP or Login */}
                  <AccessibleButton
                    title={isOtpMode && !showChangePhone ? "Sign In" : "Send Verification Code"}
                    onPress={isOtpMode && !showChangePhone ? handleLogin : handleSendOTP}
                    variant="primary"
                    accessibilityLabel={isOtpMode && !showChangePhone ? "Sign in button" : "Send OTP button"}
                    accessibilityHint={isOtpMode && !showChangePhone ? "Tap to sign in to your account" : "Tap to receive OTP on your phone"}
                    style={styles.actionButton}
                    icon={
                      loading ? (
                        <ActivityIndicator size="small" color={COLORS.background} />
                      ) : isOtpMode && !showChangePhone ? (
                        <Icon name="login" size={20} color={COLORS.background} />
                      ) : (
                        <Icon name="sms" size={20} color={COLORS.background} />
                      )
                    }
                  />

                  {/* Create Account Button - Inside Card */}
                  <View style={styles.registerContainer}>
                    <Text style={styles.registerPromptText}>Don't have an account? </Text>
                    <AccessibleButton
                      title="Create Account"
                      onPress={() => navigation.navigate('Register')}
                      variant="outline"
                      size="small"
                      accessibilityLabel="Sign up button"
                      accessibilityHint="Tap to create a new account"
                      textStyle={styles.registerButtonText}
                    />
                  </View>

                </Card.Content>

              </Card>

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
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.sm,
    paddingBottom: SPACING.xl,
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  logoIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    opacity: 0.9,
  },
  cardContainer: {
    marginBottom: SPACING.lg,
  },
  card: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  cardContent: {
    padding: SPACING.lg,
  },
  inputContainer: {
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.xs,
  },
  inputContainerFocused: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: BORDER_RADIUS.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  inputLabelFocused: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  changePhoneButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  changePhoneText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  inputError: {
    borderColor: COLORS.error,
    borderWidth: 2,
  },
  inputDisabled: {
    backgroundColor: COLORS.backgroundSecondary,
    color: COLORS.textSecondary,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: SPACING.xs,
    fontWeight: '500',
  },
  actionButton: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    padding: SPACING.sm,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  registerContainer: {
    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  registerText: {
    color: COLORS.background,
    fontSize: 14,
  },
  registerPromptText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  registerButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  resendContainer: {
    marginTop: SPACING.sm,
    alignItems: 'center',
  },
  resendText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  countdownText: {
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  resendLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default LoginScreen;
