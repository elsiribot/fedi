import React from 'react'
import { useTranslation } from 'react-i18next'

import FediIcon from '@fedi/common/assets/svgs/fedi-logo-icon.svg'
import { selectFedimintVersion } from '@fedi/common/redux/environment'

import { useAppSelector } from '../hooks'
import { styled, theme } from '../styles'
import { Text } from './Text'

export const VersionContainer = () => {
    const { t } = useTranslation()
    const fedimintVersion = useAppSelector(selectFedimintVersion)

    return (
        <Menu>
            <FediIcon width={24} />

            <Text variant="small" css={{ color: theme.colors.darkGrey }}>
                {t('phrases.fedimint-version', {
                    version: fedimintVersion,
                })}
            </Text>
        </Menu>
    )
}

const Menu = styled('div', {
    alignItems: 'center',
    backgroundColor: theme.colors.offWhite100,
    borderRadius: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    paddingBottom: 12,
    paddingTop: 12,
})
