import io, { Socket } from 'socket.io-client';
import { ParkingRequest, NotificationData } from '../types';
import { API_ENDPOINTS } from '../constants';

class SocketService {
  private socket: Socket | null = null;
  private connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private listeners: Map<string, Function[]> = new Map();

  connect(userId: string, userRole: string) {
    // Use environment variable for server URL
    //const SERVER_URL = 'https://emh-valet-service-1.onrender.com';
const SERVER_URL = 'http://192.168.1.4:3000';
    this.connectionStatus = 'connecting';
    this.socket = io(SERVER_URL, {
      auth: {
        userId,
        userRole
      },
      transports: ['websocket', 'polling'],
      timeout: 20000, // 20 second timeout
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: Infinity, // Keep trying forever
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      // Keep socket alive even when app is in background
      autoConnect: true,
      // Reconnect on app focus or foreground
      multiplex: false,
    });

    this.socket.on('connect', () => {
      console.log('Connected to socket server');
      this.connectionStatus = 'connected';
      // Send authentication after connection
      this.socket?.emit('authenticate', { userId, role: userRole });
      this.emit('user_connected', { userId, userRole });
    });

    this.socket.on('authenticated', (data) => {
      console.log('Socket authentication successful:', data);
    });

    this.socket.on('authentication_error', (error) => {
      console.error('Socket authentication failed:', error);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from socket server:', reason);
      this.connectionStatus = 'disconnected';
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      this.connectionStatus = 'disconnected';
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`Reconnected to socket server after ${attemptNumber} attempts`);
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Attempting to reconnect (${attemptNumber})`);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Reconnection failed:', error.message);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Failed to reconnect after maximum attempts');
    });

  // Set up event listeners for backend socket events
    this.socket.on(this.EVENTS.NEW_PARK_REQUEST, (data: any) => {
      this.notifyListeners(this.EVENTS.NEW_PARK_REQUEST, data);
    });

    this.socket.on(this.EVENTS.NEW_PICKUP_REQUEST, (data: any) => {
      this.notifyListeners(this.EVENTS.NEW_PICKUP_REQUEST, data);
    });

    this.socket.on(this.EVENTS.REQUEST_ACCEPTED, (data: any) => {
      this.notifyListeners(this.EVENTS.REQUEST_ACCEPTED, data);
    });

    this.socket.on(this.EVENTS.PARK_COMPLETED, (data: any) => {
      this.notifyListeners(this.EVENTS.PARK_COMPLETED, data);
    });

    this.socket.on(this.EVENTS.PICKUP_COMPLETED, (data: any) => {
      this.notifyListeners(this.EVENTS.PICKUP_COMPLETED, data);
    });

    this.socket.on(this.EVENTS.VEHICLE_VERIFIED, (data: any) => {
      this.notifyListeners(this.EVENTS.VEHICLE_VERIFIED, data);
    });

    this.socket.on(this.EVENTS.SELF_PARKED_CREATED, (data: any) => {
      this.notifyListeners(this.EVENTS.SELF_PARKED_CREATED, data);
    });

    this.socket.on(this.EVENTS.SELF_PICKUP_MARKED, (data: any) => {
      this.notifyListeners(this.EVENTS.SELF_PICKUP_MARKED, data);
    });

    this.socket.on('new_notification', (notification: NotificationData) => {
      this.notifyListeners('new_notification', notification);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  // Event listener management
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback?: Function) {
    if (!this.listeners.has(event)) return;

    if (callback) {
      const callbacks = this.listeners.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    } else {
      this.listeners.delete(event);
    }
  }

  private notifyListeners(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in socket listener for ${event}:`, error);
        }
      });
    }
  }

  // Emit events
  emit(event: string, data: any) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected. Cannot emit event:', event);
    }
  }

  // Request management methods for frontend
  acceptRequest(requestId: string) {
    this.emit(this.EVENTS.ACCEPT_REQUEST, { requestId });
  }

  updateRequestStatus(requestId: string, status: string, data?: any) {
    this.emit('update_request', { requestId, status, ...data });
  }

  completeRequest(requestId: string, completionData?: any) {
    this.emit('complete_request', { requestId, ...completionData });
  }

  // Park and pickup request creation for supervisors
  createParkRequest(requestData: any) {
    this.emit(this.EVENTS.CREATE_PARK_REQUEST, requestData);
  }

  createPickupRequest(requestData: any) {
    this.emit(this.EVENTS.CREATE_PICKUP_REQUEST, requestData);
  }

  // Vehicle verification for parking location supervisors
  verifyVehicle(verificationData: any) {
    this.emit(this.EVENTS.VERIFY_VEHICLE, verificationData);
  }

  markSelfPickup(vehicleId: string) {
    this.emit(this.EVENTS.MARK_SELF_PICKUP, { vehicleId });
  }

  // Location updates for drivers
  updateLocation(latitude: number, longitude: number) {
    this.emit(this.EVENTS.UPDATE_LOCATION, { latitude, longitude });
  }

  // Get connection status
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Get detailed connection status
  getConnectionStatus(): 'disconnected' | 'connecting' | 'connected' {
    return this.connectionStatus;
  }

  // Reconnect functionality
  reconnect() {
    if (this.socket) {
      this.socket.connect();
    }
  }

  // Socket event constants for easy reference
  EVENTS = {
    // Incoming events from backend
    NEW_PARK_REQUEST: 'new-park-request',
    NEW_PICKUP_REQUEST: 'new-pickup-request',
    REQUEST_ACCEPTED: 'request-accepted',
    PARK_COMPLETED: 'park-completed',
    PICKUP_COMPLETED: 'pickup-completed',
    VEHICLE_VERIFIED: 'vehicle-verified',
    SELF_PARKED_CREATED: 'self-parked-created',
    SELF_PICKUP_MARKED: 'self-pickup-marked',

    // Outgoing events to backend
    ACCEPT_REQUEST: 'accept_request',
    CREATE_PARK_REQUEST: 'create_park_request',
    CREATE_PICKUP_REQUEST: 'create_pickup_request',
    VERIFY_VEHICLE: 'verify_vehicle',
    MARK_SELF_PICKUP: 'mark_self_pickup',
    UPDATE_LOCATION: 'update_location',
  };
}

// Export singleton instance
export default new SocketService();
