import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Dimensions, ImageBackground, StyleSheet } from 'react-native'

import { Images } from '../../../assets/images'
import Flex from '../../ui/Flex'

// TODO: Render within wallet if social recovery is in progress
const SocialRecoveryProcessing: React.FC = () => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const style = styles(theme)

    return (
        <Flex grow center style={style.container}>
            <ImageBackground
                source={Images.HoloBackground}
                style={style.holoCircle}
                imageStyle={style.circleBorder}>
                <Text style={style.instructionsText}>{'75%'}</Text>
            </ImageBackground>
            <Text h2 h2Style={style.label}>
                {t('feature.backup.creating-recovery-file')}
            </Text>
        </Flex>
    )
}

const WINDOW_WIDTH = Dimensions.get('window').width
const CIRCLE_SIZE = WINDOW_WIDTH * 0.45

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            padding: theme.spacing.md,
        },
        label: {
            textAlign: 'center',
            marginVertical: theme.spacing.md,
            paddingHorizontal: theme.spacing.xl,
        },
        instructionsText: {
            textAlign: 'center',
            paddingHorizontal: theme.spacing.xl,
        },
        holoCircle: {
            height: CIRCLE_SIZE,
            width: CIRCLE_SIZE,
            alignItems: 'center',
            justifyContent: 'center',
        },
        circleBorder: {
            borderRadius: CIRCLE_SIZE * 0.5,
        },
    })

export default SocialRecoveryProcessing
