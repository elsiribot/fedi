import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { StyleSheet, View } from 'react-native'

import { OmniInput } from '../components/feature/omni/OmniInput'
import { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'OmniScanner'>

const OmniScanner: React.FC<Props> = () => {
    const style = styles()
    return (
        <View style={style.container}>
            <OmniInput
                expectedInputTypes={[]}
                onExpectedInput={() => null}
                onUnexpectedSuccess={() => null}
            />
        </View>
    )
}

const styles = () =>
    StyleSheet.create({
        container: {
            flex: 1,
            width: '100%',
        },
    })

export default OmniScanner
