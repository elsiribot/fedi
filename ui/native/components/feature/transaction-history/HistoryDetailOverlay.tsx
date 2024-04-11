import { Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'

import { ErrorBoundary } from '@fedi/common/components/ErrorBoundary'

import CenterOverlay from '../../ui/CenterOverlay'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'
import { HistoryDetail, HistoryDetailProps } from './HistoryDetail'

type HistoryDetailOverlayProps = {
    show: boolean
    itemDetails?: HistoryDetailProps
}

const HistoryDetailOverlay: React.FC<HistoryDetailOverlayProps> = ({
    show,
    itemDetails,
}) => {
    if (!itemDetails) return <></>
    const { theme } = useTheme()
    const { t } = useTranslation()

    const style = styles(theme)

    return (
        <CenterOverlay
            show={show}
            onBackdropPress={itemDetails.onClose}
            overlayStyle={style.overlayStyle}>
            <ErrorBoundary
                fallback={
                    <View style={style.overlayErrorContainer}>
                        <SvgImage
                            name="Error"
                            color={theme.colors.red}
                            size={SvgImageSize.lg}
                        />
                        <Text style={style.overlayErrorText}>
                            {t('errors.history-render-error')}
                        </Text>
                    </View>
                }>
                <HistoryDetail {...itemDetails} />
            </ErrorBoundary>
        </CenterOverlay>
    )
}

export default HistoryDetailOverlay

const styles = (theme: Theme) =>
    StyleSheet.create({
        overlayStyle: {
            maxWidth: 340,
            alignItems: 'stretch',
        },
        overlayErrorContainer: {
            paddingVertical: theme.spacing.xl,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
        },
        overlayErrorText: {
            marginTop: theme.spacing.lg,
            textAlign: 'center',
        },
    })
