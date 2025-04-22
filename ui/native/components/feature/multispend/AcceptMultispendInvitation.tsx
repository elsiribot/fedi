import { useNavigation } from '@react-navigation/native'
import { Button, Theme, useTheme } from '@rneui/themed'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { useToast } from '@fedi/common/hooks/toast'
import {
    matrixApproveMultispendInvitation,
    selectWalletFederations,
} from '@fedi/common/redux'

import { fedimint } from '../../../bridge'
import { useAppDispatch, useAppSelector } from '../../../state/hooks'
import { MultispendActiveInvitation } from '../../../types'
import CustomOverlay from '../../ui/CustomOverlay'

const AcceptMultispendInvitation: React.FC<{
    roomId: string
    multispendStatus: MultispendActiveInvitation
}> = ({ roomId, multispendStatus }) => {
    const [loading, setLoading] = useState(false)
    const [needsToJoin, setNeedsToJoin] = useState(false)
    const dispatch = useAppDispatch()
    const { t } = useTranslation()
    const toast = useToast()
    const walletFederations = useAppSelector(selectWalletFederations)
    const { theme } = useTheme()
    const navigation = useNavigation()

    const handleSubmit = useCallback(async () => {
        setLoading(true)

        try {
            if (
                !walletFederations.some(
                    f => f.id === multispendStatus.state.federationId,
                )
            ) {
                setNeedsToJoin(true)
            } else {
                await dispatch(
                    matrixApproveMultispendInvitation({ fedimint, roomId }),
                ).unwrap()
            }
        } catch (e) {
            toast.error(t, e)
        } finally {
            setLoading(false)
        }
    }, [t, roomId, toast, dispatch, multispendStatus, walletFederations])

    const onDismiss = useCallback(() => {
        setLoading(false)
        setNeedsToJoin(false)
    }, [])

    const style = styles(theme)

    return (
        <View style={style.container}>
            <Button disabled={loading} onPress={handleSubmit}>
                Accept
            </Button>
            <CustomOverlay
                show={needsToJoin}
                contents={{
                    title: t('feature.multispend.join-federation', {
                        federation:
                            multispendStatus.state.invitation.federationName,
                    }),
                    description: t(
                        'feature.multispend.join-federation-notice',
                        {
                            federation:
                                multispendStatus.state.invitation
                                    .federationName,
                        },
                    ),
                    buttons: [
                        { text: t('words.cancel'), onPress: onDismiss },
                        {
                            text: t('words.join'),
                            onPress: () => {
                                onDismiss()
                                navigation.navigate('JoinFederation', {
                                    invite: multispendStatus.state.invitation
                                        .federationInviteCode,
                                })
                            },
                            primary: true,
                        },
                    ],
                }}
            />
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            gap: theme.spacing.md,
            paddingHorizontal: theme.spacing.md,
        },
        recoveryIndicator: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: 64,
            width: '100%',
        },
        recoverySpinner: {
            width: 64,
            height: 64,
        },
    })

export default AcceptMultispendInvitation
