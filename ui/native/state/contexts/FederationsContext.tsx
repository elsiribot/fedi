import AsyncStorage from '@react-native-async-storage/async-storage'
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useReducer,
} from 'react'

import {
    selectActiveFederation,
    selectAuthenticatedMember,
    updateFederation,
} from '@fedi/common/redux'

import { BridgeEventEmitter, FederationEvent } from '../../bridge'
import {
    ACTIVE_FEDERATION_ID_DB_KEY,
    AUTHENTICATED_GUARDIAN_DB_KEY,
} from '../../constants'
import { useAppDispatch, useAppSelector } from '../hooks'

// Define the structure of this Context and its initial state
interface FederationsContextState {
    selectedFederationId: string | null
}

const initialState: FederationsContextState = {
    selectedFederationId: null,
}
type AppState = typeof initialState

// Define actions that can change the state within this Context
enum ActionType {
    RESET_FEDERATIONS_STATE = 'RESET_FEDERATIONS_STATE',
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

// Implement the reducer with actions and state changes
export function reducer(state: AppState, action: Action): AppState {
    switch (action.type) {
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

    const reduxDispatch = useAppDispatch()
    const activeFederationId = useAppSelector(
        s => s.federation.activeFederationId,
    )
    const activeFederation = useAppSelector(selectActiveFederation)
    const authenticatedMember = useAppSelector(selectAuthenticatedMember)
    const authenticatedGuardian = useAppSelector(
        s => s.federation.authenticatedGuardian,
    )

    // useMemo makes sure the Provider only re-renders when
    // there is a state change
    const providerValue = useMemo(
        () => ({ state, dispatch }),
        [state, dispatch],
    )

    useEffect(() => {
        const emitter = new BridgeEventEmitter()
        const onFederationUpdate = (event: FederationEvent) => {
            // Prevents a state update on the off-chance we get an event
            // before the activeFederationId state is initialized
            if (activeFederationId == null) return
            reduxDispatch(updateFederation(event))
        }
        const federationListener =
            emitter.onFederationUpdate(onFederationUpdate)
        return () => federationListener.remove()
    }, [activeFederationId, reduxDispatch])

    // Persist currently active federation
    useEffect(() => {
        if (activeFederation) {
            AsyncStorage.setItem(
                ACTIVE_FEDERATION_ID_DB_KEY,
                JSON.stringify({
                    activeFederation: {
                        id: activeFederation.id,
                        username: authenticatedMember?.username,
                    },
                }),
            )
        }
    }, [activeFederation, authenticatedMember?.username])

    // Persist authenticatedGuardian state
    useEffect(() => {
        console.info('useEffect authenticatedGuardian', authenticatedGuardian)
        if (authenticatedGuardian != null) {
            console.info('saving guardian', authenticatedGuardian.name)
            AsyncStorage.setItem(
                AUTHENTICATED_GUARDIAN_DB_KEY,
                JSON.stringify({
                    authenticatedGuardian: authenticatedGuardian,
                }),
            )
        }
    }, [authenticatedGuardian])

    return (
        <FederationsContext.Provider value={{ ...providerValue }} {...props} />
    )
}

function useFederationsContext() {
    return useContext(FederationsContext)
}

export { FederationsProvider, useFederationsContext }
