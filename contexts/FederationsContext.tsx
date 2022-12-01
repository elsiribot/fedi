import React, { createContext, useReducer, useContext, useMemo } from 'react'

import { Federation } from '../bridge'

// Define the structure of this Context and its initial state
interface FederationsContextState {
    connectedFederations: Federation[]
    selectedFederation: Federation | null
}
const initialState: FederationsContextState = {
    connectedFederations: [],
    selectedFederation: null,
}
type AppState = typeof initialState

// Define actions that can change the state within this Context
enum ActionType {
    ADD_TO_CONNECTED_FEDERATIONS = 'ADD_TO_CONNECTED_FEDERATIONS',
    CHANGE_SELECTED_FEDERATION = 'CHANGE_SELECTED_FEDERATION',
    CLEAR_CONNECTED_FEDERATIONS = 'CLEAR_CONNECTED_FEDERATIONS',
    UPDATE_CONNECTED_FEDERATIONS = 'UPDATE_CONNECTED_FEDERATIONS',
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
export function updateConnectedFederations(federations: Federation[]): Action {
    return {
        type: ActionType.UPDATE_CONNECTED_FEDERATIONS,
        payload: federations,
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
                    action.payload,
                ],
            }
        case ActionType.CLEAR_CONNECTED_FEDERATIONS:
            return { ...state, connectedFederations: [] }
        case ActionType.CHANGE_SELECTED_FEDERATION:
            return { ...state, selectedFederation: action.payload }
        case ActionType.UPDATE_CONNECTED_FEDERATIONS:
            return {
                ...state,
                connectedFederations: action.payload,
            }
        default:
            return state
    }
}

function FederationsProvider(props: React.PropsWithChildren<{}>) {
    const [state, dispatch] = useReducer<React.Reducer<AppState, Action>>(
        reducer,
        initialState,
    )

    const providerValue = useMemo(
        () => ({ state, dispatch }),
        [state, dispatch],
    )

    console.log('FederationsProvider')

    return <FederationsContext.Provider value={providerValue} {...props} />
}

function useFederationsContext() {
    return useContext(FederationsContext)
}

export { FederationsProvider, useFederationsContext }
