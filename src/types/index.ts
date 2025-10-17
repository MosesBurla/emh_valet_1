// Type definitions for Valet Parking App

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'driver' | 'valet_supervisor' | 'parking_location_supervisor';
  status: 'active' | 'inactive' | 'pending';
  licenseNumber?: string;
  licenseExpiry?: string;
  licensePhoto?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParkingRequest {
  id: string;
  licensePlate: string;
  ownerName: string;
  ownerPhone: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  vehiclePhoto?: string;
  type: 'park' | 'pickup';
  location: string;
  locationCoordinates?: {
    latitude: number;
    longitude: number;
  };
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'standard' | 'vip' | 'emergency';
  estimatedTime: number;
  specialInstructions?: string;
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
  assignedDriverId?: string;
  assignedDriverName?: string;
  verifiedBy?: string;
  verificationPhoto?: string;
  totalCost?: number;
}

export interface ParkingHistory {
  id: string;
  requestId: string;
  licensePlate: string;
  ownerName: string;
  type: 'park' | 'pickup';
  location: string;
  status: 'completed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  driverName?: string;
  driverId?: string;
  totalCost?: number;
  rating?: number;
  feedback?: string;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  type: 'hotel' | 'airport' | 'mall' | 'office' | 'other';
  capacity: number;
  currentOccupancy: number;
  zones: ParkingZone[];
}

export interface ParkingZone {
  id: string;
  name: string;
  level: number;
  capacity: number;
  currentOccupancy: number;
  type: 'standard' | 'vip' | 'valet' | 'self_park';
}

export interface NotificationData {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'new_request' | 'request_accepted' | 'request_completed' | 'system';
  data?: any;
  read: boolean;
  createdAt: string;
}

export interface StatsData {
  totalRequests: number;
  completedRequests: number;
  cancelledRequests: number;
  averageServiceTime: number;
  totalRevenue: number;
  userSatisfaction: number;
  requestsByType: {
    park: number;
    pickup: number;
  };
  requestsByPriority: {
    standard: number;
    vip: number;
    emergency: number;
  };
  topLocations: {
    name: string;
    count: number;
  }[];
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface AppState {
  auth: AuthState;
  requests: ParkingRequest[];
  history: ParkingHistory[];
  locations: Location[];
  notifications: NotificationData[];
  stats: StatsData | null;
  loading: boolean;
  error: string | null;
}
