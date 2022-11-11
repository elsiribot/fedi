# Overview

# Questions

# Features

## Federation Connections

- Handle camera permissions
- Connect to a federation
  - Scan a QR code
  - Paste a connection string
- Display list of connected federations + balances
- View federation profile
- Display federation connection QR + code
- Share federation connection data
- Leave a federation
- Switch federations

## Wallet

### Balances

- Display balances (E-cash, BTC, combined)
- Select a wallet to send & receive with

### Transaction History

- Display transaction history
- Select a transaction to display details

### Send & Receive

- Generate Lightning invoices
  - Specify an amount in sats
  - Specify an optional memo
  - Display QR code + invoice short-string
  - Share invoice or copy to clipboard
  - Listen for payment settlement & display success page
- Generate on-chain BTC addresses
  - Display QR code + address short-string
  - Share address or copy to clipboard
  - Listen for transaction detection & display success page
- Scan a QR Code / Paste from clipboard - Lightning invoice
  - of a invoice or address
- Scan a QR Code / Paste from clipboard - BTC address

## Send & Receive Tether

- Scan a QR code
- Review & confirm outgoing transaction
- Display a QR code

## Community

## Sites

- Display available WebLN-compatible sites (per federation?)
- Implement WebLN-capable in-app browser
- Build/integrate confirmation UI for LN-Pay
- Build/integrate confirmation UI for LN-Withdraw

## Settings

- Display available settings
- Select bitcoin unit (BTC or sats)
- Select display currency (USD or CBP)
  - Search currencies
  - Implement price-checker for each currency
- Select display language (English or Spanish)
- Display & update username

# Timeline

- Week 1
  - Create dev environment + splash page
  - Create issues for dev tasks / road-mapping
  - Establish code foundations
    - UI libraries (NativeBase + RN vector icons)
    - Navigation ()
    - API handlers
    - Localized strings (i18n library)
  - Build feature: Federation Connections
- Week 2
  - Build feature: Federation Connections
- Week 3
  - Build feature: Wallet > Balances
  - Build feature: Wallet > Transaction History
  - Build feature: Wallet > Send & Receive
- Week 4
  - Build feature: Wallet > Send & Receive
- Week 5
  - Build feature: Wallet > Send & Receive
  - Build feature: Settings
- Week 6
  - Build feature: Sites
- Week 7
  - Build feature: Sites
  - 
- Week 8
  - 
- Week 9
  - 
- Week 10
  - Distributable builds to TestFlight & Play Store with fastlane
  - 
- Week 11
  - Build feature: Community
  - 
- Week 12
  - 

