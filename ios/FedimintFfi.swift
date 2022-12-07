import Calculator

@objc(FedimintFfi)
class FedimintFfi: NSObject {
  @objc(init:withResolver:withRejecter:)
  func `init`(dataDir: NSString, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
    fedimintInit(dataDir: String(dataDir), eventSink: EventDispatcher())
    resolve("")  // FIXME: how to resolve nothing?
  }

  @objc
  func rpc(_ method: NSString, payload: NSString, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
    resolve(fedimintRpc(method: String(method), payload: String(payload)))
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
    return ["log", "balance", "receivedLightning", "receivedBitcoin", "transaction"]
  }
}

class EventDispatcher: EventSink {
  func event(eventType: String, body: String) {
    FedimintEventEmitter.shared.send(withEvent: eventType, body: body);
  }
}
