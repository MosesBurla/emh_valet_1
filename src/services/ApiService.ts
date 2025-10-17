import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';

// API responses return data directly

export interface User {
  _id: string;
  id?: string;
  name: string;
  phone: string;
  email?: string;
  role: 'admin' | 'driver' | 'owner' | 'supervisor' | 'valet_supervisor' | 'parking_location_supervisor';
  photoUrl?: string;
  rating?: number;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  createdAt?: string;
  licenseDetails?: any;
  defaultLocation?: any;
}

export interface Vehicle {
  id: string;
  ownerId: string;
  make: string;
  model: string;
  number: string;
  color: string;
  photoUrl?: string;
  vehicleType: 'car' | 'bike' | 'truck' | 'suv';
  status: 'available' | 'parked' | 'in-progress';
  currentLocation?: {
    lat: number;
    lng: number;
    address: string;
  };
}

export interface ParkingLocation {
  id: string;
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  capacity: number;
  availableSpots: number;
  pricePerHour: number;
  amenities?: string[];
  operatingHours: {
    start: string;
    end: string;
  };
  contactNumber?: string;
  description?: string;
  rating?: number;
  isActive: boolean;
  photos?: string[];
}

export interface Request {
  id: string;
  vehicleId: string;
  ownerId: string;
  driverId?: string;
  type: 'park' | 'pickup';
  status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'handed_over' | 'cancelled';
  locationFrom: {
    lat: number;
    lng: number;
    address: string;
  };
  locationTo?: {
    lat: number;
    lng: number;
    address: string;
  };
  estimatedCost?: number;
  actualCost?: number;
  specialInstructions?: string;
  createdAt: string;
  updatedAt: string;
}

class ApiService {
  private baseURL: string;

  constructor() {
    // Use environment variable or default to localhost
    this.baseURL = 'https://emh-valet-service-1.onrender.com/api';
    // this.baseURL = 'http://localhost:5000/api';
  }

  private async getAuthHeaders(): Promise<{ [key: string]: string }> {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    console.log('Auth token exists:', !!token);
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const requestId = Math.random().toString(36).substr(2, 9);
    const startTime = Date.now();

    try {
      const url = `${this.baseURL}${endpoint}`;
      const headers = await this.getAuthHeaders();

      // Log request
      console.log(`[API-${requestId}] 🚀 REQUEST: ${options.method || 'GET'} ${url}`);
      console.log(`[API-${requestId}] 📋 Headers:`, {
        ...headers,
        // Don't log authorization token for security
        ...(headers.Authorization && { Authorization: '[HIDDEN]' })
      });
      if (options.body) {
        try {
          const bodyObj = JSON.parse(options.body as string);
          console.log(`[API-${requestId}] 📦 Body:`, bodyObj);
        } catch {
          console.log(`[API-${requestId}] 📦 Body:`, options.body);
        }
      }

      const response = await fetch(url, {
        headers: {
          ...headers,
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();
      const responseTime = Date.now() - startTime;

      // Log response
      console.log(`[API-${requestId}] ✅ RESPONSE: ${response.status} ${response.statusText} (${responseTime}ms)`);
      console.log(`[API-${requestId}] 📥 Data:`, data);

      if (!response.ok) {
        console.error(`[API-${requestId}] ❌ Error Response:`, data);
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`[API-${requestId}] 💥 ERROR: ${error instanceof Error ? error.message : 'Unknown error'} (${responseTime}ms)`);
      console.error(`[API-${requestId}] 🔍 Stack:`, error);

      throw error;
    }
  }

  // Authentication APIs
  async register(userData: {
    name: string;
    phone: string;
    email?: string;
    password?: string;
    role: 'admin' | 'driver' | 'valet_supervisor' | 'parking_location_supervisor' | 'owner';
    licenseDetails?: any;
    defaultLocation?: {
      lat: number;
      lng: number;
      address: string;
    };
  }): Promise<{ userId: string; requiresVerification: boolean }> {
    return this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(phone: string): Promise<{ requiresVerification: boolean }> {
    return this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async sendOtp(phone: string): Promise<{ sessionInfo: string }> {
    return this.makeRequest('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async verifyOtp(phone: string, otp: string): Promise<{ token: string; user: User }> {
    return this.makeRequest('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    });
  }

  async forgotPassword(phone: string): Promise<any> {
    return this.makeRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async resetPassword(phone: string, otp: string, password: string): Promise<any> {
    return this.makeRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ phone, otp, password }),
    });
  }

  // Generic POST method for external API calls
  async post(endpoint: string, data?: any): Promise<any> {
    const requestId = Math.random().toString(36).substr(2, 9);
    const startTime = Date.now();

    try {
      const url = `${this.baseURL}${endpoint}`;
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

      // Log request
      console.log(`[API-${requestId}] 🚀 REQUEST: POST ${url}`);
      console.log(`[API-${requestId}] 📋 Headers:`, {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: '[HIDDEN]' } : {})
      });
      if (data) {
        console.log(`[API-${requestId}] 📦 Body:`, data);
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      const responseData = await response.json();
      const responseTime = Date.now() - startTime;

      // Log response
      console.log(`[API-${requestId}] ✅ RESPONSE: ${response.status} ${response.statusText} (${responseTime}ms)`);
      console.log(`[API-${requestId}] 📥 Data:`, responseData);

      if (!response.ok) {
        console.error(`[API-${requestId}] ❌ Error Response:`, responseData);
        throw {
          response: {
            status: response.status,
            data: responseData
          }
        };
      }

      return { data: responseData };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      console.error(`[API-${requestId}] 💥 ERROR: ${error.response?.data?.message || error.message || 'Unknown error'} (${responseTime}ms)`);
      console.error(`[API-${requestId}] 🔍 Stack:`, error);

      throw error;
    }
  }

  async sendFirebaseOTP(phone: string): Promise<{ sessionInfo: string }> {
    return this.makeRequest('/auth/send-firebase-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async verifyFirebaseOTP(phone: string, otp: string): Promise<{ token: string; user: User }> {
    return this.makeRequest('/auth/verify-firebase-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    });
  }

  async updateProfile(updates: {
    name?: string;
    photoUrl?: string;
    defaultLocation?: {
      lat: number;
      lng: number;
      address: string;
    };
    emergencyContact?: {
      name: string;
      phone: string;
      relation: string;
    };
  }): Promise<{ user: User }> {
    return this.makeRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Vehicle APIs
  async addVehicle(vehicleData: {
    make: string;
    model: string;
    number: string;
    color: string;
    photoUrl?: string;
    vehicleType?: 'car' | 'bike' | 'truck' | 'suv';
    specialInstructions?: string;
  }): Promise<Vehicle> {
    return this.makeRequest('/owner/add-vehicle', {
      method: 'POST',
      body: JSON.stringify(vehicleData),
    });
  }

  async getVehicles(): Promise<Vehicle[]> {
    return this.makeRequest('/owner/vehicles');
  }

  // Request APIs
  async createParkRequest(requestData: {
    vehicleId: string;
    locationFrom: {
      lat: number;
      lng: number;
      address: string;
    };
    specialInstructions?: string;
  }): Promise<Request> {
    return this.makeRequest('/owner/park-request', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  }

  async createPickupRequest(requestData: {
    vehicleId: string;
    locationTo: {
      lat: number;
      lng: number;
      address: string;
    };
    specialInstructions?: string;
  }): Promise<Request> {
    return this.makeRequest('/owner/pickup-request', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  }

  async getRequestStatus(requestId: string): Promise<Request> {
    return this.makeRequest(`/owner/request-status/${requestId}`);
  }

  async submitFeedback(
    requestId: string,
    feedback: {
      rating: number;
      comments?: string;
    }
  ): Promise<any> {
    return this.makeRequest(`/owner/submit-feedback/${requestId}`, {
      method: 'POST',
      body: JSON.stringify(feedback),
    });
  }

  // Driver APIs
  async getIncomingRequests(filters?: {
    type?: string;
    location?: string;
  }): Promise<Request[]> {
    const queryParams = new URLSearchParams();
    if (filters?.type) queryParams.append('type', filters.type);
    if (filters?.location) queryParams.append('location', filters.location);

    const queryString = queryParams.toString();
    return this.makeRequest(`/driver/incoming-requests${queryString ? `?${queryString}` : ''}`);
  }

  async acceptRequest(requestId: string): Promise<Request> {
    return this.makeRequest(`/driver/accept-request/${requestId}`, {
      method: 'POST',
    });
  }

  async markParked(requestId: string): Promise<Request> {
    return this.makeRequest(`/driver/mark-parked/${requestId}`, {
      method: 'POST',
    });
  }

  async markHandedOver(requestId: string): Promise<Request> {
    return this.makeRequest(`/driver/mark-handed-over/${requestId}`, {
      method: 'POST',
    });
  }

  async getDriverHistory(filters?: {
    dateFrom?: string;
    dateTo?: string;
    type?: string;
  }): Promise<Request[]> {
    const queryParams = new URLSearchParams();
    if (filters?.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) queryParams.append('dateTo', filters.dateTo);
    if (filters?.type) queryParams.append('type', filters.type);

    const queryString = queryParams.toString();
    return this.makeRequest(`/driver/history${queryString ? `?${queryString}` : ''}`);
  }

  async getTodayParkedVehicles(): Promise<Vehicle[]> {
    return this.makeRequest('/driver/today-parked-vehicles');
  }

  async getDriverStats(filters?: {
    dateFrom?: string;
    dateTo?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (filters?.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) queryParams.append('dateTo', filters.dateTo);

    const queryString = queryParams.toString();
    return this.makeRequest(`/driver/stats${queryString ? `?${queryString}` : ''}`);
  }

  // Common APIs
  async getParkingLocations(): Promise<ParkingLocation[]> {
    return this.makeRequest('/common/parking-locations');
  }

  // Admin APIs
  async getPendingRegistrations(filters?: {
    role?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<User[]> {
    const queryParams = new URLSearchParams();
    if (filters?.role) queryParams.append('role', filters.role);
    if (filters?.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) queryParams.append('dateTo', filters.dateTo);

    const queryString = queryParams.toString();
    return this.makeRequest(`/admin/pending-registrations${queryString ? `?${queryString}` : ''}`);
  }

  async getAllUsers(filters?: {
    role?: string;
    status?: string;
  }): Promise<User[]> {
    const queryParams = new URLSearchParams();
    if (filters?.role) queryParams.append('role', filters.role);
    if (filters?.status) queryParams.append('status', filters.status);

    const queryString = queryParams.toString();
    return this.makeRequest(`/admin/get-all-users${queryString ? `?${queryString}` : ''}`);
  }

  async approveUser(userId: string, role?: string): Promise<User> {
    return this.makeRequest(`/admin/approve-user/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  }

  async rejectUser(userId: string): Promise<any> {
    return this.makeRequest(`/admin/reject-user/${userId}`, {
      method: 'POST',
    });
  }

  async editUser(userId: string, updates: {
    name?: string;
    phone?: string;
    email?: string;
    photoUrl?: string;
    licenseDetails?: any;
    defaultLocation?: {
      lat: number;
      lng: number;
      address: string;
    };
    role?: string;
  }): Promise<User> {
    try {
      return await this.makeRequest(`/admin/edit-user/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch (error: any) {
      // Handle duplicate phone error specifically
      if (error.message && error.message.includes('duplicate key error') && error.message.includes('phone_1')) {
        throw new Error('Phone number already exists. Please use a different phone number.');
      }
      // Handle duplicate email error
      if (error.message && error.message.includes('duplicate key error') && error.message.includes('email_1')) {
        throw new Error('Email address already exists. Please use a different email address.');
      }
      throw error;
    }
  }

  async addParkingLocation(locationData: {
    name: string;
    address: string;
    geolocation: {
      lat: number;
      lng: number;
    };
    capacity: number;
  }): Promise<ParkingLocation> {
    return this.makeRequest('/admin/add-parking-location', {
      method: 'POST',
      body: JSON.stringify(locationData),
    });
  }

  async editParkingLocation(locationId: string, updates: Partial<ParkingLocation>): Promise<ParkingLocation> {
    return this.makeRequest(`/admin/edit-parking-location/${locationId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteParkingLocation(locationId: string): Promise<any> {
    return this.makeRequest(`/admin/delete-parking-location/${locationId}`, {
      method: 'DELETE',
    });
  }

  async getStatistics(filters?: {
    dateFrom?: string;
    dateTo?: string;
    locationId?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (filters?.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) queryParams.append('dateTo', filters.dateTo);
    if (filters?.locationId) queryParams.append('locationId', filters.locationId);

    const queryString = queryParams.toString();
    return this.makeRequest(`/admin/statistics${queryString ? `?${queryString}` : ''}`);
  }

  async getComprehensiveHistory(filters?: {
    dateFrom?: string;
    dateTo?: string;
    date?: string; // Single date option
    type?: string;
    action?: string;
    userId?: string;
    vehicleId?: string;
    searchBy?: 'vehicle' | 'driver';
    searchValue?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    history: any[];
    pagination: {
      currentPage: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const queryParams = new URLSearchParams();
    if (filters?.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) queryParams.append('dateTo', filters.dateTo);
    if (filters?.date) queryParams.append('date', filters.date);
    if (filters?.type) queryParams.append('type', filters.type);
    if (filters?.action) queryParams.append('action', filters.action);
    if (filters?.userId) queryParams.append('userId', filters.userId);
    if (filters?.vehicleId) queryParams.append('vehicleId', filters.vehicleId);
    if (filters?.searchBy) queryParams.append('searchBy', filters.searchBy);
    if (filters?.searchValue) queryParams.append('searchValue', filters.searchValue);
    if (filters?.page) queryParams.append('page', filters.page.toString());
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());

    const queryString = queryParams.toString();
    return this.makeRequest(`/admin/history${queryString ? `?${queryString}` : ''}`);
  }

  async exportHistory(filters?: {
    dateFrom?: string;
    dateTo?: string;
    type?: string;
    format?: 'json' | 'csv';
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (filters?.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) queryParams.append('dateTo', filters.dateTo);
    if (filters?.type) queryParams.append('type', filters.type);
    if (filters?.format) queryParams.append('format', filters.format);

    const queryString = queryParams.toString();
    return this.makeRequest(`/admin/export-history${queryString ? `?${queryString}` : ''}`);
  }

  async getSystemHealth(): Promise<any> {
    return this.makeRequest('/admin/system-health');
  }

  // Supervisor APIs
  // Valet Supervisor APIs

  // Parking Location Supervisor APIs
  async verifyParkRequest(requestData: {
    carNumber: string;
    ownerName?: string;
    ownerPhone?: string;
    make?: string;
    model?: string;
    color?: string;
    locationFrom?: {
      lat: number;
      lng: number;
      address: string;
    };
  }): Promise<any> {
    return this.makeRequest('/supervisor/verify-park-request', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  }

  async markSelfPickup(vehicleId: string): Promise<any> {
    return this.makeRequest(`/supervisor/mark-self-pickup/${vehicleId}`, {
      method: 'POST',
    });
  }

  // Valet Supervisor APIs
  async createParkRequest(requestData: {
    phoneNumber: string;
    customerName: string;
    licensePlate: string;
    make: string;
    model: string;
    color: string;
  }): Promise<any> {
    return this.makeRequest('/supervisor/create-park-request', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  }

  async createPickupRequest(requestData: {
    vehicleId: string;
    locationFrom: {
      lat: number;
      lng: number;
    };
    notes?: string;
  }): Promise<any> {
    return this.makeRequest('/supervisor/create-pickup-request', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  }

  async getValetDashboardStats(filters?: {
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{
    totalParked: number;
    totalRequests: number;
    totalVerified: number;
    totalSelfParked: number;
    totalSelfPickup: number;
    usersByRole: Array<{
      _id: string;
      count: number;
    }>;
    dailyStats: Array<{
      _id: string;
      count: number;
      park: number;
      pickup: number;
    }>;
    period: string;
  }> {
    const queryParams = new URLSearchParams();
    if (filters?.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) queryParams.append('dateTo', filters.dateTo);

    const queryString = queryParams.toString();
    return this.makeRequest(`/supervisor/dashboard-stats${queryString ? `?${queryString}` : ''}`);
  }

  // Common Supervisor APIs
  async getParkedVehicles(filters?: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  }): Promise<Vehicle[]> {
    const queryParams = new URLSearchParams();
    if (filters?.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) queryParams.append('dateTo', filters.dateTo);
    if (filters?.status) queryParams.append('status', filters.status);

    const queryString = queryParams.toString();
    return this.makeRequest(`/supervisor/parked-vehicles${queryString ? `?${queryString}` : ''}`);
  }

  async getSupervisorHistory(filters?: {
    dateFrom?: string;
    dateTo?: string;
    type?: string;
    action?: string;
  }): Promise<any[]> {
    const queryParams = new URLSearchParams();
    if (filters?.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) queryParams.append('dateTo', filters.dateTo);
    if (filters?.type) queryParams.append('type', filters.type);
    if (filters?.action) queryParams.append('action', filters.action);

    const queryString = queryParams.toString();
    return this.makeRequest(`/supervisor/history${queryString ? `?${queryString}` : ''}`);
  }

  // Utility methods
  async uploadImage(imageUri: string): Promise<{ url: string }> {
    const requestId = Math.random().toString(36).substr(2, 9);
    const startTime = Date.now();

    try {
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'upload.jpg',
      } as any);

      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

      // Log request
      const uploadUrl = `${this.baseURL}/upload`;
      console.log(`[API-${requestId}] 🚀 REQUEST: POST ${uploadUrl} (Image Upload)`);
      console.log(`[API-${requestId}] 📋 Headers:`, {
        'Content-Type': 'multipart/form-data',
        ...(token ? { Authorization: '[HIDDEN]' } : {})
      });
      console.log(`[API-${requestId}] 📦 Image URI:`, imageUri);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const data = await response.json();
      const responseTime = Date.now() - startTime;

      // Log response
      console.log(`[API-${requestId}] ✅ RESPONSE: ${response.status} ${response.statusText} (${responseTime}ms)`);
      console.log(`[API-${requestId}] 📥 Data:`, data);

      if (!response.ok) {
        console.error(`[API-${requestId}] ❌ Error Response:`, data);
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`[API-${requestId}] 💥 ERROR: ${error instanceof Error ? error.message : 'Unknown error'} (${responseTime}ms)`);
      console.error(`[API-${requestId}] 🔍 Stack:`, error);

      throw error;
    }
  }

  // Location services
  async getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve) => {
      // @ts-ignore - React Native geolocation
      navigator.geolocation.getCurrentPosition(
        (position: any) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error: any) => {
          console.error('Error getting location:', error);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });
  }

  async getAddressFromCoordinates(lat: number, lng: number): Promise<string | null> {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=YOUR_GOOGLE_MAPS_API_KEY`
      );
      const data = await response.json();

      if (data.status === 'OK') {
        return data.results[0]?.formatted_address || null;
      }
      return null;
    } catch (error) {
      console.error('Error getting address:', error);
      return null;
    }
  }
}

export const apiService = new ApiService();
