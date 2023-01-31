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

export function resetAfterGroupNameUpdate(group: Group) {
    return {
        ...CommonActions.reset({
            index: 2,
            routes: [
                { name: 'Home', params: { screen: 'Community' } },
                { name: 'GroupChat', params: { group } },
                {
                    name: 'GroupAdmin',
                    params: { group },
                },
            ],
        }),
    }
}
