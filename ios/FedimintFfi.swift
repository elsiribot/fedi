import Calculator

@objc(FedimintFfi)
class FedimintFfi: NSObject {
  @objc
  func initialize(_ dataDir: NSString, logLevel: NSString, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
    fedimintInitialize(dataDir: String(dataDir), logLevel: String(logLevel), eventSink: EventDispatcher())
    resolve("")  // FIXME: how to resolve nothing?
  }

  @objc
  func rpc(_ method: NSString, payload: NSString, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
    resolve(fedimintRpc(method: String(method), payload: String(payload)))
  }
}

@objc(BridgeNativeEventEmitter)
class BridgeNativeEventEmitter: RCTEventEmitter {
  public static var shared: BridgeNativeEventEmitter!

  override init() {
    super.init()
    BridgeNativeEventEmitter.shared = self
  }

  public func send(withEvent eventType: String, body: Any) {
    sendEvent(withName: String(describing: eventType), body: body)
  }

  override func supportedEvents() -> [String] {
    return fedimintGetSupportedEvents()
  }
}

class EventDispatcher: EventSink {
  func event(eventType: String, body: String) {
    BridgeNativeEventEmitter.shared.send(withEvent: eventType, body: body);
  }
}
