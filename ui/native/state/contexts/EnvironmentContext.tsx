import React, { createContext, useContext, useMemo, useReducer } from 'react'
import Toast from 'react-native-easy-toast'

// Define the structure of this Context and its initial state
interface EnvironmentContextState {
    toast: Toast | null
}
const initialState: EnvironmentContextState = {
    toast: null,
}
type AppState = typeof initialState

// Define actions that can change the state within this Context
enum ActionType {
    INITIALIZE_TOAST_REF = 'INITIALIZE_TOAST_REF',
    RESET_ENVIRONMENT_STATE = 'RESET_ENVIRONMENT_STATE',
}
interface Action {
    type: ActionType
    payload?: any
}

// Wrap with state and dispatch fields and create the Context
type BaseContext = {
    state: EnvironmentContextState
    dispatch: React.Dispatch<Action>
}
export const EnvironmentContext = createContext({} as BaseContext)

// Export action creators as convenience functions to trigger state changes
export function initializeToastRef(toastRef: any): Action {
    return {
        type: ActionType.INITIALIZE_TOAST_REF,
        payload: toastRef,
    }
}
export function resetEnvironmentState(): Action {
    return {
        type: ActionType.RESET_ENVIRONMENT_STATE,
    }
}

// Implement the reducer with actions and state changes
export function reducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case ActionType.INITIALIZE_TOAST_REF:
            return {
                ...state,
                toast: action.payload,
            }
        case ActionType.RESET_ENVIRONMENT_STATE:
            return { ...initialState }
        default:
            return state
    }
}

function EnvironmentProvider(props: React.PropsWithChildren<object>) {
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

    return <EnvironmentContext.Provider value={providerValue} {...props} />
}

function useEnvironmentContext() {
    return useContext(EnvironmentContext)
}

export { EnvironmentProvider, useEnvironmentContext }
