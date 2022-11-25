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
        Log.i("test", "kotlin calling init")
        try {
            fedimintInit(dataDir, EventDispatcher)
            promise.resolve(null)
        } catch (error: Throwable) {
            promise.reject("init() error", error.localizedMessage, error)
        }
    }

    @ReactMethod
    fun joinFederation(connectString: String, promise: Promise) {
        Log.i("test", "kotlin calling joinFederation")
        try {
            fedimintJoinFederation(connectString)
            promise.resolve(null)
        } catch (error: Throwable) {
            promise.reject("joinFederation() error", error.localizedMessage, error)
        }
    }

    @ReactMethod
    fun listFederations(promise: Promise) {
        var fedimintFederations = fedimintListFederations()
        val reactFederations = Arguments.createArray()
        fedimintFederations.forEach {
            val federation = Arguments.createMap()
            federation.putString("name", it.name)
            reactFederations.pushMap(federation)
        }
        promise.resolve(reactFederations)
    }

    @ReactMethod
    fun listTransactions(promise: Promise) {
        promise.resolve(fedimintListTransactions())
    }

    @ReactMethod
    fun balance(promise: Promise) {
        promise.resolve(fedimintBalance().toInt()) // FIXME: it barfs on ULong
    }

    @ReactMethod
    fun generateInvoice(amount: String, description: String, promise: Promise) {
        try {
            println("inside generate invoice")
            var invoice = fedimintGenerateInvoice(amount, description)
            promise.resolve(invoice)
        } catch (error: Throwable) {
            promise.reject("generateInvoice() error", error.localizedMessage, error)
        }
    }

    @ReactMethod
    fun payInvoice(invoice: String, promise: Promise) {
        try {
            fedimintPayInvoice(invoice)
            promise.resolve(null)
        } catch (error: Throwable) {
            promise.reject("payInvoice() error", error.localizedMessage, error)
        }
    }

    @ReactMethod
    fun generateAddress(promise: Promise) {
        promise.resolve(fedimintGenerateAddress())
    }

    @ReactMethod
    fun payAddress(address: String, amount: String, promise: Promise) {
        try {
            var txid = fedimintPayAddress(address, amount)
            promise.resolve(txid)
        } catch (error: Throwable) {
            promise.reject("payAddress() error", error.localizedMessage, error)
        }
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
