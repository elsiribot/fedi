import AsyncStorage from '@react-native-async-storage/async-storage'
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useReducer,
} from 'react'

import {
    addressOrInvoice,
    approveSocialRecoveryRequest,
    authenticateGuardian,
    backupQr,
    BalanceEvent,
    denySocialRecoveryRequest,
    Federation,
    generateAddress,
    generateEcash,
    generateInvoice,
    generateMnemonic,
    LightningGateway,
    listGateways,
    listTransactions,
    lnurlSignMessage,
    locateRecoveryFile,
    payAddress,
    payInvoice,
    receiveEcash,
    recoverFromMnemonic,
    switchGateway,
    TFedimintEventEmitter,
    updateTransactionNotes,
    uploadBackupFile,
    validateBackupFile,
    validateEcash,
} from '../bridge'
import { FEDERATIONS_PERSISTENCE_KEY } from '../constants'
import { MSats, Sats } from '../types'
import lnurlUtils from '../utils/LNURLUtils'

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
        case ActionType.UPDATE_FEDERATION_BALANCE:
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

function useBridge() {
    const { state } = useFederationsContext()
    const { selectedFederation } = state

    return {
        addressOrInvoice: useCallback(
            (input: string) => {
                return addressOrInvoice(input, selectedFederation!.name)
            },
            [selectedFederation],
        ),
        approveSocialRecoveryRequest: useCallback(
            (userPublicKey: string) => {
                return approveSocialRecoveryRequest(
                    userPublicKey,
                    selectedFederation!.name,
                )
            },
            [selectedFederation],
        ),
        authenticateGuardian: useCallback(
            (secret: string) => {
                return authenticateGuardian(secret, selectedFederation!.name)
            },
            [selectedFederation],
        ),
        backupQr: useCallback(() => {
            return backupQr(selectedFederation!.name)
        }, [selectedFederation]),
        generateAddress: useCallback(() => {
            return generateAddress(selectedFederation!.name)
        }, [selectedFederation]),
        generateEcash: useCallback(
            (amount: MSats) => {
                return generateEcash(amount, selectedFederation!.name)
            },
            [selectedFederation],
        ),
        generateInvoice: useCallback(
            (amount: MSats, description: string) => {
                return generateInvoice(
                    amount,
                    description,
                    selectedFederation!.name,
                )
            },
            [selectedFederation],
        ),
        generateMnemonic: useCallback(() => {
            return generateMnemonic(selectedFederation!.name)
        }, [selectedFederation]),
        listTransactions: useCallback(() => {
            return listTransactions(selectedFederation!.name)
        }, [selectedFederation]),
        lnurlSignMessage: useCallback(
            (url: string) => {
                return lnurlSignMessage(url, selectedFederation!.name)
            },
            [selectedFederation],
        ),
        lnurlGetToken: useCallback(
            (lnurl: string) => {
                return lnurlUtils.getToken(lnurl, selectedFederation!.name)
            },
            [selectedFederation],
        ),
        updateTransactionNotes: useCallback(
            (transactionId: string, notes: string) => {
                return updateTransactionNotes(
                    transactionId,
                    notes,
                    selectedFederation!.name,
                )
            },
            [selectedFederation],
        ),
        listGateways: useCallback(() => {
            return listGateways(selectedFederation!.name)
        }, [selectedFederation]),
        switchGateway: useCallback(
            (gateway: LightningGateway) => {
                return switchGateway(gateway, selectedFederation!.name)
            },
            [selectedFederation],
        ),
        locateRecoveryFile: useCallback(() => {
            return locateRecoveryFile(selectedFederation!.name)
        }, [selectedFederation]),
        payInvoice: useCallback(
            (invoice: string) => {
                return payInvoice(invoice, selectedFederation!.name)
            },
            [selectedFederation],
        ),
        payAddress: useCallback(
            (address: string, sats: Sats) => {
                return payAddress(address, sats, selectedFederation!.name)
            },
            [selectedFederation],
        ),
        receiveEcash: useCallback(
            (ecash: string) => {
                return receiveEcash(ecash, selectedFederation!.name)
            },
            [selectedFederation],
        ),
        recoverFromMnemonic: useCallback(
            (mnemonic: string[]) => {
                return recoverFromMnemonic(mnemonic, selectedFederation!.name)
            },
            [selectedFederation],
        ),
        denySocialRecoveryRequest: useCallback(
            (userPublicKey: string) => {
                return denySocialRecoveryRequest(
                    userPublicKey,
                    selectedFederation!.name,
                )
            },
            [selectedFederation],
        ),
        validateBackupFile: useCallback(
            (file: string) => {
                return validateBackupFile(file, selectedFederation!.name)
            },
            [selectedFederation],
        ),
        validateEcash: useCallback(
            (ecash: string) => {
                return validateEcash(ecash, selectedFederation!.name)
            },
            [selectedFederation],
        ),
        uploadBackupFile: useCallback(
            (videoFilePath: string) => {
                return uploadBackupFile(videoFilePath, selectedFederation!.name)
            },
            [selectedFederation],
        ),
    }
}

export { FederationsProvider, useFederationsContext, useBridge }
