import { useNavigation } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import { Trans, useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'

import {
    removeAutojoinNoticeToDisplay,
    selectFederationByAutojoinCommunityId,
} from '@fedi/common/redux/federation'
import { Community } from '@fedi/common/types'
import { makeLog } from '@fedi/common/utils/log'

import { useAppDispatch, useAppSelector } from '../../../state/hooks'
import GradientView from '../../ui/GradientView'
import { PressableIcon } from '../../ui/PressableIcon'

const log = makeLog('AutojoinedCommunityNotice')

type Props = {
    communityId: Community['id']
}

const AutojoinedCommunityNotice = ({ communityId }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const navigation = useNavigation()
    const style = styles(theme)
    const federationWithAutojoinCommunity = useAppSelector(s =>
        selectFederationByAutojoinCommunityId(s, communityId || ''),
    )

    if (!federationWithAutojoinCommunity) return null

    return (
        <GradientView variant="sky-banner" style={style.content}>
            <Text caption style={style.textContainer}>
                <Trans
                    t={t}
                    i18nKey="feature.communities.autojoined-community-notice"
                    components={{
                        federationLink: (
                            <Text
                                caption
                                style={style.federationLink}
                                onPress={() => {
                                    navigation.navigate('FederationDetails', {
                                        federationId:
                                            federationWithAutojoinCommunity.id,
                                    })
                                }}
                            />
                        ),
                    }}
                />
            </Text>
            <PressableIcon
                svgName="Close"
                containerStyle={style.closeButton}
                onPress={() => {
                    log.info(
                        'dismissing autojoined community notice for',
                        communityId,
                    )
                    dispatch(
                        removeAutojoinNoticeToDisplay({
                            communityId,
                        }),
                    )
                }}
            />
        </GradientView>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        content: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
            paddingVertical: theme.spacing.lg,
            paddingHorizontal: theme.spacing.lg,
            borderRadius: theme.borders.defaultRadius,
        },
        federationLink: {
            color: theme.colors.link,
        },
        textContainer: {
            flex: 1,
        },
        closeButton: {
            flex: 0,
        },
    })

export default AutojoinedCommunityNotice
