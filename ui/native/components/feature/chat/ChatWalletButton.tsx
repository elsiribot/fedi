import { useNavigation } from '@react-navigation/native'
import { useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable } from 'react-native'

import { selectChatMember } from '@fedi/common/redux'

import { useEnvironmentContext } from '../../../state/contexts/EnvironmentContext'
import { useAppSelector } from '../../../state/hooks'
import { NavigationHook } from '../../../types/navigation'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'

type ChatWalletButtonProps = {
    memberId: string
}

const ChatWalletButton: React.FC<ChatWalletButtonProps> = ({
    memberId,
}: ChatWalletButtonProps) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const { toast } = useEnvironmentContext().state
    const member = useAppSelector(s => selectChatMember(s, memberId))

    return (
        <Pressable
            onPress={() => {
                if (!member) {
                    toast?.show(t('errors.chat-member-not-found'), 4000)
                    return
                }
                navigation.navigate('ChatWallet', {
                    recipientId: memberId,
                })
            }}>
            <SvgImage
                name="Wallet"
                containerStyle={{
                    marginRight: theme.spacing.md,
                    marginBottom: theme.spacing.sm,
                }}
                size={SvgImageSize.md}
                color={
                    member
                        ? theme.colors.primary
                        : theme.colors.primaryVeryLight
                }
            />
        </Pressable>
    )
}

export default ChatWalletButton
