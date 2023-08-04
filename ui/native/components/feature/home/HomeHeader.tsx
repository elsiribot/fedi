import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet } from 'react-native'

import { selectFederationMetadata } from '@fedi/common/redux'
import { shouldShowOfflineWallet } from '@fedi/common/utils/FederationUtils'

import { useAppSelector } from '../../../state/hooks'
import Header from '../../ui/Header'
import SvgImage from '../../ui/SvgImage'
import SelectedFederationHeader from '../federations/SelectedFederationHeader'

type HomeHeaderProps = {
    toggleOffline?: () => void
    offline: boolean
}

const HomeHeader: React.FC<HomeHeaderProps> = ({
    toggleOffline,
    offline = false,
}: HomeHeaderProps) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const activeFederationMetadata = useAppSelector(selectFederationMetadata)

    const showOfflineWallet =
        activeFederationMetadata &&
        shouldShowOfflineWallet(activeFederationMetadata)

    const style = styles(theme)

    return (
        <>
            <SelectedFederationHeader />
            <Header
                inline
                containerStyle={style.container}
                headerLeft={
                    <Text
                        onPress={showOfflineWallet ? toggleOffline : () => {}}
                        h2
                        medium>
                        {t('words.home')}
                    </Text>
                }
                headerRight={
                    showOfflineWallet && (
                        <Pressable
                            onPress={toggleOffline}
                            hitSlop={5}
                            style={style.iconContainer}>
                            <SvgImage
                                name="Offline"
                                color={theme.colors.primaryLight}
                                containerStyle={{
                                    opacity: offline ? 1 : 0.2,
                                }}
                            />
                        </Pressable>
                    )
                }
                rightContainerStyle={style.rightContainer}
                // Needed to make more room for Wallet title in headerLeft
                centerContainerStyle={{ flex: 1 }}
            />
        </>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            paddingBottom: theme.spacing.lg,
        },
        iconContainer: {
            flexDirection: 'row',
            alignItems: 'flex-end',
        },
        rightContainer: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
        },
    })

export default HomeHeader
