#import <React/RCTBridgeModule.h>


@interface RCT_EXTERN_MODULE(FedimintFfi, NSObject)

RCT_EXTERN_METHOD(init:(NSString*)dataDir
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(balance:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(generateInvoice:(NSString*)amount
                  description:(NSString*)description
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(payInvoice:(NSString*)invoice
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
