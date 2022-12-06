#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(FedimintFfi, NSObject)

RCT_EXTERN_METHOD(init:(NSString*)dataDir
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(rpc:(NSString*)method
                  payload:(NSString*)payload
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end



@interface RCT_EXTERN_MODULE(FedimintEventEmitter, RCTEventEmitter)

RCT_EXTERN_METHOD(supportedEvents)

@end
