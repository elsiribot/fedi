import { Icon, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'

import { useNavigation } from '@react-navigation/native'
import Header from '../../ui/Header'
import SvgImage from '../../ui/SvgImage'

type WalletHeaderProps = {
    toggleOffline?: () => void
    offline: boolean
}

const WalletHeader: React.FC<WalletHeaderProps> = ({
    toggleOffline,
    offline = false,
}: WalletHeaderProps) => {
    const { theme } = useTheme()
    const navigation = useNavigation()
    const { t } = useTranslation()

    return (
        <Header
            headerLeft={
                <Text onPress={toggleOffline} h2 medium>
                    {t('words.wallet')}
                </Text>
            }
            headerRight={
                <View style={styles(theme).iconsContainer}>
                    <Pressable
                        onPress={toggleOffline}
                        style={{
                            padding: theme.spacing.sm,
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
                        {/* <Image
                            source={Images.Offline}
                            style={[
                                styles(theme).offlineIcon,
                                offline ? { opacity: 1 } : { opacity: 0.1 },
                            ]}
                        /> */}
                    </Pressable>
                    <Pressable
                        onPress={() => navigation.navigate('Transactions')}
                        style={{
                            padding: theme.spacing.sm,
                        }}>
                        <Icon name={'format-list-bulleted'} />
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

export default WalletHeader
