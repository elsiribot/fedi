import { Trans, useTranslation } from 'react-i18next'

import clockIcon from '@fedi/common/assets/svgs/clock.svg'
import { usePopupFederationInfo } from '@fedi/common/hooks/federation'
import { LoadedFederation } from '@fedi/common/types'

import { styled, theme } from '../../styles'
import { Icon } from '../Icon'
import { Text } from '../Text'

export default function FederationEndIndicator({
    federation,
}: {
    federation: LoadedFederation
}) {
    const { t } = useTranslation()
    const popupInfo = usePopupFederationInfo(federation?.meta || {})

    if (!popupInfo) return null

    if (popupInfo.ended) {
        return (
            <FederationEndCard variant="ended">
                <Text variant="caption">
                    {popupInfo.endedMessage || (
                        <Trans
                            t={t}
                            i18nKey="feature.popup.ended-description"
                            values={{ date: popupInfo?.endsAtText }}
                            components={{
                                bold: <strong />,
                            }}
                        />
                    )}
                </Text>
            </FederationEndCard>
        )
    }

    return (
        <FederationEndCard>
            <FederationEndingLabel>
                <Icon icon={clockIcon} size={16} />
                <Text variant="caption">
                    {t('feature.federations.federation-ends-in')}
                </Text>
            </FederationEndingLabel>
            <Text variant="h2" weight="medium">
                {popupInfo.endsInText}
            </Text>
        </FederationEndCard>
    )
}

const FederationEndCard = styled('div', {
    display: 'flex',
    alignItems: 'center',
    padding: `${theme.spacing.md}px ${theme.spacing.lg}px`,
    borderRadius: 16,

    variants: {
        variant: {
            ended: {
                backgroundColor: theme.colors.extraLightGrey,
            },
            default: {
                background: `linear-gradient(-30deg, ${theme.colors.orange200}, ${theme.colors.blue200})`,
            },
        },
    },

    defaultVariants: {
        variant: 'default',
    },
})

const FederationEndingLabel = styled('div', {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
})
