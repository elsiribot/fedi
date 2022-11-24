import Calculator

@objc(FedimintFfi)
class FedimintFfi: NSObject {
  @objc(init:withResolver:withRejecter:)
  func `init`(dataDir: NSString, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
    do {
      try fedimintInit(dataDir: String(dataDir), eventSink: EventDispatcher())
      resolve("")  // FIXME: how to resolve nothing?
    } catch {
      reject(error.localizedDescription, error.localizedDescription, error)
    }
  }

  @objc
  func balance(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
    resolve(fedimintBalance())
  }

  @objc
  func generateInvoice(_ amount: NSString, description: NSString, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
    let a = String(amount)
    let d = String(description)
    do {
      let invoice = try fedimintGenerateInvoice(amount: a, description: d)
      resolve(invoice)

    } catch {
      reject(error.localizedDescription, error.localizedDescription, error)
    }
  }

  @objc
  func payInvoice(_ invoice: NSString, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
    let i = String(invoice)
    do {
      try fedimintPayInvoice(invoice: i)
      resolve("")  // FIXME: how to resolve nothing?
    } catch {
      reject(error.localizedDescription, error.localizedDescription, error)
    }
  }

  @objc
  func generateAddress(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
    resolve(fedimintGenerateAddress())
  }

  @objc
  func payAddress(_ address: NSString, amount: NSString, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
    let addr = String(address)
    let amt = String(amount)
    do {
      let txid = try fedimintPayAddress(address: addr, amount: amt)
      resolve(txid)
    } catch {
      reject(error.localizedDescription, error.localizedDescription, error)
    }
  }
}

@objc(FedimintEventEmitter)
class FedimintEventEmitter: RCTEventEmitter {
  public static var shared: FedimintEventEmitter!

  override init() {
    super.init()
    FedimintEventEmitter.shared = self
  }

  public func send(withEvent eventType: String, body: Any) {
    sendEvent(withName: String(describing: eventType), body: body)
  }

  override func supportedEvents() -> [String] {
    // FIXME: don't hard-code these
    return ["log", "balance", "receivedLightning", "receivedBitcoin"]
  }
}

class EventDispatcher: EventSink {
  func event(eventType: String, body: String) {
    FedimintEventEmitter.shared.send(withEvent: eventType, body: body);
  }
}
