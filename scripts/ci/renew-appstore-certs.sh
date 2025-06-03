#!/usr/bin/env bash

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh

# Make sure Apple certificates are installed in the keychain
# and keychain is unlocked since there are some codesigning steps
# involved in the build process
security unlock-keychain -p $MATCH_PASSWORD $MATCH_KEYCHAIN_NAME
$REPO_ROOT/scripts/ci/install-apple-certs.sh

echo "Checking & renewing certificates for Apple App Store Connect..."
if [ -z "${FLAVOR:-}" ]; then
  fastlane check_appstore_certs --verbose
  # fastlane renew_appstore_certs --verbose
else
  fastlane check_appstore_certs_$FLAVOR --verbose
  # fastlane renew_appstore_certs_$FLAVOR --verbose
fi
