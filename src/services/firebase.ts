// Phone verification service using backend API
// Firebase has been removed from the frontend

import { apiService as ApiService } from './ApiService';

export interface PhoneVerificationResponse {
  success: boolean;
  message: string;
  sessionInfo?: string;
  userId?: string;
  requiresVerification?: boolean;
}

export interface OTPVerificationResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: string;
    name: string;
    phone: string;
    role: string;
    photoUrl?: string;
    rating?: number;
  };
}

// Helper function to format phone number for backend
export const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');

  // Add country code if not present (assuming India +91)
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned}`;
  } else if (cleaned.length === 13 && cleaned.startsWith('+91')) {
    return cleaned;
  }

  // Return as-is if already formatted
  return phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
};

// Send OTP via backend API
export const sendOTP = async (phoneNumber: string): Promise<PhoneVerificationResponse> => {
  try {
    const formattedPhone = formatPhoneNumber(phoneNumber);

    console.log('📱 Sending OTP to:', formattedPhone);

    const response = await ApiService.post('/auth/send-otp', {
      phone: formattedPhone
    });

    console.log('✅ OTP sent successfully:', response.data);
    return response.data;

  } catch (error: any) {
    console.error('❌ Failed to send OTP:', error);

    if (error.response?.data) {
      throw new Error(error.response.data.message || 'Failed to send OTP');
    } else {
      throw new Error(error.message || 'Failed to send OTP');
    }
  }
};

// Verify OTP via backend API
export const verifyOTP = async (phoneNumber: string, otp: string): Promise<OTPVerificationResponse> => {
  try {
    const formattedPhone = formatPhoneNumber(phoneNumber);

    console.log('🔐 Verifying OTP for:', formattedPhone);

    const response = await ApiService.post('/auth/verify-otp', {
      phone: formattedPhone,
      otp: otp
    });

    console.log('✅ OTP verified successfully:', response.data);
    return response.data;

  } catch (error: any) {
    console.error('❌ Failed to verify OTP:', error);

    if (error.response?.data) {
      throw new Error(error.response.data.message || 'Failed to verify OTP');
    } else {
      throw new Error(error.message || 'Failed to verify OTP');
    }
  }
};

// Login with phone number (for existing users)
export const loginWithPhone = async (phoneNumber: string): Promise<OTPVerificationResponse> => {
  try {
    const formattedPhone = formatPhoneNumber(phoneNumber);

    console.log('🔐 Logging in with phone:', formattedPhone);

    const response = await ApiService.post('/auth/login', {
      phone: formattedPhone
    });

    console.log('✅ Login successful:', response.data);
    return response.data;

  } catch (error: any) {
    console.error('❌ Login failed:', error);

    if (error.response?.data) {
      throw new Error(error.response.data.message || 'Login failed');
    } else {
      throw new Error(error.message || 'Login failed');
    }
  }
};

// Register new user
export const registerUser = async (userData: {
  name: string;
  phone: string;
  role: string;
  licenseDetails?: any;
  defaultLocation?: any;
}): Promise<PhoneVerificationResponse> => {
  try {
    const formattedPhone = formatPhoneNumber(userData.phone);

    console.log('📝 Registering user:', { ...userData, phone: formattedPhone });

    const response = await ApiService.post('/auth/register', {
      ...userData,
      phone: formattedPhone
    });

    console.log('✅ Registration successful:', response.data);
    return response.data;

  } catch (error: any) {
    console.error('❌ Registration failed:', error);

    if (error.response?.data) {
      throw new Error(error.response.data.message || 'Registration failed');
    } else {
      throw new Error(error.message || 'Registration failed');
    }
  }
};
