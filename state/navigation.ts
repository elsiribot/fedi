import { CommonActions } from '@react-navigation/native'
import { Group } from '../types'
import { RootStackParamList } from '../types/navigation'

export function reset(
    screenName: keyof RootStackParamList,
    params?: RootStackParamList[keyof RootStackParamList],
) {
    return CommonActions.reset({
        index: 0,
        routes: [{ name: screenName, params }],
    })
}

export function resetAfterPersonalRecovery() {
    return {
        ...CommonActions.reset({
            index: 0,
            routes: [{ name: 'PersonalRecoverySuccess' }],
        }),
    }
}

export function resetAfterFailedSocialRecovery() {
    return {
        ...CommonActions.reset({
            index: 0,
            routes: [{ name: 'SocialRecoveryFailure' }],
        }),
    }
}

export function resetAfterSocialRecovery() {
    return {
        ...CommonActions.reset({
            index: 0,
            routes: [{ name: 'SocialRecoverySuccess' }],
        }),
    }
}

export function resetAfterGroupNameUpdate(group: Group) {
    return {
        ...CommonActions.reset({
            index: 2,
            routes: [
                { name: 'TabsNavigator', params: { screen: 'Chat' } },
                { name: 'GroupChat', params: { group } },
                {
                    name: 'GroupAdmin',
                    params: { group },
                },
            ],
        }),
    }
}
