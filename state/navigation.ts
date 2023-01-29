import { CommonActions } from '@react-navigation/native'
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
