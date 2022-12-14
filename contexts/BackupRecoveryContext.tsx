import React, { createContext, useReducer, useContext, useMemo } from 'react'

// Define the structure of this Context and its initial state
interface BackupRecoveryContextState {
    recoveryFileCreated: boolean
    recoveryFileConfirmed: boolean
    socialBackupsCompleted: number
}
const initialState: BackupRecoveryContextState = {
    recoveryFileCreated: false,
    recoveryFileConfirmed: false,
    socialBackupsCompleted: 0,
}
type AppState = typeof initialState

// Define actions that can change the state within this Context
enum ActionType {
    CHANGE_SOCIAL_BACKUPS_COMPLETED = 'CHANGE_SOCIAL_BACKUPS_COMPLETED',
    SET_RECOVERY_FILE_CREATED = 'SET_RECOVERY_FILE_CREATED',
    RESET_BACKUP_RECOVERY_STATE = 'RESET_BACKUP_RECOVERY_STATE',
}
interface Action {
    type: ActionType
    payload?: any
}

// Wrap with state and dispatch fields and create the Context
type BaseContext = {
    state: BackupRecoveryContextState
    dispatch: React.Dispatch<Action>
}
export const BackupRecoveryContext = createContext({} as BaseContext)

// Export action creators as convenience functions to trigger state changes
export function changeSocialBackupsCompleted(count: number): Action {
    return {
        type: ActionType.CHANGE_SOCIAL_BACKUPS_COMPLETED,
        payload: count,
    }
}
// export function completeFirstSocialBackup(): Action {
//     return {
//         type: ActionType.CHANGE_SOCIAL_BACKUPS_COMPLETED,
//         payload: 1,
//     }
// }
// export function completeSecondSocialBackup(): Action {
//     return {
//         type: ActionType.CHANGE_SOCIAL_BACKUPS_COMPLETED,
//         payload: 2,
//     }
// }
export function setRecoveryFileCreated(created: boolean): Action {
    return {
        type: ActionType.SET_RECOVERY_FILE_CREATED,
        payload: created,
    }
}
export function resetBackupRecoveryState(): Action {
    return {
        type: ActionType.RESET_BACKUP_RECOVERY_STATE,
    }
}

// Implement the reducer with actions and state changes
export function reducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case ActionType.CHANGE_SOCIAL_BACKUPS_COMPLETED:
            return {
                ...state,
                socialBackupsCompleted: action.payload,
            }
        case ActionType.SET_RECOVERY_FILE_CREATED:
            return {
                ...state,
                recoveryFileCreated: action.payload,
            }
        case ActionType.RESET_BACKUP_RECOVERY_STATE:
            return { ...initialState }
        default:
            return state
    }
}

function BackupRecoveryProvider(props: React.PropsWithChildren<{}>) {
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

    return <BackupRecoveryContext.Provider value={providerValue} {...props} />
}

function useBackupRecoveryContext() {
    return useContext(BackupRecoveryContext)
}

export { BackupRecoveryProvider, useBackupRecoveryContext }
