import get from 'lodash/get'

import { CommonState } from '../redux'
import { AnyStoredState, LatestStoredState, StorageApi } from '../types/storage'

export const STATE_STORAGE_KEY = 'fedi:state'

/**
 * Given the current Redux state, transform it into the latest storage state.
 */
export function transformStateToStorage(state: CommonState): LatestStoredState {
    return {
        version: 1,
        language: state.environment.language,
        currency: state.currency.selectedFiatCurrency,
        activeFederationId: state.federation.activeFederationId,
        authenticatedGuardian: state.federation.authenticatedGuardian,
        chatIdentities: Object.entries(state.chat).reduce<
            LatestStoredState['chatIdentities']
        >((identities, [federationId, federationChatState]) => {
            if (federationChatState?.authenticatedMember) {
                identities[federationId] =
                    federationChatState.authenticatedMember
            }
            return identities
        }, {}),
    }
}

/**
 * Retrieve state from storage. Automatically runs migrations on it to ensure
 * it matches the LatestStoredState interface.
 */
export async function getStoredState(
    storage: StorageApi,
): Promise<LatestStoredState | null> {
    const serializedState = await storage.getItem(STATE_STORAGE_KEY)
    if (!serializedState) return null
    const storedState = JSON.parse(serializedState)
    return migrateStoredState(storedState)
}

/**
 * Given the previous version of state and the next version of state, return whether
 * or not there have been any changes that should be persisted.
 */
export function hasStorageStateChanged(
    oldState: CommonState,
    newState: CommonState,
) {
    // This is kind of a pain to keep up to date with transformStateToStorage, but
    // manually doing this and checking by reference is a TON faster than generating
    // two storage objects and deeply comparing them, so it's worth the effort to keep
    // up to date since this will be called on _every_ state change.
    const keysetsToCheck = [
        ['currency', 'selectedFiatCurrency'],
        ['environment', 'language'],
        ['federation', 'activeFederationId'],
        ['federation', 'authenticatedGuardian'],
    ]

    // Only check current federation's chat state
    const activeFederationId = newState.federation.activeFederationId
    if (activeFederationId) {
        keysetsToCheck.push(['chat', activeFederationId, 'authenticatedMember'])
    }

    for (let keysToCheck of keysetsToCheck) {
        if (get(oldState, keysToCheck) !== get(newState, keysToCheck)) {
            return true
        }
    }
    return false
}

/**
 * Runs any version of stored state through a series of transformations that
 * migrates it to the latest version of stored state.
 */
function migrateStoredState(state: AnyStoredState): LatestStoredState {
    let migrationState = { ...state }

    // Version 0 -> 1
    if (migrationState.version === 0) {
        migrationState = {
            ...migrationState,
            version: 1,
            language: null,
            currency: null,
            activeFederationId: null,
            authenticatedGuardian: null,
            chatIdentities: {},
        }
    }

    return migrationState
}
