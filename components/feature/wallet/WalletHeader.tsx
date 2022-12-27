import { Icon, Image, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'

import { useNavigation } from '@react-navigation/native'
import { Images } from '../../../assets/images'
import Header from '../../ui/Header'

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
                <View style={styles(theme).iconsContainer}>
                    <Image
                        source={Images.Offline}
                        style={[
                            styles(theme).offlineIcon,
                            offline ? { opacity: 1 } : { opacity: 0.1 },
                        ]}
                        onPress={toggleOffline}
                    />
                    <Pressable
                        onPress={() => navigation.navigate('Transactions')}>
                        <Icon name={'format-list-bulleted'} />
                    </Pressable>
                </View>
            }
            rightContainerStyle={styles(theme).rightContainer}
        />
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        offlineIcon: {
            height: theme.sizes.sm,
            width: theme.sizes.sm,
            color: theme.colors.grey,
            marginRight: theme.spacing.xl,
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
