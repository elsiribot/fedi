# Chat Architecture

## Overview

XMPP Prosody server coordinates connections between peers

## Server

<https://prosody.im/>

There are other XMPP server implementations that may be more performant or more flexible for customization & development. Prosody is open-source under MIT, written in Lua, and was the only server that specifically advertised support for an [Experimental XEP](https://xmpp.org/extensions/xep-0384.html) defining a protocol for end-to-end encrypted multi-user chats.

XEP process has a similar spirit to the BIP process... XEPs have various states: proposed, experimental, stable, active, final

https://xmpp.org/extensions/
![Screenshot 2023-02-18 at 1 23 35 AM](https://user-images.githubusercontent.com/4914611/219844852-cdceda77-3d76-4dae-bef8-aa467301a053.png)

Building with XMPP means interoperability is a viable option for development and Fedi chat servers can be community-driven and customized while maintaining a level of compatibility with each other. This could make things like switching federations or currency conversion smoother for federation members.


### Alternative Technologies

#### Matrix

### Modules

- User registration
- Message archives
- Multi-user chatrooms (groups)

## Client

Uses [xmpp.js](https://github.com/xmppjs/xmpp.js)

### State Management

CommunityContext.ts

- initializes client-server connection via websocket
- manages local updates to messages, groups, members seen and persists via AsyncStorage

### Data Models / Types

#### Messages

<https://github.com/fedibtc/fedi-react-native/blob/5965ffe15ec2ac4e0112f0523852bbc9a754cdd5/types/index.ts#L138>

#### Chats

<https://github.com/fedibtc/fedi-react-native/blob/5965ffe15ec2ac4e0112f0523852bbc9a754cdd5/types/index.ts#L65>

#### Groups

<https://github.com/fedibtc/fedi-react-native/blob/5965ffe15ec2ac4e0112f0523852bbc9a754cdd5/types/index.ts#L81>

#### Members

<https://github.com/fedibtc/fedi-react-native/blob/5965ffe15ec2ac4e0112f0523852bbc9a754cdd5/types/index.ts#L127>
