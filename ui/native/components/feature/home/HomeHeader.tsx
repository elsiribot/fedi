import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet } from 'react-native'

import Header from '../../ui/Header'
import SvgImage from '../../ui/SvgImage'

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

    return (
        <Header
            headerLeft={
                <Text onPress={toggleOffline} h2 medium>
                    {t('words.home')}
                </Text>
            }
            headerRight={
                <Pressable
                    onPress={toggleOffline}
                    hitSlop={5}
                    style={styles(theme).iconContainer}>
                    <SvgImage
                        name="Offline"
                        color={theme.colors.primaryLight}
                        containerStyle={{
                            opacity: offline ? 1 : 0.2,
                        }}
                    />
                </Pressable>
            }
            rightContainerStyle={styles(theme).rightContainer}
            // Needed to make more room for Wallet title in headerLeft
            centerContainerStyle={{ flex: 1 }}
        />
    )
}

const styles = (_theme: Theme) =>
    StyleSheet.create({
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
