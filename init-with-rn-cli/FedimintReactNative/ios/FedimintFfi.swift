import Calculator

@objc(FedimintFfi)
class FedimintFfi: NSObject {

  @objc(init:withResolver:withRejecter:)
  func `init`(dataDir: NSString, resolve:RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
    do {
      try fedimintInit(dataDir: String(dataDir))
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

}
