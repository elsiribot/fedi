import AsyncStorage from '@react-native-async-storage/async-storage'
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useReducer,
} from 'react'

import { BalanceEvent, Federation, TFedimintEventEmitter } from '../../bridge'
import { SELECTED_FEDERATION_ID_DB_KEY } from '../../constants'

// Define the structure of this Context and its initial state
interface FederationsContextState {
    federations: Federation[]
    selectedFederationId: string | null
}

// We compute the selectedFederation here based on selectedFederationId
interface ComputedFederationsContextState extends FederationsContextState {
    // this can be undefined because Array.find returns undefined if it can't find anything
    selectedFederation: Federation | undefined
}
const initialState: FederationsContextState = {
    federations: [],
    selectedFederationId: null,
}
type AppState = typeof initialState

// Define actions that can change the state within this Context
enum ActionType {
    UPDATE_SELECTED_FEDERATION_ID = 'UPDATE_SELECTED_FEDERATION_ID',
    // FIXME: we could just send null with ^^ instead ... or infer it when updated
    // with federation list of []
    UNSET_SELECTED_FEDERATION = 'UNSET_SELECTED_FEDERATION',
    UPDATE_FEDERATIONS = 'UPDATE_FEDERATIONS',
    UPDATE_FEDERATION_BALANCE = 'UPDATE_FEDERATION_BALANCE',
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

export function updateFederationBalance(event: BalanceEvent): Action {
    return {
        type: ActionType.UPDATE_FEDERATION_BALANCE,
        payload: event,
    }
}
export function updateFederationUsername(username: String): Action {
    return {
        type: ActionType.UPDATE_FEDERATION_USERNAME,
        payload: username,
    }
}
export function resetFederationUsername(): Action {
    return {
        type: ActionType.UPDATE_FEDERATION_USERNAME,
        payload: null,
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
        case ActionType.UPDATE_SELECTED_FEDERATION_ID:
            // TODO: sanity check that such a federation exists
            return {
                ...state,
                selectedFederationId: action.payload,
            }
        case ActionType.UPDATE_FEDERATIONS:
            console.log('update federations', action.payload)
            return {
                ...state,
                selectedFederationId: action.payload.selectedFederationId,
                federations: action.payload.federations.map(
                    (f: Federation) => new Federation(f),
                ),
            }
        case ActionType.UPDATE_FEDERATION_BALANCE:
            const updatedConnectedFederations = state.federations.map(
                (f: Federation) => {
                    // If the federation id matches, update the balance of that
                    // single connectedFederation
                    if (f.name === action.payload.federationId) {
                        return new Federation({
                            ...f,
                            balance: action.payload.balance,
                        })
                    } else {
                        return f
                    }
                },
            )
            return {
                ...state,
                federations: updatedConnectedFederations,
            }
        case ActionType.UPDATE_FEDERATION_BALANCE:
            const selectedFederation = state.federations.find(
                // FIXME: switch to using federation.id
                f => f.name === state.selectedFederationId,
            )
            const federations = state.federations.map((f: Federation) => {
                // If the federation id matches, update the balance of that
                // single connectedFederation
                if (f.name === selectedFederation!.name) {
                    return new Federation({
                        ...f,
                        username: action.payload,
                    })
                } else {
                    return f
                }
            })
            return {
                ...state,
                federations,
            }
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
        const emitter = new TFedimintEventEmitter()
        const onBalanceUpdate = (event: BalanceEvent) => {
            console.log('on update balance', event)
            // Prevents a state update on the off-chance we get an event
            // before the selectedFederation state is initialized
            if (state.selectedFederationId == null) return

            dispatch(updateFederationBalance(event))
        }
        emitter.onBalanceUpdate(onBalanceUpdate)

        // This may be redundant if the event emitter already
        // removes existing listeners
        return () => {
            emitter.removeListener('balance')
        }
    }, [state])

    // Persist currently selected federation
    useEffect(() => {
        // Try not to accidentally overwrite real value with null
        if (state.selectedFederationId != null) {
            AsyncStorage.setItem(
                SELECTED_FEDERATION_ID_DB_KEY,
                JSON.stringify(state.selectedFederationId),
            )
            console.log('savedd', state.selectedFederationId)
        }
    }, [state])

    return (
        <FederationsContext.Provider value={{ ...providerValue }} {...props} />
    )
}

function useFederationsContext() {
    return useContext(FederationsContext)
}

export { FederationsProvider, useFederationsContext }
