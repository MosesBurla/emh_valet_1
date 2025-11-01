package com.emmanuelministrieshyd.parking

import android.content.Intent
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

    override fun getMainComponentName(): String = "Lwc"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

    // Add this to stop the service when activity is destroyed
    override fun onDestroy() {
        super.onDestroy()
        val intent = Intent(this, LocationService::class.java)
        stopService(intent)
    }
}
