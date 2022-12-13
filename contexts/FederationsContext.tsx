import AsyncStorage from '@react-native-async-storage/async-storage'
import React, {
    createContext,
    useReducer,
    useContext,
    useMemo,
    useEffect,
    useCallback,
} from 'react'

import {
    Federation,
    generateAddress as _generateAddress,
    generateInvoice as _generateInvoice,
    listTransactions as _listTransactions,
    payAddress as _payAddress,
    payInvoice as _payInvoice,
    generateEcash as _generateEcash,
    receiveEcash as _receiveEcash,
    validateEcash as _validateEcash,
} from '../bridge'
import { FEDERATIONS_PERSISTENCE_KEY } from '../constants'

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
    RESET_FEDERATIONS_STATE = 'RESET_FEDERATIONS_STATE',
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
export function resetFederationsState(): Action {
    return {
        type: ActionType.RESET_FEDERATIONS_STATE,
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

    // this useEffect checks async storage to restore
    // federations state on a fresh app load
    useEffect(() => {
        const restoreState = async () => {
            try {
                const savedFederationsStateJson = await AsyncStorage.getItem(
                    FEDERATIONS_PERSISTENCE_KEY,
                )

                const savedFederationsState = savedFederationsStateJson
                    ? JSON.parse(savedFederationsStateJson)
                    : null

                console.log('savedFederationsState', savedFederationsState)

                if (savedFederationsState === null) return

                const { selectedFederation, connectedFederations } =
                    savedFederationsState

                dispatch(changeSelectedFederation(selectedFederation))
                dispatch(updateConnectedFederations(connectedFederations))
            } catch (error) {
                console.error(error)
            }
        }

        restoreState()
    }, [])

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

function useBridge() {
    const { state } = useFederationsContext()
    const { selectedFederation } = state

    return {
        generateAddress: useCallback(() => {
            return _generateAddress(selectedFederation!.name)
        }, [selectedFederation]),
        generateEcash: useCallback(
            (amount: number) => {
                return _generateEcash(amount, selectedFederation!.name)
            },
            [selectedFederation],
        ),
        generateInvoice: useCallback(
            (amount: number, description: string) => {
                return _generateInvoice(
                    amount,
                    description,
                    selectedFederation!.name,
                )
            },
            [selectedFederation],
        ),
        listTransactions: useCallback(() => {
            return _listTransactions(selectedFederation!.name)
        }, [selectedFederation]),
        payInvoice: useCallback(
            (invoice: string) => {
                return _payInvoice(invoice, selectedFederation!.name)
            },
            [selectedFederation],
        ),
        payAddress: useCallback(
            (address: string, sats: number) => {
                return _payAddress(address, sats, selectedFederation!.name)
            },
            [selectedFederation],
        ),
        receiveEcash: useCallback(
            (ecash: string) => {
                return _receiveEcash(ecash, selectedFederation!.name)
            },
            [selectedFederation],
        ),
        validateEcash: useCallback(
            (ecash: string) => {
                return _validateEcash(ecash, selectedFederation!.name)
            },
            [selectedFederation],
        ),
    }
}

export { FederationsProvider, useFederationsContext, useBridge }
