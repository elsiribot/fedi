import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Icon, Image, Text, Theme, useTheme } from '@rneui/themed'
import { useTranslation } from 'react-i18next'

import Header from '../../ui/Header'
import { useNavigation } from '@react-navigation/native'
import { Images } from '../../../assets/images'

type SocialBackupHeaderProps = {
    toggleOffline?: () => void
    offline: boolean
}

const WalletHeader: React.FC<SocialBackupHeaderProps> = ({
    toggleOffline,
    offline = false,
}: SocialBackupHeaderProps) => {
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
                <View style={styles(theme).rightContainer}>
                    {offline && (
                        <Image
                            source={Images.Offline}
                            style={styles(theme).image}
                        />
                    )}
                    <Pressable
                        style={styles(theme).iconContainer}
                        onPress={() => navigation.navigate('Transactions')}>
                        <Icon name={'format-list-bulleted'} />
                    </Pressable>
                </View>
            }
        />
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        image: {
            height: theme.sizes.md,
            width: theme.sizes.md,
            color: theme.colors.grey,
            marginRight: theme.spacing.xl,
            resizeMode: 'contain',
        },
        rightContainer: {
            flexDirection: 'row',
            alignItems: 'flex-end',
        },
        iconContainer: {
            // paddingHorizontal: theme.spacing.xs,
        },
    })

export default WalletHeader
