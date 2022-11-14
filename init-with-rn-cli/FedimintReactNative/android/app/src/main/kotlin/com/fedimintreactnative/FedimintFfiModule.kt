package com.fedimintreactnative

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

import org.fedimint.init;
import org.fedimint.balance;
import org.fedimint.generateInvoice;


import org.fedimint.payInvoice;

class FedimintFfiModule(reactContext: ReactApplicationContext) :
        ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return NAME
    }

    @ReactMethod
    fun init(dataDir: String, promise: Promise) {
        try {
            init(dataDir)
            promise.resolve(null)
        } catch (error: Throwable) {
            promise.reject("Init error", error.localizedMessage, error)
        }
    }

    @ReactMethod
    fun balance(promise: Promise) {
        try {
            println("inside balance")
            promise.resolve(balance().toInt()) // FIXME: it barfs on ULong
        } catch (error: Throwable) {
            promise.reject("balance error", error.localizedMessage, error)
        }
    }

    @ReactMethod
    fun generateInvoice(amount: String, description: String, promise: Promise) {
        try {
            println("inside generate invoice")
            var invoice = generateInvoice(amount, description)
            promise.resolve(invoice)
        } catch (error: Throwable) {
            promise.reject("generateInvoice error", error.localizedMessage, error)
        }
    }

    @ReactMethod
    fun payInvoice(invoice: String, promise: Promise) {
        try {
            payInvoice(invoice)
            promise.resolve(null)
        } catch (error: Throwable) {
            promise.reject("payInvoice error", error.localizedMessage, error)
        }
    }

    companion object {
        const val NAME = "FedimintFfi"
    }
}
