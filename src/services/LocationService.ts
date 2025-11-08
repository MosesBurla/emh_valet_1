// LocationService.ts
import Geolocation, { GeolocationError } from '@react-native-community/geolocation';
import { PermissionsAndroid, Platform, Alert, Linking, NativeModules } from 'react-native';

// For checking if location services are enabled
const { LocationManager } = NativeModules;

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
export const ACTIVITY_NULL = 4;

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
  acceptableAccuracy?: number;
  requestBackgroundPermission?: boolean;
}

class LocationService {
  private isGettingLocation = false;
  private hasForegroundPermission = false;
  private hasBackgroundPermission = false;

  /**
   * Check if location services are enabled on the device
   */
  private async isLocationEnabled(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      // Try to use a test location request to check if services are enabled
      return new Promise((resolve) => {
        Geolocation.getCurrentPosition(
          () => resolve(true),
          (error) => {
            // Error code 2 = POSITION_UNAVAILABLE (location services off)
            if (error.code === 2) {
              resolve(false);
            } else {
              // Other errors mean location services might be on
              resolve(true);
            }
          },
          {
            enableHighAccuracy: false,
            timeout: 1000,
            maximumAge: 0,
          }
        );
      });
    } catch (err) {
      console.warn('Location service check failed:', err);
      return false;
    }
  }

  /**
   * Prompt user to enable location services
   */
  private async promptEnableLocationServices(): Promise<void> {
    return new Promise((resolve) => {
      Alert.alert(
        'Location Services Disabled',
        'Please enable Location Services in your device settings to use this feature.\n\nSettings > Location > Turn ON',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(),
          },
          {
            text: 'Open Settings',
            onPress: async () => {
              try {
                await Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
              } catch (err) {
                // Fallback to general settings
                Linking.openSettings();
              }
              resolve();
            },
          },
        ]
      );
    });
  }

  /**
   * Check if we already have foreground location permission
   */
  private async checkForegroundPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      const fineGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      
      if (fineGranted) {
        this.hasForegroundPermission = true;
        return true;
      }

      const coarseGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
      );

      this.hasForegroundPermission = coarseGranted;
      return coarseGranted;
    } catch (err) {
      console.warn('Permission check error:', err);
      return false;
    }
  }

  /**
   * Request foreground location permissions (fine or coarse)
   * Android 15 compatible
   */
  private async requestForegroundPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      // First try fine location
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'This app needs access to your location to show nearby vehicles and track your trips.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('✓ Fine location permission granted');
        this.hasForegroundPermission = true;
        return true;
      }

      // If fine location denied, try coarse location
      console.log('Fine location denied, requesting coarse location...');
      const coarseGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        {
          title: 'Approximate Location Permission',
          message: 'This app needs approximate access to your location.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );

      if (coarseGranted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('✓ Coarse location permission granted');
        this.hasForegroundPermission = true;
        return true;
      }

      console.warn('❌ All location permissions denied');
      this.hasForegroundPermission = false;
      return false;
    } catch (err) {
      console.error('Foreground permission error:', err);
      return false;
    }
  }

  /**
   * Request background location permission
   * MUST be called AFTER foreground permission is granted (Android 15 requirement)
   */
  async requestBackgroundPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    // Check Android version - background location was introduced in Android 10 (API 29)
    if (Platform.Version < 29) {
      console.log('Android version < 10, background permission not needed');
      return true;
    }

    // CRITICAL: Must have foreground permission first
    if (!this.hasForegroundPermission) {
      const hasForeground = await this.checkForegroundPermission();
      if (!hasForeground) {
        console.error('❌ Cannot request background permission without foreground permission');
        Alert.alert(
          'Permission Required',
          'Please grant location permission first before enabling background tracking.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }

    try {
      // Check if already granted
      const alreadyGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
      );

      if (alreadyGranted) {
        console.log('✓ Background location already granted');
        this.hasBackgroundPermission = true;
        return true;
      }

      // Android 15: Show rationale before requesting
      return new Promise((resolve) => {
        Alert.alert(
          'Background Location',
          'To track your vehicle continuously, this app needs access to your location even when the app is closed or not in use.\n\nOn the next screen, please select "Allow all the time".',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                this.hasBackgroundPermission = false;
                resolve(false);
              }
            },
            {
              text: 'Continue',
              onPress: async () => {
                try {
                  const backgroundGranted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
                    {
                      title: 'Background Location Permission',
                      message: 'Allow this app to access your location all the time for continuous vehicle tracking.',
                      buttonPositive: 'Allow',
                      buttonNegative: 'Deny',
                    }
                  );

                  if (backgroundGranted === PermissionsAndroid.RESULTS.GRANTED) {
                    console.log('✓ Background location permission granted');
                    this.hasBackgroundPermission = true;
                    resolve(true);
                  } else {
                    console.warn('❌ Background location permission denied');
                    this.hasBackgroundPermission = false;
                    
                    // Android 15: Offer to open settings
                    Alert.alert(
                      'Background Location Denied',
                      'For continuous tracking, please go to Settings > Apps > Permissions > Location and select "Allow all the time".',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Open Settings',
                          onPress: () => Linking.openSettings()
                        }
                      ]
                    );
                    resolve(false);
                  }
                } catch (err) {
                  console.error('Background permission request failed:', err);
                  this.hasBackgroundPermission = false;
                  resolve(false);
                }
              }
            }
          ]
        );
      });
    } catch (err) {
      console.error('Background permission error:', err);
      this.hasBackgroundPermission = false;
      return false;
    }
  }

  /**
   * Main permission request handler - Android 15 compatible
   */
  private async requestPermission(needsBackground: boolean = false): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      // Step 1: Always get foreground permission first
      const hasForeground = await this.requestForegroundPermission();
      
      if (!hasForeground) {
        return false;
      }

      // Step 2: Check if location services are enabled
      const locationEnabled = await this.isLocationEnabled();
      if (!locationEnabled) {
        console.warn('Location services are disabled');
        await this.promptEnableLocationServices();
        
        // Check again after prompt
        const stillDisabled = !(await this.isLocationEnabled());
        if (stillDisabled) {
          return false;
        }
      }

      // Step 3: Only request background if needed and foreground is granted
      if (needsBackground) {
        // Don't block on background permission - let it be requested separately
        console.log('ℹ️ Background permission can be requested separately');
      }

      return true;
    } catch (err) {
      console.error('Permission error:', err);
      return false;
    }
  }

  /**
   * Fast location strategy with better error handling
   */
  async getCurrentLocation(userOptions: LocationOptions = {}): Promise<Location> {
    const options = {
      timeout: userOptions.timeout ?? 20000, // 20 seconds total
      maximumAge: userOptions.maximumAge ?? 60000, // Accept 1min old cache
      showAlertOnFail: userOptions.showAlertOnFail ?? false,
      acceptableAccuracy: userOptions.acceptableAccuracy ?? 100, // 100 meters
      requestBackgroundPermission: userOptions.requestBackgroundPermission ?? false,
    };

    // Prevent multiple simultaneous requests
    if (this.isGettingLocation) {
      throw new Error('Location request already in progress');
    }

    this.isGettingLocation = true;

    try {
      // Step 1: Check permissions
      const hasPermission = await this.requestPermission(options.requestBackgroundPermission);
      if (!hasPermission) {
        const error = {
          code: PERMISSION_DENIED,
          message: 'Location permission denied or location services disabled',
        };
        
        if (options.showAlertOnFail) {
          Alert.alert(
            'Location Unavailable',
            'Please enable location permissions and location services in settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
        }
        
        throw error;
      }

      console.log('📍 Fast location fetch started');
      const startTime = Date.now();

      // Step 2: Try to get location with retries
      const location = await this.getLocationWithRetry(options, 2);
      
      const duration = Date.now() - startTime;
      console.log(`✓ Location obtained in ${duration}ms:`, location);
      
      return location;

    } catch (error: any) {
      console.error('Location failed:', error);
      
      if (options.showAlertOnFail) {
        let message = 'Unable to get location. Please check GPS settings.';
        
        if (error.code === POSITION_UNAVAILABLE) {
          message = 'Location services are disabled. Please enable GPS in your device settings.';
        } else if (error.code === TIMEOUT) {
          message = 'Location request timed out. Please ensure you have a clear view of the sky.';
        }
        
        Alert.alert(
          'Location Error',
          message,
          [
            { text: 'OK' }
          ]
        );
      }
      
      throw error;
    } finally {
      this.isGettingLocation = false;
    }
  }

  /**
   * Get location with retry mechanism
   */
  private async getLocationWithRetry(options: LocationOptions, retries: number): Promise<Location> {
    let lastError: any;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        console.log(`Attempt ${attempt + 1}/${retries}`);
        const location = await this.raceLocationStrategies(options);
        return location;
      } catch (error: any) {
        lastError = error;
        console.warn(`Attempt ${attempt + 1} failed:`, error.message);
        
        // If location services are off, don't retry
        if (error.code === POSITION_UNAVAILABLE) {
          throw error;
        }
        
        // Wait a bit before retry
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    throw lastError;
  }

  private raceLocationStrategies(options: LocationOptions): Promise<Location> {
    return new Promise((resolve, reject) => {
      let resolved = false;
      let bestLocation: Location | null = null;
      let completedRequests = 0;
      const totalRequests = 2;
      let lastError: GeolocationError | null = null;

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
        
        console.warn(`${source} failed (code ${error.code}):`, error.message);
        lastError = error;
        completedRequests++;

        // If both failed, reject
        if (completedRequests === totalRequests) {
          if (bestLocation) {
            resolved = true;
            resolve(bestLocation);
          } else {
            resolved = true;
            reject(lastError);
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
          timeout: 12000,
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
            reject(lastError || {
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

  // Utility method to check permission status
  async getPermissionStatus(): Promise<{
    foreground: boolean;
    background: boolean;
    locationEnabled: boolean;
  }> {
    if (Platform.OS !== 'android') {
      return { foreground: true, background: true, locationEnabled: true };
    }

    const foreground = await this.checkForegroundPermission();
    const locationEnabled = await this.isLocationEnabled();
    
    let background = false;
    if (Platform.Version >= 29) {
      try {
        background = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
        );
      } catch (err) {
        console.warn('Background permission check failed:', err);
      }
    }

    return { foreground, background, locationEnabled };
  }
}

// Export singleton
export const locationService = new LocationService();

// Quick access function
export const getCurrentLocation = (options?: LocationOptions) =>
  locationService.getCurrentLocation(options);

// Export background permission request helper
export const requestBackgroundLocation = () =>
  locationService.requestBackgroundPermission();