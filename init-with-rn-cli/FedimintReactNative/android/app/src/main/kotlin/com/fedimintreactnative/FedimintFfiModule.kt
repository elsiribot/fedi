package com.fedimintreactnative

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import org.rustylibs.calculator.*

class FedimintFfiModule(reactContext: ReactApplicationContext) :
        ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return NAME
    }

    @ReactMethod
    fun init(dataDir: String, promise: Promise) {
        try {
            fedimintInit(dataDir)
            promise.resolve(null)
        } catch (error: Throwable) {
            promise.reject("Init error", error.localizedMessage, error)
        }
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
            promise.reject("generateInvoice error", error.localizedMessage, error)
        }
    }

    @ReactMethod
    fun payInvoice(invoice: String, promise: Promise) {
        try {
            fedimintPayInvoice(invoice)
            promise.resolve(null)
        } catch (error: Throwable) {
            promise.reject("payInvoice error", error.localizedMessage, error)
        }
    }

    @ReactMethod
    fun generateAddress(promise: Promise) {
        promise.resolve(fedimintGenerateAddress())
    }

    companion object {
        const val NAME = "FedimintFfi"
    }

}
