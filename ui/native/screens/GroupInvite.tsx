import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { selectChatGroup } from '@fedi/common/redux'
import { encodeGroupInvitationLink } from '@fedi/common/utils/xmpp'

import QRScreen from '../components/ui/QRScreen'
import { useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'GroupInvite'>

// TODO: Reimplement with Matrix rooms knocking feature
const GroupInvite: React.FC<Props> = ({ route }: Props) => {
    const { t } = useTranslation()
    const { groupId } = route.params
    const group = useAppSelector(s => selectChatGroup(s, groupId))
    const groupInvitationLink = encodeGroupInvitationLink(groupId)

    return (
        <QRScreen
            title={group?.name}
            qrValue={groupInvitationLink}
            copyMessage={t('feature.chat.copied-group-invite-code')}
        />
    )
}

export default GroupInvite
