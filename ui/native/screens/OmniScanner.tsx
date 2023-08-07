import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { OmniInput } from '../components/feature/omni/OmniInput'
import { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'OmniScanner'>

const OmniScanner: React.FC<Props> = () => {
    const { theme } = useTheme()
    const style = styles(theme)
    return (
        <SafeAreaView
            edges={['bottom', 'left', 'right']}
            style={style.container}>
            <OmniInput
                expectedInputTypes={[]}
                onExpectedInput={() => null}
                onUnexpectedSuccess={() => null}
            />
        </SafeAreaView>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            padding: theme.spacing.lg,
        },
    })

export default OmniScanner
