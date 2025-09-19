import PinIcon from '@fedi/common/assets/svgs/pin.svg'

import { styled, theme } from '../../styles'
import { Icon } from '../Icon'
import { Text } from '../Text'

export default function PinnedMessage({
    pinnedMessage,
}: {
    pinnedMessage: string
}) {
    return (
        <PinnedMessageContainer>
            <Icon icon={PinIcon} />
            <Text variant="caption" css={{ flex: 1 }}>
                {pinnedMessage}
            </Text>
        </PinnedMessageContainer>
    )
}

const PinnedMessageContainer = styled('div', {
    background: `linear-gradient(-30deg, ${theme.colors.orange200}, ${theme.colors.blue200})`,
    display: 'flex',
    alignItems: 'center',
    padding: `12px 24px`,
    borderRadius: 16,
})
