package com.lwc;

import android.content.Intent;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.content.Intent;
import android.util.Log;
import android.provider.Settings;
import android.net.Uri;

public class LocationModule extends ReactContextBaseJavaModule {

    private static ReactApplicationContext reactContext;

    public LocationModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
        LocationService.setReactContext(context);
    }

    @Override
    public String getName() {
        return "LocationServiceModule";
    }

   @ReactMethod
public void startService() {
    Intent serviceIntent = new Intent(reactContext, LocationService.class);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        reactContext.startForegroundService(serviceIntent);
    } else {
        reactContext.startService(serviceIntent);
    }
}

@ReactMethod
    public void requestBatteryOptimizationExemption() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + reactContext.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); // Required for starting activity from non-activity context
            try {
                reactContext.startActivity(intent);
            } catch (Exception e) {
                Log.e("LocationModule", "Error requesting battery optimization exemption: " + e.getMessage());
            }
        }
    }

    @ReactMethod
    public void stopService() {
        Intent serviceIntent = new Intent(reactContext, LocationService.class);
        reactContext.stopService(serviceIntent);
    }

    // Required for NativeEventEmitter
    @ReactMethod
    public void addListener(String eventName) { }

    @ReactMethod
    public void removeListeners(Integer count) { }

    // Helper to send events to JS
    public static void sendEvent(String eventName, String data) {
        if (reactContext != null) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, data);
        }
    }
}
