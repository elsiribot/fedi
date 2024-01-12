import { useTranslation } from 'react-i18next'

import { styled, theme } from '../styles'
import { CircularLoader } from './CircularLoader'
import { Text } from './Text'

const Indicator = styled('div', {
    backgroundColor: theme.colors.blue100,
    color: theme.colors.primary,
    padding: '$xs $sm',
    borderRadius: theme.space.md,
    display: 'flex',
    gap: theme.space.sm,
    alignItems: 'center',
    justifyContent: 'center',
})

export const ChatOfflineIndicator = () => {
    const { t } = useTranslation()

    return (
        <Indicator>
            <CircularLoader size={16} />
            <Text variant="small">{t('feature.chat.waiting-for-network')}</Text>
        </Indicator>
    )
}
