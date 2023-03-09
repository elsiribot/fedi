import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'

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
                <View style={styles(theme).iconsContainer}>
                    <Pressable
                        onPress={toggleOffline}
                        hitSlop={5}
                        style={{
                            marginRight: theme.spacing.sm,
                        }}>
                        <SvgImage
                            name="Offline"
                            containerStyle={{
                                opacity: offline ? 1 : 0.2,
                            }}
                            svgProps={{
                                stroke: theme.colors.primaryLight,
                            }}
                        />
                    </Pressable>
                </View>
            }
            rightContainerStyle={styles(theme).rightContainer}
            // Needed to make more room for Wallet title in headerLeft
            centerContainerStyle={{ flex: 1 }}
        />
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        offlineIcon: {
            height: theme.sizes.sm,
            width: theme.sizes.sm,
            color: theme.colors.grey,
            resizeMode: 'contain',
        },
        iconsContainer: {
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
