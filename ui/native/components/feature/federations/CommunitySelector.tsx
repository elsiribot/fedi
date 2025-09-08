import { Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { Pressable, StyleSheet } from 'react-native'

import { selectLastSelectedCommunity } from '@fedi/common/redux'

import { useAppSelector } from '../../../state/hooks'
import HoloGradient from '../../ui/HoloGradient'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'
import CommunitiesOverlay from './CommunitiesOverlay'
import { FederationLogo } from './FederationLogo'

const CommunitySelector: React.FC = () => {
    const { theme } = useTheme()
    const selectedCommunity = useAppSelector(selectLastSelectedCommunity)
    const [showCommunities, setShowCommunities] = useState(false)

    const style = styles(theme)

    const openCommunitiesOverlay = () => {
        setShowCommunities(true)
    }

    if (!selectedCommunity) return <></>

    return (
        <>
            <HoloGradient
                level="900"
                style={style.gradientContainer}
                gradientStyle={style.gradient}>
                <Pressable
                    testID={selectedCommunity.name
                        .concat('SelectorButton')
                        .replaceAll(' ', '')}
                    style={style.container}
                    onPress={openCommunitiesOverlay}>
                    <FederationLogo
                        federation={selectedCommunity}
                        size={24}
                        hex
                    />
                    <SvgImage
                        name="ChevronDown"
                        size={SvgImageSize.sm}
                        color={theme.colors.primary}
                    />
                </Pressable>
            </HoloGradient>
            <CommunitiesOverlay
                open={showCommunities}
                onOpenChange={setShowCommunities}
            />
        </>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        gradientContainer: {
            borderRadius: 50,
            ...theme.styles.subtleShadow,
        },
        gradient: {
            padding: theme.spacing.xxs,
            borderRadius: 50,
            alignSelf: 'center',
        },
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: 'center',
            paddingVertical: theme.spacing.xs,
            paddingHorizontal: theme.spacing.md,
            gap: theme.spacing.sm,
            borderRadius: 50,
            backgroundColor: theme.colors.white,
        },
        federationName: {
            flexGrow: 1,
            maxWidth: '85%',
        },
    })

export default CommunitySelector
