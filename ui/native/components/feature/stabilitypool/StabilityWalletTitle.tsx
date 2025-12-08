import { Text, Theme, useTheme } from '@rneui/themed'
import toUpper from 'lodash/toUpper'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'

import { selectStabilityPoolVersion } from '@fedi/common/redux'
import { LoadedFederation, SupportedCurrency } from '@fedi/common/types'
import { isDev } from '@fedi/common/utils/environment'

import { useAppSelector } from '../../../state/hooks'
import { Row } from '../../ui/Flex'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'

type Props = {
    federation?: LoadedFederation
    bold?: boolean
    bolder?: boolean
    showUsd?: boolean
    small?: boolean
}

const StabilityWalletTitle: React.FC<Props> = ({
    federation,
    bold = false,
    bolder = false,
    small = false,
    showUsd = true,
}) => {
    const { t } = useTranslation()
    const { theme } = useTheme()

    const style = styles(theme)

    const version = useAppSelector(s =>
        federation ? selectStabilityPoolVersion(s, federation.id) : undefined,
    )

    return (
        <Row align="center" justify="start" gap="sm">
            <SvgImage
                name="UsdCircleFilled"
                size={SvgImageSize.sm}
                color={theme.colors.mint}
            />
            <Row align="center" shrink style={style.labelRow}>
                <Text
                    medium={!bold && !small}
                    caption={small}
                    bold={bold}
                    bolder={bolder}
                    style={style.title}
                    adjustsFontSizeToFit
                    minimumFontScale={0.5}
                    numberOfLines={1}>
                    {`${showUsd ? `${toUpper(SupportedCurrency.USD)} ` : ''}${t(
                        'feature.stabilitypool.stable-balance',
                        // Helpful for dev testing to easily distinguish spv1 from spv2 federations
                    )}${isDev() && version ? (version === 1 ? ' (SPV1)' : ' (SPV2)') : ''}`}
                </Text>
            </Row>
        </Row>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        labelRow: {
            minWidth: 0,
        },
        title: {
            color: theme.colors.primary,
            flexShrink: 1,
        },
        chevron: {
            marginLeft: theme.spacing.md,
            top: 1,
        },
        chevronDimensions: {
            width: 6,
            height: 12,
        },
    })

export default StabilityWalletTitle
