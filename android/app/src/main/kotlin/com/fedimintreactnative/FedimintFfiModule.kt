package com.fedimintreactnative

import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import org.rustylibs.calculator.*

object EventDispatcher : EventSink {
    override fun event(eventType: String, body: String) {
        FedimintEventEmitter.send(eventType, body)
    }
}
class FedimintFfiModule(reactContext: ReactApplicationContext) :
        ReactContextBaseJavaModule(reactContext) {

    init {
        FedimintEventEmitter.setContext(reactContext)
    }

    override fun getName(): String {
        return NAME
    }

    @ReactMethod
    fun init(dataDir: String, promise: Promise) {
        fedimintInit(dataDir, EventDispatcher)
        promise.resolve(null)
    }

    @ReactMethod
    fun rpc(method: String, payload: String, promise: Promise) {
        var response = fedimintRpc(method, payload)
        promise.resolve(response)
    }

    companion object {
        const val NAME = "FedimintFfi"
    }

}

object FedimintEventEmitter {
    private var reactContext: ReactContext? = null

    fun setContext(reactContext: ReactContext) {
        this.reactContext = reactContext
    }

    fun send(eventType: String, body: Any) {
        if (this.reactContext === null) {
            return
        }

        this.reactContext!!.getJSModule(RCTDeviceEventEmitter::class.java).emit(eventType, body)
    }
}
