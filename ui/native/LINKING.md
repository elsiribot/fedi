# Deep Linking

## Overview

The deep linking system handles navigation from external URLs into specific screens within the app. It supports two link formats:

-   **Deep links** — Universal Links hosted on our domain, e.g. `https://app.fedi.xyz/link?screen=chat&roomId=123`. When a user taps a deep link without the native app installed, they are taken to the web's deep link landing page where they can choose to continue in the browser or install the native app. Once the native app is installed, tapping a deep link will open the app directly.
-   **Internal links** — Native protocol links prefixed with `fedi://`, e.g. `fedi://room?roomId=123`. These are what deep links get converted into before being processed, and are also used directly within the app.

Onboarding must be completed first for deeplinks to trigger actions and behave as expected. If onboarding is not complete, deeplink actions are saved to Redux via `setRedirectTo` and handled later.

---

## User Flow Diagram

The diagram below traces every path a user can take when tapping a Fedi deep link — from initial tap through app resolution, routing, and final destination.

```mermaid
flowchart TD
    START([User taps a Fedi link]) --> FORMAT{Link format?}

    FORMAT -->|"Universal Link<br/>(app.fedi.xyz/link?...)"| HAS_APP{App installed?}
    FORMAT -->|"fedi:// protocol"| HAS_APP_2{App installed?}

    HAS_APP_2 -->|No| DEAD["Link fails<br/>(OS cannot handle scheme)"]
    HAS_APP_2 -->|Yes| ONBOARDED

    %% ─── App NOT installed ───────────────────────
    HAS_APP -->|No| LANDING["<b>Web Landing Page</b>"]
    LANDING --> WEB_CHOICE{User choice}
    WEB_CHOICE -->|Install the app| STORE[App Store / Play Store]
    WEB_CHOICE -->|Continue in browser| WEBAPP(["<b>Web App</b><br/>(handles link in browser)"])

    STORE --> OPENS[User installs and opens app]
    OPENS --> FRESH_ONBOARD["<b>Onboarding</b> — create wallet"]
    FRESH_ONBOARD --> DONE_HOME(["<b>Home Screen</b>"])

    %% ─── App installed ──────────────────────────
    HAS_APP -->|Yes| ONBOARDED

    ONBOARDED{Onboarding<br/>complete?}
    ONBOARDED -->|No| STASH[Link saved to storage]
    STASH --> FINISH_OB[User completes onboarding]
    FINISH_OB --> REPLAY[Saved link replayed]
    REPLAY --> ROUTE

    ONBOARDED -->|Yes| ROUTE

    %% ─── Routing ─────────────────────────────────
    ROUTE{"Screen specified<br/>in link?"}

    ROUTE -->|"home / chat /<br/>wallet / mods"| END_TAB(["<b>Tab Screen</b>"])
    ROUTE -->|room| END_ROOM(["<b>Chat Room</b>"])
    ROUTE -->|user| END_DM(["<b>Direct Message</b>"])
    ROUTE -->|browser| END_BROWSER(["<b>FediMod Browser</b>"])
    ROUTE -->|share-logs| END_LOGS(["<b>Share Logs</b>"])
    ROUTE -->|ecash| EC_SCREEN
    ROUTE -->|join| J_SCREEN
    ROUTE -->|join-then-ecash| JE_SCREEN
    ROUTE -->|join-then-browse| JB_SCREEN

    %% ─── Claim Ecash ────────────────────────────
    subgraph ecash_flow ["Claim Ecash"]
        EC_SCREEN["<b>Claim Ecash Screen</b>"]
        EC_SCREEN --> EC_VALID{Token valid?}
        EC_VALID -->|No| EC_ERROR["<b>Invalid Token Error</b>"]
        EC_ERROR -->|Cancel| EC_HOME_1(["<b>Home</b>"])

        EC_VALID -->|Yes| EC_MEMBER{Already in<br/>issuing federation?}
        EC_MEMBER -->|Yes| EC_EXISTING["Shows amount<br/><i>Adding to existing wallet</i>"]
        EC_MEMBER -->|No| EC_NEW["Shows amount<br/><i>Adding to new wallet</i><br/>+ Terms of Service"]

        EC_EXISTING --> EC_ACT{User action}
        EC_NEW --> EC_ACT
        EC_ACT -->|Claim| EC_CLAIMED["Ecash received<br/>(auto-joins federation<br/>if not already a member)"]
        EC_ACT -->|Maybe Later| EC_HOME_2(["<b>Home</b>"])
        EC_CLAIMED --> EC_SUCCESS["<b>Ecash Claimed!</b>"]
        EC_SUCCESS -->|Go to Wallet| EC_WALLET(["<b>Wallet</b>"])
        EC_SUCCESS -->|Maybe Later| EC_HOME_3(["<b>Home</b>"])
    end

    %% ─── Join Federation ─────────────────────────
    subgraph join_flow ["Join Federation"]
        J_SCREEN["<b>Join Federation Screen</b>"]
        J_SCREEN --> J_MEMBER{Already<br/>a member?}
        J_MEMBER -->|Yes| J_TOAST["<i>Already joined</i> toast"]
        J_TOAST -->|Tap back| J_PREV(["Previous screen"])

        J_MEMBER -->|No| J_PREVIEW["<b>Federation / Community Preview</b><br/>name, logo, details"]
        J_PREVIEW --> J_ACT{User action}
        J_ACT -->|Confirm join| J_JOINED[Joined]
        J_ACT -->|Reject| J_REJECT(["Previous screen"])

        J_JOINED --> J_NAME{Display name<br/>already set?}
        J_NAME -->|Yes| J_DEST(["<b>Wallet</b> (federation)<br/>or <b>Home</b> (community)"])
        J_NAME -->|No| J_DISPLAY["<b>Enter Display Name</b>"]
        J_DISPLAY --> J_DEST
    end

    %% ─── Join + Claim Ecash ──────────────────────
    subgraph join_ecash_flow ["Join + Claim Ecash"]
        JE_SCREEN["<b>Join Federation Screen</b><br/>(ecash token queued)"]
        JE_SCREEN --> JE_MEMBER{Already<br/>a member?}

        JE_MEMBER -->|"Yes — skip join"| JE_EC_SCREEN
        JE_MEMBER -->|No| JE_PREVIEW["<b>Federation Preview</b>"]
        JE_PREVIEW --> JE_ACT{User action}
        JE_ACT -->|Confirm join| JE_JOINED[Joined]
        JE_ACT -->|Reject| JE_BACK(["<b>Home</b>"])

        JE_JOINED --> JE_EC_SCREEN
        JE_EC_SCREEN["<b>Claim Ecash Screen</b><br/>(token pre-loaded)"]
        JE_EC_SCREEN --> JE_CLAIM{User action}
        JE_CLAIM -->|Claim| JE_OK["<b>Ecash Claimed!</b>"]
        JE_CLAIM -->|Maybe Later| JE_HOME(["<b>Home</b>"])
        JE_OK -->|Go to Wallet| JE_WALLET(["<b>Wallet</b>"])
    end

    %% ─── Join + Browse ───────────────────────────
    subgraph join_browse_flow ["Join + Browse"]
        JB_SCREEN["<b>Join Federation Screen</b><br/>(URL queued)"]
        JB_SCREEN --> JB_MEMBER{Already<br/>a member?}

        JB_MEMBER -->|"Yes — skip join"| JB_BROWSER
        JB_MEMBER -->|No| JB_PREVIEW["<b>Federation Preview</b>"]
        JB_PREVIEW --> JB_ACT{User action}
        JB_ACT -->|Confirm join| JB_JOINED[Joined]
        JB_ACT -->|Reject| JB_BACK(["<b>Home</b>"])

        JB_JOINED --> JB_BROWSER
        JB_BROWSER(["<b>FediMod Browser</b><br/>(URL pre-loaded)"])
    end
```

---

## How It Works

### Link Processing

All deep links pass through the same pipeline regardless of how they arrive (tap, cold start, notification, or in-app call):

```
Incoming URL
     │
     ├─ isDeepLink()?  →  Yes → normalizeDeepLink()  →  fedi://screen?params
     │                     No  → pass through as-is
     ▼
getLinking().subscribe()
     │
     ├─ Onboarding incomplete?  →  save to Redux, replay after onboarding
     ▼
getInternalLinkRoute()  →  look up screen in screenMap  →  NavigationState
```

**How links arrive:**

-   **Cold start** — `Linking.getInitialURL()` and `notifee.getInitialNotification()` capture the URL on launch. If the navigator isn't mounted yet, the link is queued in `pendingLinks` and flushed in `onReady`.
-   **Foreground** — `Linking.addEventListener` fires with the URL.
-   **Notification** — Notifee's `onForegroundEvent` extracts the `link` field from the notification data payload.
-   **In-app** — `patchLinkingOpenURL` (called once at module load) intercepts all `Linking.openURL` calls so deep links route internally instead of opening a browser.

### Deep Link → Internal Link Conversion

`normalizeDeepLink()` converts a universal link to the internal format. The `screen` parameter becomes the path and all other parameters are preserved:

```
https://app.fedi.xyz/link?screen=room&roomId=abc123  →  fedi://room?roomId=abc123
```

Both `?` and `#` delimiters are supported (e.g. `link#screen=room&roomId=abc123`).

---

## Key Files

| File | Role |
| ---- | ---- |
| `Router.tsx` | Wires `getLinking` into `NavigationContainer`, flushes pending links on ready, patches `Linking.openURL` |
| `utils/linking.ts` (native) | `getLinking`, `getInternalLinkRoute`, `screenMap`, `navigateToUri`, `flushPendingLinks`, `patchLinkingOpenURL` |
| `common/utils/linking.ts` | `isDeepLink`, `normalizeDeepLink`, `isFediDeeplinkType`, `stripFediPrefix`, `normalizeCommunityInviteCode` |

---

## Supported Routes

Both `?` and `#` delimiters work in universal links. Community invite codes with a `fedi:` prefix are normalised automatically.

| Screen | Internal Link | Deep Link |
| ------ | ------------- | --------- |
| Community tab | `fedi://home` | `https://app.fedi.xyz/link?screen=home` |
| Chat tab | `fedi://chat` | `https://app.fedi.xyz/link?screen=chat` |
| Mini Apps tab | `fedi://mods` | `https://app.fedi.xyz/link?screen=mods` |
| Wallet tab | `fedi://wallet` | `https://app.fedi.xyz/link?screen=wallet` |
| Federations tab (legacy) | `fedi://federations` | `https://app.fedi.xyz/link?screen=federations` |
| Chat room | `fedi://room?roomId=<id>` | `https://app.fedi.xyz/link?screen=room&roomId=<id>` |
| Direct message | `fedi://user?userId=<id>` | `https://app.fedi.xyz/link?screen=user&userId=<id>` |
| Mini Apps browser | `fedi://browser?url=<url>` | `https://app.fedi.xyz/link?screen=browser&url=<url>` |
| Claim Ecash | `fedi://ecash?id=<id>` | `https://app.fedi.xyz/link?screen=ecash&id=<id>` |
| Join Federation | `fedi://join?invite=<invite>` | `https://app.fedi.xyz/link?screen=join&invite=<invite>` |
| Join + Ecash | `fedi://join-then-ecash?invite=<invite>&ecash=<token>` | `https://app.fedi.xyz/link?screen=join-then-ecash&invite=<invite>&ecash=<token>` |
| Join + Browse | `fedi://join-then-browse?invite=<invite>&url=<url>` | `https://app.fedi.xyz/link?screen=join-then-browse&invite=<invite>&url=<url>` |
| Share Logs | `fedi://share-logs?ticketNumber=<number>` | `https://app.fedi.xyz/link?screen=share-logs&ticketNumber=<number>` |

---

## Notes

-   Links that arrive before onboarding is complete are saved to Redux via `setRedirectTo` and replayed after onboarding finishes.
-   Links that arrive before the navigator is ready are held in the module-level `pendingLinks` array and flushed in `onReady`.
-   `patchLinkingOpenURL` is called once at module load — before any component mounts — so the patch is in place for the entire app lifecycle.
