import { DeepPartial } from '@reduxjs/toolkit'
import get from 'lodash/get'

import { CommonState } from '../redux'
import { SupportedCurrency } from '../types'
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
 * Given any version of our stored state interface, transform it into a partial
 * instance of the Redux state that can be merged in.
 */
export function transformStorageToState(
    storedData: AnyStoredState,
): DeepPartial<CommonState> {
    const data = migrateStoredState(storedData)

    return {
        environment: {
            language: data.language,
        },
        currency: {
            selectedFiatCurrency: enumOrNull(data.currency, SupportedCurrency),
        },
    }
}

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
    const keysetsToCheck = [
        ['currency', 'selectedFiatCurrency'],
        ['environment', 'language'],
        ['federation', 'activeFederationId'],
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
            chatIdentities: {},
        }
    }

    return migrationState
}

/**
 * Given a value and an enum, ensure it's a valid member of the enum,
 * otherwise return null.
 */
function enumOrNull<T extends number | string>(
    value: T | number | string | null,
    targetEnum: Record<string, T>,
): T | null {
    if (Object.values(targetEnum).includes(value as T)) {
        return value as T
    }
    return null
}
