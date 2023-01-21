#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(FedimintFfi, NSObject)

RCT_EXTERN_METHOD(initialize:(NSString*)dataDir
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(rpc:(NSString*)method
                  payload:(NSString*)payload
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

@end



@interface RCT_EXTERN_MODULE(FedimintEventEmitter, RCTEventEmitter)

RCT_EXTERN_METHOD(supportedEvents)

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

@end
