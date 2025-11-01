// LocationService.ts
import Geolocation, { GeolocationError } from '@react-native-community/geolocation';
import { PermissionsAndroid, Platform, Alert } from 'react-native';

interface GeolocationPosition {
  readonly timestamp: number;
  readonly coords: {
    readonly accuracy: number;
    readonly altitude: number | null;
    readonly altitudeAccuracy: number | null;
    readonly heading: number | null;
    readonly latitude: number;
    readonly longitude: number;
    readonly speed: number | null;
  };
}

export const PERMISSION_DENIED = 1;
export const POSITION_UNAVAILABLE = 2;
export const TIMEOUT = 3;

export interface Location {
  latitude: number;
  longitude: number;
  timestamp?: number;
  accuracy?: number;
}

export interface LocationOptions {
  timeout?: number;
  maximumAge?: number;
  showAlertOnFail?: boolean;
  acceptableAccuracy?: number; // Accept first result better than this (meters)
}

class LocationService {
  private isGettingLocation = false;

  private async requestPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'This app needs access to your location.',
          buttonPositive: 'OK',
        }
      );

      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        const coarseGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
        );
        return coarseGranted === PermissionsAndroid.RESULTS.GRANTED;
      }

      return true;
    } catch (err) {
      console.warn('Permission error:', err);
      return false;
    }
  }

  /**
   * Fast location strategy:
   * 1. Check cached location first (if recent enough)
   * 2. Start both low and high accuracy requests simultaneously
   * 3. Return whichever comes first (or best within time window)
   */
  async getCurrentLocation(userOptions: LocationOptions = {}): Promise<Location> {
    const options = {
      timeout: userOptions.timeout ?? 2000, // 10 seconds total
      maximumAge: userOptions.maximumAge ?? 60000, // Accept 1min old cache
      showAlertOnFail: userOptions.showAlertOnFail ?? false,
      acceptableAccuracy: userOptions.acceptableAccuracy ?? 100, // 100 meters
    };

    // Prevent multiple simultaneous requests
    if (this.isGettingLocation) {
      throw new Error('Location request already in progress');
    }

    this.isGettingLocation = true;

    try {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        const error = {
          code: PERMISSION_DENIED,
          message: 'Location permission denied',
        };
        
        if (options.showAlertOnFail) {
          Alert.alert(
            'Permission Denied',
            'Please enable location access in settings.'
          );
        }
        
        throw error;
      }

      console.log('📍 Fast location fetch started');
      const startTime = Date.now();

      // Race multiple strategies
      const location = await this.raceLocationStrategies(options);
      
      const duration = Date.now() - startTime;
      console.log(`✓ Location obtained in ${duration}ms:`, location);
      
      return location;

    } catch (error: any) {
      console.error('Location failed:', error);
      
      if (options.showAlertOnFail) {
        Alert.alert(
          'Location Error',
          'Unable to get location. Please check GPS settings.'
        );
      }
      
      throw error;
    } finally {
      this.isGettingLocation = false;
    }
  }

  private raceLocationStrategies(options: LocationOptions): Promise<Location> {
    return new Promise((resolve, reject) => {
      let resolved = false;
      let bestLocation: Location | null = null;
      let completedRequests = 0;
      const totalRequests = 2;

      const resolveWithLocation = (location: Location, source: string) => {
        if (resolved) return;
        
        console.log(`Got location from ${source}:`, location);

        // If accuracy is good enough, resolve immediately
        if (location.accuracy && location.accuracy <= options.acceptableAccuracy!) {
          console.log(`✓ Acceptable accuracy (${location.accuracy}m), resolving`);
          resolved = true;
          resolve(location);
          return;
        }

        // Store best location
        if (!bestLocation || 
            (location.accuracy && bestLocation.accuracy && 
             location.accuracy < bestLocation.accuracy)) {
          bestLocation = location;
        }

        completedRequests++;

        // If both completed, return best
        if (completedRequests === totalRequests) {
          resolved = true;
          resolve(bestLocation!);
        }
      };

      const handleError = (error: GeolocationError, source: string) => {
        if (resolved) return;
        
        console.warn(`${source} failed:`, error.message);
        completedRequests++;

        // If both failed, reject
        if (completedRequests === totalRequests) {
          if (bestLocation) {
            resolved = true;
            resolve(bestLocation);
          } else {
            resolved = true;
            reject(error);
          }
        }
      };

      // Strategy 1: Network location (FAST - 2-5 seconds)
      console.log('🌐 Starting network location...');
      Geolocation.getCurrentPosition(
        (pos) => resolveWithLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        }, 'network'),
        (err) => handleError(err, 'network'),
        {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: options.maximumAge,
        }
      );

      // Strategy 2: GPS location (ACCURATE but slower - 5-15 seconds)
      console.log('🛰 Starting GPS location...');
      Geolocation.getCurrentPosition(
        (pos) => resolveWithLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        }, 'GPS'),
        (err) => handleError(err, 'GPS'),
        {
          enableHighAccuracy: true,
          timeout: options.timeout,
          maximumAge: options.maximumAge,
        }
      );

      // Overall timeout - return best location we have
      setTimeout(() => {
        if (!resolved) {
          if (bestLocation) {
            console.log('⏱ Timeout reached, returning best location');
            resolved = true;
            resolve(bestLocation);
          } else {
            resolved = true;
            reject({
              code: TIMEOUT,
              message: 'Location request timed out',
            });
          }
        }
      }, options.timeout);
    });
  }

  // Watch position for continuous updates
  watchPosition(
    onSuccess: (location: Location) => void,
    onError: (error: GeolocationError) => void,
    highAccuracy: boolean = false
  ): number {
    console.log('👁 Starting location watch');

    return Geolocation.watchPosition(
      (position: GeolocationPosition) => {
        onSuccess({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: position.timestamp,
          accuracy: position.coords.accuracy,
        });
      },
      onError,
      {
        enableHighAccuracy: highAccuracy,
        distanceFilter: 10,
        interval: 5000,
        fastestInterval: 2000,
      }
    );
  }

  clearWatch(watchId: number): void {
    Geolocation.clearWatch(watchId);
  }

  stopObserving(): void {
    Geolocation.stopObserving();
  }
}

// Export singleton
export const locationService = new LocationService();

// Quick access function
export const getCurrentLocation = (options?: LocationOptions) =>
  locationService.getCurrentLocation(options);