# Chat Architecture

## Overview

XMPP Prosody server coordinates connections between peers

## Server

<https://prosody.im/>

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
