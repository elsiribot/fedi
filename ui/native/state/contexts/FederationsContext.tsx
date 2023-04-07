import AsyncStorage from '@react-native-async-storage/async-storage'
import { isEqual } from 'lodash'
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useReducer,
} from 'react'

import { Federation, Guardian } from '@fedi/common/types'

import { BridgeEventEmitter, FederationEvent } from '../../bridge'
import {
    AUTHENTICATED_GUARDIAN_DB_KEY,
    SELECTED_FEDERATION_ID_DB_KEY,
} from '../../constants'

// Define the structure of this Context and its initial state
interface FederationsContextState {
    federations: Federation[]
    selectedFederationId: string | null
    authenticatedGuardian: Guardian | null
}

// We compute the selectedFederation here based on selectedFederationId
interface ComputedFederationsContextState extends FederationsContextState {
    // this can be undefined because Array.find returns undefined if it can't find anything
    selectedFederation: Federation | undefined
}
const initialState: FederationsContextState = {
    federations: [],
    selectedFederationId: null,
    authenticatedGuardian: null,
}
type AppState = typeof initialState

// Define actions that can change the state within this Context
enum ActionType {
    CHANGE_AUTHENTICATED_GUARDIAN = 'CHANGE_AUTHENTICATED_GUARDIAN',
    UPDATE_SELECTED_FEDERATION_ID = 'UPDATE_SELECTED_FEDERATION_ID',
    // FIXME: we could just send null with ^^ instead ... or infer it when updated
    // with federation list of []
    UNSET_SELECTED_FEDERATION = 'UNSET_SELECTED_FEDERATION',
    UPDATE_FEDERATIONS = 'UPDATE_FEDERATIONS',
    UPDATE_FEDERATION = 'UPDATE_FEDERATION',
    UPDATE_FEDERATION_CREDENTIALS = 'UPDATE_FEDERATION_CREDENTIALS',
    UPDATE_FEDERATION_USERNAME = 'UPDATE_FEDERATION_USERNAME',
    RESET_FEDERATIONS_STATE = 'RESET_FEDERATIONS_STATE',
}
interface Action {
    type: ActionType
    payload?: any
}

// Wrap with state and dispatch fields and create the Context
type BaseContext = {
    state: ComputedFederationsContextState
    dispatch: React.Dispatch<Action>
}
export const FederationsContext = createContext({} as BaseContext)

// Export action creators as convenience functions to trigger state changes
export function changeAuthenticatedGuardian(guardian: Guardian | null): Action {
    return {
        type: ActionType.CHANGE_AUTHENTICATED_GUARDIAN,
        payload: guardian,
    }
}
export function updateSelectedFederationId(
    federationId: null | string,
): Action {
    return {
        type: ActionType.UPDATE_SELECTED_FEDERATION_ID,
        payload: federationId,
    }
}
export function updateFederations(
    selectedFederationId: null | string,
    federations: Federation[],
): Action {
    return {
        type: ActionType.UPDATE_FEDERATIONS,
        payload: { selectedFederationId, federations },
    }
}
export function updateFederation(event: FederationEvent): Action {
    return {
        type: ActionType.UPDATE_FEDERATION,
        payload: event,
    }
}

export function updateFederationCredentials(
    username: string,
    password: string,
    keypairSeed: string,
): Action {
    return {
        type: ActionType.UPDATE_FEDERATION_CREDENTIALS,
        payload: { username, password, keypairSeed },
    }
}
export function resetFederationCredentials(): Action {
    return {
        type: ActionType.UPDATE_FEDERATION_CREDENTIALS,
        payload: { keypairSeed: null, password: null, username: null },
    }
}
export function resetFederationsState(): Action {
    return {
        type: ActionType.RESET_FEDERATIONS_STATE,
    }
}

// Implement the reducer with actions and state changes
export function reducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case ActionType.CHANGE_AUTHENTICATED_GUARDIAN:
            return {
                ...state,
                authenticatedGuardian: action.payload,
            }
        case ActionType.UPDATE_SELECTED_FEDERATION_ID:
            // TODO: sanity check that such a federation exists
            return {
                ...state,
                selectedFederationId: action.payload,
            }
        case ActionType.UPDATE_FEDERATIONS:
            return {
                ...state,
                selectedFederationId: action.payload.selectedFederationId,
                federations: action.payload.federations,
            }
        case ActionType.UPDATE_FEDERATION_CREDENTIALS: {
            const federations = state.federations.map((f: Federation) => {
                // If the federation id matches, update the password of that
                // single connectedFederation
                if (f.name === state.selectedFederationId) {
                    return {
                        ...f,
                        username: action.payload.username,
                        password: action.payload.password,
                        keypairSeed: action.payload.keypairSeed,
                    }
                } else {
                    return f
                }
            })
            return {
                ...state,
                federations,
            }
        }
        case ActionType.UPDATE_FEDERATION_USERNAME: {
            const federations = state.federations.map((f: Federation) => {
                // If the federation id matches, update the username of that
                // single connectedFederation
                if (f.name === state.selectedFederationId) {
                    return {
                        ...f,
                        username: action.payload,
                    }
                } else {
                    return f
                }
            })
            return {
                ...state,
                federations,
            }
        }
        case ActionType.UPDATE_FEDERATION:
            const federations = state.federations.map(
                // If the federation id matches, update the entry
                (f: Federation) =>
                    f.name === action.payload.name
                        ? { ...f, ...action.payload }
                        : f,
            )
            if (isEqual(federations, state.federations)) {
                return state
            }
            return { ...state, federations }
        case ActionType.RESET_FEDERATIONS_STATE:
            return { ...initialState }
        default:
            return state
    }
}

function FederationsProvider(props: React.PropsWithChildren<{}>) {
    const [state, dispatch] = useReducer<React.Reducer<AppState, Action>>(
        reducer,
        initialState,
    )

    // useMemo makes sure the Provider only re-renders when
    // there is a state change
    const providerValue = useMemo(
        () => ({
            state: {
                ...state,
                // compute selected federation based on federationId
                selectedFederation: state.federations.find(
                    // FIXME: switch to using federation.id
                    f => f.name === state.selectedFederationId,
                ),
            },
            dispatch,
        }),
        [state, dispatch],
    )

    useEffect(() => {
        const emitter = new BridgeEventEmitter()
        const onFederationUpdate = (event: FederationEvent) => {
            // Prevents a state update on the off-chance we get an event
            // before the selectedFederation state is initialized
            if (state.selectedFederationId == null) return
            dispatch(updateFederation(event))
        }
        const federationListener =
            emitter.onFederationUpdate(onFederationUpdate)
        return () => federationListener.remove()
    }, [state])

    // Persist currently selected federation
    useEffect(() => {
        // Try not to accidentally overwrite real value with null
        if (state.selectedFederationId != null) {
            const selectedFederation = state.federations.find(
                // FIXME: switch to using federation.id
                f => f.name === state.selectedFederationId,
            )

            AsyncStorage.setItem(
                SELECTED_FEDERATION_ID_DB_KEY,
                JSON.stringify({
                    selectedFederation: {
                        name: state.selectedFederationId,
                        username: selectedFederation?.username,
                    },
                }),
            )
        }
    }, [state])

    // Persist authenticatedGuardian state
    useEffect(() => {
        console.info(
            'useEffect authenticatedGuardian',
            state.authenticatedGuardian,
        )
        if (state.authenticatedGuardian != null) {
            console.info('saving guardian', state.authenticatedGuardian.name)
            AsyncStorage.setItem(
                AUTHENTICATED_GUARDIAN_DB_KEY,
                JSON.stringify({
                    authenticatedGuardian: state.authenticatedGuardian,
                }),
            )
        }
    }, [state.authenticatedGuardian])

    return (
        <FederationsContext.Provider value={{ ...providerValue }} {...props} />
    )
}

function useFederationsContext() {
    return useContext(FederationsContext)
}

export { FederationsProvider, useFederationsContext }
