// Constants for Valet Parking App

export const COLORS = {
  // Modern Primary Palette
  primary: '#2563EB',
  primaryLight: '#3B82F6',
  primaryDark: '#1D4ED8',
  secondary: '#8B5CF6',
  accent: '#F59E0B',
  accentLight: '#FCD34D',

  // Status Colors
  success: '#10B981',
  successLight: '#34D399',
  warning: '#F59E0B',
  error: '#EF4444',
  errorLight: '#F87171',

  // Modern Neutral Colors
  background: '#FFFFFF',
  backgroundSecondary: '#F8FAFC',
  surface: '#F1F5F9',
  surfaceSecondary: '#E2E8F0',
  card: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',

  // Dark Mode Colors
  backgroundDark: '#0F172A',
  surfaceDark: '#1E293B',
  textPrimaryDark: '#F8FAFC',
  textSecondaryDark: '#94A3B8',
  borderDark: '#334155',

  // Gradient Colors
  gradientStart: '#667EEA',
  gradientEnd: '#764BA2',
  gradientSuccessStart: '#10B981',
  gradientSuccessEnd: '#059669',
};

export const TYPOGRAPHY = {
  fontFamily: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    bold: 'Inter-Bold',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
};

export const USER_ROLES = {
  ADMIN: 'admin',
  DRIVER: 'driver',
  VALET_SUPERVISOR: 'valet_supervisor',
  PARKING_LOCATION_SUPERVISOR: 'parking_location_supervisor',
} as const;

export const REQUEST_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  VERIFIED: 'verified',
  HANDED_OVER: 'handed_over',
  SELF_PARKED: 'self_parked',
  SELF_PICKUP: 'self_pickup',
  CANCELLED: 'cancelled',
} as const;

export const REQUEST_TYPE = {
  PARK: 'park',
  PICKUP: 'pickup',
} as const;

export const REQUEST_PRIORITY = {
  STANDARD: 'standard',
  VIP: 'vip',
  EMERGENCY: 'emergency',
} as const;

export const NOTIFICATION_TYPES = {
  NEW_REQUEST: 'new_request',
  REQUEST_ACCEPTED: 'request_accepted',
  REQUEST_COMPLETED: 'request_completed',
  SYSTEM: 'system',
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: '@auth_token',
  USER_DATA: '@user_data',
  OFFLINE_REQUESTS: '@offline_requests',
  APP_SETTINGS: '@app_settings',
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    SEND_OTP: '/auth/send-otp',
    VERIFY_OTP: '/auth/verify-otp',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  ADMIN: {
    PENDING_REGISTRATIONS: '/admin/pending-registrations',
    APPROVE_USER: '/admin/approve-user',
    REJECT_USER: '/admin/reject-user',
    EDIT_USER: '/admin/edit-user',
    GET_ALL_USERS: '/admin/get-all-users',
    ADD_PARKING_LOCATION: '/admin/add-parking-location',
    EDIT_PARKING_LOCATION: '/admin/edit-parking-location',
    DELETE_PARKING_LOCATION: '/admin/delete-parking-location',
    GET_PARKING_LOCATIONS: '/admin/parking-locations',
    STATISTICS: '/admin/statistics',
    HISTORY: '/admin/history',
    EXPORT_HISTORY: '/admin/export-history',
    SYSTEM_HEALTH: '/admin/system-health',
  },
  DRIVER: {
    INCOMING_REQUESTS: '/driver/incoming-requests',
    ACCEPT_REQUEST: '/driver/accept-request',
    MARK_PARKED: '/driver/mark-parked',
    MARK_HANDED_OVER: '/driver/mark-handed-over',
    HISTORY: '/driver/history',
    TODAY_PARKED_VEHICLES: '/driver/today-parked-vehicles',
    STATS: '/driver/stats',
    PARKING_LOCATIONS: '/driver/parking-locations',
  },
  SUPERVISOR: {
    CREATE_PARK_REQUEST: '/supervisor/create-park-request',
    CREATE_PICKUP_REQUEST: '/supervisor/create-pickup-request',
    VERIFY_PARK_REQUEST: '/supervisor/verify-park-request',
    MARK_SELF_PICKUP: '/supervisor/mark-self-pickup',
    PARKED_VEHICLES: '/supervisor/parked-vehicles',
    TODAY_PARKED_VEHICLES: '/supervisor/today-parked-vehicles',
    HISTORY: '/supervisor/history',
    DASHBOARD_STATS: '/supervisor/dashboard-stats',
  },
  COMMON: {
    PARKING_LOCATIONS: '/common/parking-locations',
    SEARCH_VEHICLES: '/common/vehicles/search',
  },
  HEALTH: '/health',
} as const;

export const VALIDATION_RULES = {
  PHONE_REGEX: /^\+?[1-9]\d{1,14}$/,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  LICENSE_PLATE_REGEX: /^[A-Z0-9-]+$/,
  PASSWORD_MIN_LENGTH: 8,
} as const;

export const ACCESSIBILITY = {
  MIN_TOUCH_TARGET: 44,
  MAX_TEXT_LENGTH: 80,
  CONTRAST_RATIO: 4.5,
} as const;

export const PERFORMANCE = {
  LOAD_TIMEOUT: 2000,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  MAX_RETRY_ATTEMPTS: 3,
  BATCH_SIZE: 20,
} as const;
