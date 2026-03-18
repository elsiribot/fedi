# Deep Linking

## Overview

The deep linking system handles navigation from external URLs into specific screens within the app. It supports two link formats:

-   **Deep links** — Universal Links hosted on our domain, e.g. `https://app.fedi.xyz/link?screen=chat&roomId=123`. When a user taps a deep link without the native app installed, they are taken to the web's deep link landing page where they can choose to continue in the browser or install the native app. Once the native app is installed, tapping a deep link will open the app directly.
-   **Internal links** — Native protocol links prefixed with `fedi://`, e.g. `fedi://room?roomId=123`. These are what deep links get converted into before being processed, and are also used directly within the app.

Onboarding must be completed first for deeplinks to trigger actions and behave as expected. If onboarding is not complete, deeplink actions are saved to Redux via `setRedirectTo` and handled later.

---

## How It Works

### Entry Point

In `Router.tsx`, the `NavigationContainer` is given a linking configuration once onboarding is complete:

```tsx
linking={getLinking(onboardingCompleted, dispatch)}
```

When navigation is ready, any links that arrived before the navigator was mounted are flushed:

```tsx
onReady={() => {
    flushPendingLinks(navigationRef)
}}
```

`Linking.openURL` is also patched at module load time so that internal navigation calls made anywhere in the app go through the same routing logic rather than opening a browser.

### Link Processing Pipeline

```
Incoming URL
     │
     ├─ isDeepLink()?
     │       │ Yes → normalizeDeepLink()  →  fedi://screen?params
     │       │ No  → pass through as-is
     │
     ▼
getLinking().subscribe() / getInitialURL
     │
     ├─ Onboarding incomplete? → dispatch(setRedirectTo(url))
     │
     ▼
listener(fediUri)          ← React Navigation receives the URL
     │
     ▼
getStateFromPath()         ← Custom override of React Navigation default
     │
     ▼
getInternalLinkRoute()     ← Strips prefix, looks up screen in screenMap
     │
     ▼
screenMap[screen](params)  ← Returns { screen, params } or { screen, parent, params }
     │
     ▼
NavigationState            ← Passed back to React Navigation to perform the navigation
```

---

## Flows

### 1. Cold Start (App Opens From a Link)

The app is not running and the user taps a link.

`subscribe()` calls `Linking.getInitialURL()` and `notifee.getInitialNotification()` on startup. If a URL is found, it is passed through `handleUrl`. If the navigation container is not yet mounted, the link is pushed to `pendingLinks` and processed once `onReady` fires via `flushPendingLinks`.

### 2. Foreground (App Already Open)

The user taps a link while the app is running.

`Linking.addEventListener` fires with the URL. `handleUrl` normalises it if it is a deep link and passes the resulting `fedi://` URI to the React Navigation listener.

### 3. Notification Press

A push notification containing a `link` field in its data payload is pressed.

Notifee's `onForegroundEvent` catches `EventType.PRESS`. Zendesk notifications are routed to `launchZendeskSupport`. All other notifications extract the `link` field and pass it through `handleUrl`.

### 4. Deep Link → Internal Link Conversion

A deep link arrives:

```
https://app.fedi.xyz/link?screen=room&roomId=abc123
```

`normalizeDeepLink()` converts this to:

```
fedi://room?roomId=abc123
```

The `screen` parameter is used as the path, and all remaining parameters are preserved as a query string. Hash-based params (`#screen=...`) are also supported.

### 5. In-App Navigation via `Linking.openURL`

`patchLinkingOpenURL` replaces the default `Linking.openURL` implementation at startup. When any part of the app calls `Linking.openURL` with a deep link URL, it is intercepted, normalised, and routed internally via `navigateToUri` rather than opening a browser. If the navigator is not yet ready, the link is queued in `pendingLinks`.

---

## Function Reference

### `Router.tsx`

The entry point for deep linking. Passes `getLinking` to the `NavigationContainer`, which activates the linking configuration once onboarding is complete. On navigation ready, calls `flushPendingLinks` to process any links that arrived before the navigator mounted. `patchLinkingOpenURL` is also called at module load time to intercept `Linking.openURL` calls app-wide, and `useHandleDeferredLink` handles any links that were saved to Redux during onboarding.

### `utils/linking.ts` (native)

| Function                                    | Description                                                                                                                                                                                                                   |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getLinking(onboardingCompleted, dispatch)` | Returns the full `LinkingOptions` config for React Navigation, including `prefixes`, `config`, `getStateFromPath`, and `subscribe`.                                                                                           |
| `getInternalLinkRoute(path, options)`       | Core routing function. Strips the `fedi://` prefix, looks up the screen in `screenMap`, and returns a React Navigation `NavigationState` object. Falls back to the default React Navigation path parser if no match is found. |
| `screenMap`                                 | A map of screen path names (e.g. `"room"`, `"chat"`) to functions that return a `ScreenResult` — either a root screen or a tab screen with a `parent: 'TabsNavigator'` property.                                              |
| `navigateToUri(navigationRef, uri)`         | Resolves a `fedi://` URI to a route and calls `navigationRef.reset()` to navigate.                                                                                                                                            |
| `flushPendingLinks(navigationRef)`          | Drains the `pendingLinks` queue and navigates to each in order.                                                                                                                                                               |
| `patchLinkingOpenURL(navigationRef)`        | Monkey-patches `Linking.openURL` to intercept deep links and route them internally.                                                                                                                                           |

### `common/utils/linking.ts`

| Function                  | Description                                                                                                                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isDeepLink(url)`         | Returns `true` if the URL is a valid deep link — i.e. it matches a known Fedi hostname, has a `/link` pathname, and includes a `screen` parameter. Supports both `?` and `#` delimiters. |
| `normalizeDeepLink(url)`  | Converts a deep link to a `{ fediUri, screen, params }` object. Extracts the `screen` param as the path and passes remaining params as the query string of the resulting `fedi://` URI.  |
| `isFediDeeplinkType(url)` | Returns `true` if a URL is a FediMod-type link (Telegram, WhatsApp, or a known Fedi host). Used to determine whether a URL should be opened externally or handled in-app.                |

---

## Supported Routes

| Screen            | Internal Link                             | Deep Link                                                           |
| ----------------- | ----------------------------------------- | ------------------------------------------------------------------- |
| Home tab          | `fedi://home`                             | `https://app.fedi.xyz/link?screen=home`                             |
| Chat tab          | `fedi://chat`                             | `https://app.fedi.xyz/link?screen=chat`                             |
| Mods tab          | `fedi://mods`                             | `https://app.fedi.xyz/link?screen=mods`                             |
| Federations tab   | `fedi://federations`                      | `https://app.fedi.xyz/link?screen=federations`                      |
| Chat room         | `fedi://room?roomId=<id>`                 | `https://app.fedi.xyz/link?screen=room&roomId=<id>`                 |
| User conversation | `fedi://user?userId=<id>`                 | `https://app.fedi.xyz/link?screen=user&userId=<id>`                 |
| Fedi Mod Browser  | `fedi://browser?url=<url>`                | `https://app.fedi.xyz/link?screen=browser&url=<url>`                |
| Claim Ecash       | `fedi://ecash?id=<id>`                    | `https://app.fedi.xyz/link?screen=ecash&id=<id>`                    |
| Join Federation   | `fedi://join?invite=<invite>`             | `https://app.fedi.xyz/link?screen=join&invite=<invite>`             |
| Share Logs        | `fedi://share-logs?ticketNumber=<number>` | `https://app.fedi.xyz/link?screen=share-logs&ticketNumber=<number>` |

---

## Notes

-   Links that arrive before onboarding is complete are saved to Redux via `setRedirectTo` and processed by `useHandleDeferredLink` once onboarding finishes.
-   Links that arrive before the navigator is ready are held in the module-level `pendingLinks` array and flushed in `onReady`.
-   Both `?` query strings and `#` hash fragments are supported in deep links, for compatibility with different link-sharing contexts.
-   `patchLinkingOpenURL` is called once at module load — before any component mounts — so the patch is in place for the entire app lifecycle.
