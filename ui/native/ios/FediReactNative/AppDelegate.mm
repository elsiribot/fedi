#import "AppDelegate.h"

// for push notifications
#import <Firebase.h>
#import <react-native-zendesk-messaging/ZendeskNativeModule.h>
#import <UserNotifications/UserNotifications.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>
#import "RNSplashScreen.h"
#import <UIKit/UIKit.h>

@interface AppDelegate () <UNUserNotificationCenterDelegate>
- (void)registerForPushNotifications;
@end

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"FediReactNative";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  // Configure Firebase
  if ([FIRApp defaultApp] == nil) {
    [FIRApp configure];
  }

  // Register for remote notifications
  [application registerForRemoteNotifications];
  [self registerForPushNotifications];

  [super application:application didFinishLaunchingWithOptions:launchOptions];

    // Ensure UNUserNotificationCenter delegate is set
  [UNUserNotificationCenter currentNotificationCenter].delegate = self;

  // for splash screen
  [RNSplashScreen show];

  return YES;
}

- (void)registerForPushNotifications {
    UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
    center.delegate = self;
    [center requestAuthorizationWithOptions:(UNAuthorizationOptionSound | UNAuthorizationOptionAlert | UNAuthorizationOptionBadge)
                              completionHandler:^(BOOL granted, NSError * _Nullable error) {
        if (granted) {
            dispatch_async(dispatch_get_main_queue(), ^{
                [[UIApplication sharedApplication] registerForRemoteNotifications];
            });
            NSLog(@"Push notification permissions granted.");
        } else {
            NSLog(@"Push notification permissions denied.");
        }
    }];
}


// Handle APNs token registration and pass it to Firebase
- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
{
  // Pass the APNs token to Firebase Messaging
  [FIRMessaging messaging].APNSToken = deviceToken;
  NSLog(@"APNs Token set in Firebase.");
  // Pass the APNs token to Zendesk Messaging
  [ZendeskNativeModule updatePushNotificationToken:deviceToken];
  NSLog(@"Successfully registered APNs token with Zendesk.");
}

// Handle failed APNs registration
- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error
{
  NSLog(@"Failed to register for remote notifications: %@", error);
}

- (void)userNotificationCenter:(UNUserNotificationCenter *)center
       willPresentNotification:(UNNotification *)notification
         withCompletionHandler:(void (^)(UNNotificationPresentationOptions options))completionHandler
{
    NSLog(@"Received push notification while app is in foreground: %@", notification.request.content.userInfo);
   // Do not show any notification banner in foreground
    completionHandler(UNNotificationPresentationOptionNone);
}

// Provide the JS bundle URL for React Native
- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

// New getBundleURL method for compatibility with RN 0.74.0
- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

// Handle deep links via react-navigation
- (BOOL)application:(UIApplication *)application
   openURL:(NSURL *)url
   options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options
{
  return [RCTLinkingManager application:application openURL:url options:options];
}

@end
