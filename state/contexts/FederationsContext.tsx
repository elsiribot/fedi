import AsyncStorage from '@react-native-async-storage/async-storage'
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useReducer,
} from 'react'

import { BalanceEvent, Federation, TFedimintEventEmitter } from '../../bridge'
import { FEDERATIONS_PERSISTENCE_KEY } from '../../constants'

// Define the structure of this Context and its initial state
interface FederationsContextState {
    connectedFederations: Federation[]
    selectedFederation: Federation | null
    userIsGuardian: boolean
}
const initialState: FederationsContextState = {
    connectedFederations: [],
    selectedFederation: null,
    userIsGuardian: false,
}
type AppState = typeof initialState

// Define actions that can change the state within this Context
enum ActionType {
    ADD_TO_CONNECTED_FEDERATIONS = 'ADD_TO_CONNECTED_FEDERATIONS',
    CHANGE_SELECTED_FEDERATION = 'CHANGE_SELECTED_FEDERATION',
    CLEAR_CONNECTED_FEDERATIONS = 'CLEAR_CONNECTED_FEDERATIONS',
    RESET_FEDERATIONS_STATE = 'RESET_FEDERATIONS_STATE',
    SET_USER_IS_GUARDIAN = 'SET_USER_IS_GUARDIAN',
    UPDATE_CONNECTED_FEDERATIONS = 'UPDATE_CONNECTED_FEDERATIONS',
    UPDATE_FEDERATION_BALANCE = 'UPDATE_FEDERATION_BALANCE',
    UPDATE_FEDERATION_USERNAME = 'UPDATE_FEDERATION_USERNAME',
}
interface Action {
    type: ActionType
    payload?: any
}

// Wrap with state and dispatch fields and create the Context
type BaseContext = {
    state: FederationsContextState
    dispatch: React.Dispatch<Action>
}
export const FederationsContext = createContext({} as BaseContext)

// Export action creators as convenience functions to trigger state changes
export function addToConnectedFederations(federation: Federation): Action {
    return {
        type: ActionType.ADD_TO_CONNECTED_FEDERATIONS,
        payload: federation,
    }
}
export function changeSelectedFederation(federation: Federation): Action {
    return {
        type: ActionType.CHANGE_SELECTED_FEDERATION,
        payload: federation,
    }
}
export function clearConnectedFederations(): Action {
    return {
        type: ActionType.CLEAR_CONNECTED_FEDERATIONS,
    }
}
export function resetFederationsState(): Action {
    return {
        type: ActionType.RESET_FEDERATIONS_STATE,
    }
}
export function setUserIsGuardian(isGuardian: boolean): Action {
    return {
        type: ActionType.SET_USER_IS_GUARDIAN,
        payload: isGuardian,
    }
}
export function updateConnectedFederations(federations: Federation[]): Action {
    return {
        type: ActionType.UPDATE_CONNECTED_FEDERATIONS,
        payload: federations,
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

// Implement the reducer with actions and state changes
export function reducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case ActionType.ADD_TO_CONNECTED_FEDERATIONS:
            return {
                ...state,
                connectedFederations: [
                    ...state.connectedFederations,
                    new Federation(action.payload),
                ],
            }
        case ActionType.CHANGE_SELECTED_FEDERATION:
            return {
                ...state,
                selectedFederation: new Federation(action.payload),
            }
        case ActionType.CLEAR_CONNECTED_FEDERATIONS:
            return { ...state, connectedFederations: [] }
        case ActionType.SET_USER_IS_GUARDIAN:
            return {
                ...state,
                userIsGuardian: action.payload,
            }
        case ActionType.UPDATE_CONNECTED_FEDERATIONS:
            return {
                ...state,
                connectedFederations: action.payload.map(
                    (f: Federation) => new Federation(f),
                ),
            }
        case ActionType.UPDATE_FEDERATION_BALANCE: {
            // If the federation id matches, check if selectedFederation.balance
            // has changed
            let updatedSelectedFederation = state.selectedFederation
            if (
                state.selectedFederation?.name === action.payload.federationId
            ) {
                // If balance is unchanged and the BalanceEvent is from the
                // selectedFederation, we can return a completely unchanged state
                // to prevent re-renders
                // Otherwise update the balance and proceed
                if (
                    state.selectedFederation?.balance === action.payload.balance
                ) {
                    return state
                } else {
                    updatedSelectedFederation!.balance = action.payload.balance
                }
            }

            const updatedConnectedFederations = state.connectedFederations.map(
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
                connectedFederations: updatedConnectedFederations,
                selectedFederation: updatedSelectedFederation,
            }
        }
        case ActionType.UPDATE_FEDERATION_USERNAME: {
            const updatedSelectedFederation = state.selectedFederation
            updatedSelectedFederation!.username = action.payload

            // Find selectedFederation in connectedFederations to
            // update the username
            const updatedConnectedFederations = state.connectedFederations.map(
                (f: Federation) => {
                    if (f.name === state.selectedFederation!.name) {
                        return new Federation({
                            ...f,
                            username: action.payload,
                        })
                    } else {
                        return f
                    }
                },
            )
            return {
                ...state,
                connectedFederations: updatedConnectedFederations,
                selectedFederation: updatedSelectedFederation,
            }
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
        () => ({ state, dispatch }),
        [state, dispatch],
    )

    useEffect(() => {
        const emitter = new TFedimintEventEmitter()
        const onBalanceUpdate = (event: BalanceEvent) => {
            // Prevents a state update on the off-chance we get an event
            // before the selectedFederation state is initialized
            if (state.selectedFederation == null) return

            dispatch(updateFederationBalance(event))
        }
        emitter.onBalanceUpdate(onBalanceUpdate)

        // This may be redundant if the event emitter already
        // removes existing listeners
        return () => {
            emitter.removeListener('balance')
        }
    }, [state])

    useEffect(() => {
        if (state.selectedFederation !== null) {
            AsyncStorage.setItem(
                FEDERATIONS_PERSISTENCE_KEY,
                JSON.stringify(state),
            )
        }
    }, [state])

    return <FederationsContext.Provider value={providerValue} {...props} />
}

function useFederationsContext() {
    return useContext(FederationsContext)
}

export { FederationsProvider, useFederationsContext }
