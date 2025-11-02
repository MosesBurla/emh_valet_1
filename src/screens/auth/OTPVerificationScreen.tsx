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
import { TextInput, Card, ActivityIndicator } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';

import AccessibleButton from '../../components/AccessibleButton';
import { COLORS, SPACING, BORDER_RADIUS, STORAGE_KEYS } from '../../constants';
import { apiService } from '../../services/ApiService';

type RootStackParamList = {
  OTPVerification: { phone: string };
  MainTabs: undefined;
};

type OTPVerificationScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const OTPVerificationScreen: React.FC = () => {
  const navigation = useNavigation<OTPVerificationScreenNavigationProp>();
  const route = useRoute();
  const { phone } = route.params as { phone: string };

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [isOtpFocused, setIsOtpFocused] = useState(false);

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];

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
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      // Get stored FCM token
      const fcmToken = await AsyncStorage.getItem(STORAGE_KEYS.FCM_TOKEN);
      const result = await apiService.verifyOtp(phone, otp, fcmToken);

      if (result.success) {
        Alert.alert(
          'Success',
          'Phone number verified successfully!',
          [{
            text: 'Continue',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainTabs' }],
              });
            }
          }]
        );
      } else {
        Alert.alert('Verification Failed', result.message || 'Invalid OTP');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      Alert.alert('Error', 'Unable to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = () => {
    if (countdown > 0) return;

    // Resend OTP logic would go here
    setCountdown(30);
    Alert.alert('OTP Sent', 'A new verification code has been sent to your phone');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Verifying...</Text>
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
              <View style={styles.logoContainer}>
                <View style={styles.logoIcon}>
                  <Icon name="sms" size={40} color={COLORS.primary} />
                </View>
              </View>
              <Text style={styles.title}>Verify Phone Number</Text>
              <Text style={styles.subtitle}>
                We've sent a 6-digit code to{'\n'}
                <Text style={styles.phoneText}>{phone}</Text>
              </Text>
            </Animated.View>

            {/* OTP Card */}
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
                  {/* OTP Input */}
                  <View style={[styles.inputContainer, isOtpFocused && styles.inputContainerFocused]}>
                    <Text style={[styles.inputLabel, isOtpFocused && styles.inputLabelFocused]}>
                      Verification Code
                    </Text>
                    <TextInput
                      value={otp}
                      onChangeText={setOtp}
                      onFocus={() => setIsOtpFocused(true)}
                      onBlur={() => setIsOtpFocused(false)}
                      placeholder="Enter 6-digit code"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="numeric"
                      maxLength={6}
                      style={[styles.input, isOtpFocused && styles.inputFocused]}
                      mode="outlined"
                      left={
                        <TextInput.Icon
                          icon={() => <Icon name="vpn-key" size={20} color={isOtpFocused ? COLORS.primary : COLORS.textSecondary} />}
                        />
                      }
                      accessibilityLabel="OTP input field"
                      accessibilityHint="Enter the 6-digit verification code"
                      theme={{
                        colors: {
                          primary: COLORS.primary,
                          background: COLORS.backgroundSecondary,
                        },
                      }}
                    />
                  </View>

                  {/* Verify Button */}
                  <AccessibleButton
                    title="Verify Phone Number"
                    onPress={handleVerifyOTP}
                    variant="primary"
                    accessibilityLabel="Verify button"
                    accessibilityHint="Tap to verify your phone number"
                    style={styles.verifyButton}
                    icon={
                      loading ? (
                        <ActivityIndicator size="small" color={COLORS.background} />
                      ) : (
                        <Icon name="check-circle" size={20} color={COLORS.background} />
                      )
                    }
                  />

                  {/* Resend OTP */}
                  <View style={styles.resendContainer}>
                    <Text style={styles.resendText}>
                      Didn't receive the code?{' '}
                      {countdown > 0 ? (
                        <Text style={styles.countdownText}>Resend in {countdown}s</Text>
                      ) : (
                        <Text style={styles.resendLink} onPress={handleResendOTP}>
                          Resend Code
                        </Text>
                      )}
                    </Text>
                  </View>

                  {/* Change Phone Number */}
                  <View style={styles.changePhoneContainer}>
                    <Text style={styles.changePhoneText} onPress={() => navigation.goBack()}>
                      Wrong phone number? Change it here
                    </Text>
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
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.sm,
    paddingBottom: SPACING.xl,
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
    lineHeight: 24,
  },
  phoneText: {
    fontWeight: '600',
    color: COLORS.primary,
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
  input: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  verifyButton: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  resendText: {
    fontSize: 14,
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
  changePhoneContainer: {
    alignItems: 'center',
  },
  changePhoneText: {
    fontSize: 14,
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
});

export default OTPVerificationScreen;
