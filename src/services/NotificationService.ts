import PushNotification, { PushNotification as PN } from 'react-native-push-notification';
import { Platform } from 'react-native';
import { NotificationData } from '../types';
import { NOTIFICATION_TYPES } from '../constants';

export class NotificationService {
  private static channelId = 'valet-parking-channel';
  private static isConfigured = false;

  static configure() {
    if (this.isConfigured) return;

    PushNotification.configure({
      onNotification: function (notification: PN) {
        console.log('Notification received:', notification);
        notification.finish();
      },
      onRegister: function (token) {
        console.log('Push notification token:', token);
      },
      requestPermissions: Platform.OS === 'ios',
    });

    // Create notification channel for Android
    if (Platform.OS === 'android') {
      PushNotification.createChannel(
        {
          channelId: this.channelId,
          channelName: 'Valet Parking Notifications',
          channelDescription: 'Notifications for valet parking requests and updates',
          playSound: true,
          soundName: 'default',
          importance: 4,
          vibrate: true,
        },
        (created) => console.log(`Notification channel created: ${created}`)
      );
    }

    // Handle background notifications
    PushNotification.popInitialNotification((notification) => {
      console.log('Initial notification:', notification);
    });

    this.isConfigured = true;
  }

  static showLocalNotification(
    title: string,
    message: string,
    data?: any,
    priority: 'default' | 'high' | 'low' = 'default'
  ) {
    PushNotification.localNotification({
      channelId: this.channelId,
      title,
      message,
      playSound: true,
      soundName: 'default',
      userInfo: data || {},
      priority: priority,
      importance: priority === 'high' ? 'high' : 'default',
      vibrate: priority === 'high',
      onlyAlertOnce: false,
      smallIcon: 'ic_notification',
      largeIcon: 'ic_launcher',
    });
  }

  static showRequestNotification(request: any) {
    const title = 'New Parking Request';
    const message = `${request.type} request at ${request.location} for ${request.licensePlate}`;

    this.showLocalNotification(title, message, {
      type: NOTIFICATION_TYPES.NEW_REQUEST,
      requestId: request.id,
    }, 'high');
  }

  static showRequestAcceptedNotification(requestId: string, driverName: string) {
    const title = 'Request Accepted';
    const message = `${driverName} has accepted your request`;

    this.showLocalNotification(title, message, {
      type: NOTIFICATION_TYPES.REQUEST_ACCEPTED,
      requestId,
    });
  }

  static showRequestCompletedNotification(requestId: string) {
    const title = 'Request Completed';
    const message = 'Your parking request has been completed';

    this.showLocalNotification(title, message, {
      type: NOTIFICATION_TYPES.REQUEST_COMPLETED,
      requestId,
    });
  }

  static scheduleNotification(
    title: string,
    message: string,
    date: Date,
    data?: any
  ) {
    PushNotification.localNotificationSchedule({
      channelId: this.channelId,
      title,
      message,
      date,
      userInfo: data || {},
      allowWhileIdle: true,
    });
  }

  static cancelNotification(notificationId: string) {
    PushNotification.cancelLocalNotification(notificationId);
  }

  static cancelAllNotifications() {
    PushNotification.cancelAllLocalNotifications();
  }

  static getScheduledNotifications(callback: (notifications: any[]) => void) {
    PushNotification.getScheduledLocalNotifications(callback);
  }

  // In-app notification management
  static showInAppNotification(
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    duration: number = 3000
  ) {
    // This would integrate with a toast/snackbar library
    // For now, we'll use console logging
    console.log(`[${type.toUpperCase()}] ${title}: ${message}`);

    // In a real implementation, you might use:
    // Toast.show({ type, text1: title, text2: message, visibilityTime: duration });
  }

  // Permission handling
  static async requestPermissions(): Promise<boolean> {
    return new Promise((resolve) => {
      PushNotification.requestPermissions().then((result) => {
        resolve(result.alert || false);
      }).catch(() => {
        resolve(false);
      });
    });
  }

  static async checkPermissions(): Promise<{ alert: boolean, badge: boolean, sound: boolean }> {
    return new Promise((resolve) => {
      PushNotification.checkPermissions((result) => {
        resolve(result);
      });
    });
  }

  // Background notification handling
  static setBackgroundNotificationHandler(handler: (notification: any) => void) {
    PushNotification.configure({
      onNotification: function (notification) {
        handler(notification);
        notification.finish();
      },
    });
  }
}
