// Mock data for Valet Parking App

import { User, ParkingRequest, ParkingHistory, StatsData } from '../types';

export const MOCK_USERS: User[] = [
  {
    id: '1',
    name: 'John Driver',
    email: 'john.driver@example.com',
    phone: '+1234567890',
    role: 'driver',
    status: 'active',
    licenseNumber: 'DL123456789',
    licenseExpiry: '2025-12-31',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'Sarah Wilson',
    email: 'sarah.wilson@example.com',
    phone: '+1234567891',
    role: 'valet_supervisor',
    status: 'active',
    createdAt: '2024-01-10T09:00:00Z',
    updatedAt: '2024-01-10T09:00:00Z',
  },
  {
    id: '3',
    name: 'Mike Johnson',
    email: 'mike.johnson@example.com',
    phone: '+1234567892',
    role: 'parking_location_supervisor',
    status: 'active',
    createdAt: '2024-01-05T08:00:00Z',
    updatedAt: '2024-01-05T08:00:00Z',
  },
  {
    id: '4',
    name: 'Admin User',
    email: 'admin@valetparking.com',
    phone: '+1234567893',
    role: 'admin',
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

export const MOCK_REQUESTS: ParkingRequest[] = [
  {
    id: 'req_1',
    licensePlate: 'ABC-1234',
    ownerName: 'John Smith',
    ownerPhone: '+1555123456',
    vehicleMake: 'Toyota',
    vehicleModel: 'Camry',
    vehicleColor: 'Blue',
    type: 'park',
    location: 'Marriott Hotel - Valet',
    locationCoordinates: {
      latitude: 40.7589,
      longitude: -73.9851,
    },
    status: 'pending',
    priority: 'standard',
    estimatedTime: 2,
    specialInstructions: 'Please handle with care',
    createdAt: '2024-01-15T14:30:00Z',
  },
  {
    id: 'req_2',
    licensePlate: 'XYZ-7890',
    ownerName: 'Jane Doe',
    ownerPhone: '+1555234567',
    vehicleMake: 'Honda',
    vehicleModel: 'Civic',
    vehicleColor: 'Red',
    type: 'pickup',
    location: 'Airport Terminal 3',
    locationCoordinates: {
      latitude: 40.6413,
      longitude: -73.7781,
    },
    status: 'pending',
    priority: 'vip',
    estimatedTime: 5,
    createdAt: '2024-01-15T14:25:00Z',
  },
  {
    id: 'req_3',
    licensePlate: 'DEF-4567',
    ownerName: 'Bob Wilson',
    ownerPhone: '+1555345678',
    vehicleMake: 'Ford',
    vehicleModel: 'Mustang',
    vehicleColor: 'Black',
    type: 'park',
    location: 'Shopping Mall - Level 2',
    locationCoordinates: {
      latitude: 40.7831,
      longitude: -73.9712,
    },
    status: 'pending',
    priority: 'standard',
    estimatedTime: 3,
    specialInstructions: 'Premium spot requested',
    createdAt: '2024-01-15T14:20:00Z',
  },
  {
    id: 'req_4',
    licensePlate: 'GHI-0123',
    ownerName: 'Alice Brown',
    ownerPhone: '+1555456789',
    vehicleMake: 'BMW',
    vehicleModel: 'X3',
    vehicleColor: 'White',
    type: 'pickup',
    location: 'Office Complex - Building A',
    locationCoordinates: {
      latitude: 40.7505,
      longitude: -73.9934,
    },
    status: 'pending',
    priority: 'emergency',
    estimatedTime: 1,
    createdAt: '2024-01-15T14:15:00Z',
  },
];

export const MOCK_HISTORY: ParkingHistory[] = [
  {
    id: 'hist_1',
    requestId: 'req_completed_1',
    licensePlate: 'ABC-1234',
    ownerName: 'John Smith',
    type: 'park',
    location: 'Marriott Hotel - Valet',
    status: 'completed',
    startedAt: '2024-01-15T10:00:00Z',
    completedAt: '2024-01-15T10:30:00Z',
    driverName: 'John Driver',
    driverId: '1',
    totalCost: 25.00,
    rating: 5,
    feedback: 'Excellent service!',
  },
  {
    id: 'hist_2',
    requestId: 'req_completed_2',
    licensePlate: 'XYZ-7890',
    ownerName: 'Jane Doe',
    type: 'pickup',
    location: 'Airport Terminal 3',
    status: 'completed',
    startedAt: '2024-01-15T09:00:00Z',
    completedAt: '2024-01-15T09:45:00Z',
    driverName: 'John Driver',
    driverId: '1',
    totalCost: 35.00,
    rating: 4,
    feedback: 'Very professional',
  },
  {
    id: 'hist_3',
    requestId: 'req_cancelled_1',
    licensePlate: 'DEF-4567',
    ownerName: 'Bob Wilson',
    type: 'park',
    location: 'Shopping Mall - Level 2',
    status: 'cancelled',
    startedAt: '2024-01-15T08:00:00Z',
    driverName: 'John Driver',
    driverId: '1',
  },
];

export const MOCK_STATS: StatsData = {
  totalRequests: 2847,
  completedRequests: 2654,
  cancelledRequests: 193,
  averageServiceTime: 12.3,
  totalRevenue: 45680.50,
  userSatisfaction: 4.8,
  requestsByType: {
    park: 1423,
    pickup: 1424,
  },
  requestsByPriority: {
    standard: 2200,
    vip: 500,
    emergency: 147,
  },
  topLocations: [
    { name: 'Marriott Hotel', count: 450 },
    { name: 'Airport Terminal 3', count: 320 },
    { name: 'Shopping Mall', count: 280 },
    { name: 'Office Complex', count: 210 },
    { name: 'Hospital', count: 150 },
  ],
};

// Mock API delay function
export const mockApiDelay = (ms: number = 1000): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Mock authentication function
export const mockAuthenticate = async (phone: string, otp: string): Promise<{ success: boolean, user?: User, error?: string }> => {
  await mockApiDelay(1500); // Simulate network delay

  const user = MOCK_USERS.find(u => u.phone === phone);

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  // Simple mock OTP check (in real app, this would verify against sent OTP)
  if (otp === '123456') {
    return { success: true, user };
  }

  return { success: false, error: 'Invalid OTP' };
};

// Mock requests fetch function
export const mockFetchRequests = async (role: string, status?: string): Promise<ParkingRequest[]> => {
  await mockApiDelay(800);

  let filteredRequests = [...MOCK_REQUESTS];

  if (status && status !== 'all') {
    filteredRequests = filteredRequests.filter(req => req.status === status);
  }

  return filteredRequests;
};

// Mock history fetch function
export const mockFetchHistory = async (userId: string, dateRange: string): Promise<ParkingHistory[]> => {
  await mockApiDelay(600);

  return MOCK_HISTORY;
};

// Mock stats fetch function
export const mockFetchStats = async (userRole: string): Promise<StatsData> => {
  await mockApiDelay(1000);

  return MOCK_STATS;
};

// Mock request acceptance function
export const mockAcceptRequest = async (requestId: string): Promise<{ success: boolean, error?: string }> => {
  await mockApiDelay(500);

  const request = MOCK_REQUESTS.find(req => req.id === requestId);
  if (!request) {
    return { success: false, error: 'Request not found' };
  }

  if (request.status !== 'pending') {
    return { success: false, error: 'Request is no longer available' };
  }

  return { success: true };
};

// Mock status update function
export const mockUpdateDriverStatus = async (online: boolean): Promise<{ success: boolean, error?: string }> => {
  await mockApiDelay(300);

  return { success: true };
};

// Mock registration function
export const mockRegister = async (userData: {
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  licenseNumber?: string;
  fullName?: string;
}): Promise<{ success: boolean, user?: User, error?: string }> => {
  await mockApiDelay(1500); // Simulate network delay

  // Check if user already exists
  const existingUser = MOCK_USERS.find(u => u.phone === userData.phone);
  if (existingUser) {
    return { success: false, error: 'User with this phone number already exists' };
  }

  // Create new user
  const newUser: User = {
    id: String(MOCK_USERS.length + 1),
    name: userData.fullName || `${userData.firstName} ${userData.lastName}`,
    email: `${userData.firstName.toLowerCase()}.${userData.lastName.toLowerCase()}@example.com`,
    phone: userData.phone,
    role: userData.role as any,
    status: 'active',
    licenseNumber: userData.licenseNumber || '',
    licenseExpiry: '2025-12-31',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Add to mock users array
  MOCK_USERS.push(newUser);

  return { success: true, user: newUser };
};
