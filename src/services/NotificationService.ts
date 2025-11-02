import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { FIREBASE_INITIALIZED } from '../config/firebase';

export class NotificationService {
  private static isConfigured = false;

  static configure() {
    if (this.isConfigured) return;
    this.isConfigured = true;
    console.log('Firebase messaging configured (minimal setup)');
  }

  // Firebase messaging methods - minimal setup
  static async configureFirebaseMessaging() {
    try {
      // Ensure Firebase is initialized
      if (!FIREBASE_INITIALIZED) {
        throw new Error('Firebase is not initialized. Check your Firebase configuration.');
      }

      // Request permission for notifications
      const authStatus = await messaging().requestPermission();
      console.log('Authorization status:', authStatus);

      // Get FCM token
      const fcmToken = await messaging().getToken();
      console.log('FCM Token:', fcmToken);
      return fcmToken;
    } catch (error) {
      console.error('Firebase messaging configuration failed:', error);
      throw error;
    }
  }

  static async registerFirebaseNotifications(
    onNotification: (notification: any) => void,
    onTokenReceived?: (token: string) => void
  ) {
    try {
      // Handle foreground messages - just pass to callback
      const unsubscribeForeground = messaging().onMessage((remoteMessage) => {
        console.log('Foreground message received:', remoteMessage);
        onNotification(remoteMessage);
      });

      // Handle notification opened from background state
      const unsubscribeOpenedApp = messaging().onNotificationOpenedApp((remoteMessage) => {
        console.log('Notification caused app to open from background state:', remoteMessage);
        onNotification(remoteMessage);
      });

      // Handle notification opened from quit state
      messaging().getInitialNotification().then((remoteMessage) => {
        if (remoteMessage) {
          console.log('Notification caused app to open from quit state:', remoteMessage);
          onNotification(remoteMessage);
        }
      });

      // Handle token refresh
      const unsubscribeToken = messaging().onTokenRefresh((token) => {
        console.log('Token refreshed:', token);
        if (onTokenReceived) {
          onTokenReceived(token);
        }
      });

      return () => {
        unsubscribeForeground();
        unsubscribeOpenedApp();
        unsubscribeToken();
      };
    } catch (error) {
      console.error('Firebase messaging registration failed:', error);
      throw error;
    }
  }

  // Permission handling - minimal
  static async requestPermissions(): Promise<boolean> {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      return enabled;
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    }
  }

  static async getCurrentToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      return token;
    } catch (error) {
      console.error('Failed to get current token:', error);
      return null;
    }
  }
}

// Export minimal background handler
export const registerBackgroundMessageHandler = () => {
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('Background message received:', remoteMessage);
    // Minimal handling - let Firebase handle display automatically
  });
};
