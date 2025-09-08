import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import { Text } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { selectLoadedFederation } from '@fedi/common/redux'

import { useAppSelector } from '../../../state/hooks'
import { NavigationHook, RootStackParamList } from '../../../types/navigation'
import Header from '../../ui/Header'
import { PressableIcon } from '../../ui/PressableIcon'

type FederationDetailsRouteProp = RouteProp<
    RootStackParamList,
    'FederationDetails'
>

const FederationDetailsHeader: React.FC = () => {
    const { t } = useTranslation()
    const navigation = useNavigation<NavigationHook>()
    const route = useRoute<FederationDetailsRouteProp>()
    const { federationId } = route.params
    const federation = useAppSelector(s =>
        selectLoadedFederation(s, federationId),
    )

    return (
        <Header
            backButton
            headerCenter={
                <Text bold numberOfLines={1} adjustsFontSizeToFit>
                    {t('feature.federations.federation-details')}
                </Text>
            }
            headerRight={
                federation && (
                    <PressableIcon
                        svgName="Qr"
                        onPress={() =>
                            navigation.navigate('FederationInvite', {
                                inviteLink: federation.inviteCode,
                            })
                        }
                    />
                )
            }
        />
    )
}

export default FederationDetailsHeader
