import React from 'react'

type Props = {
    groupId: string
}

// TODO: Reimplement with Matrix rooms knocking feature
const EmbeddedJoinGroupButton: React.FC<Props> = ({ groupId }: Props) => {
    return <>{groupId}</>

    // const navigation = useNavigation<NavigationHook>()
    // const dispatch = useAppDispatch()
    // const federationId = useAppSelector(selectActiveFederationId)
    // const xmppClient = useAppSelector(selectChatXmppClient)
    // const toast = useToast()
    // const { t } = useTranslation()
    // const { theme } = useTheme()
    // const [groupConfig, setGroupConfig] =
    //     useState<Pick<ChatGroup, 'name' | 'broadcastOnly'>>()
    // const [isJoiningGroup, setIsJoiningGroup] = useState(false)

    // const copyToClipboard = () => {
    //     const invitationLink = encodeGroupInvitationLink(groupId)
    //     Clipboard.setString(invitationLink as string)
    //     toast.show({
    //         content: t('feature.chat.copied-group-invite-code'),
    //         status: 'success',
    //     })
    // }

    // const handleJoinGroup = useCallback(async () => {
    //     if (!federationId) return
    //     setIsJoiningGroup(true)
    //     try {
    //         const res = await dispatch(
    //             joinChatGroup({
    //                 federationId,
    //                 link: encodeGroupInvitationLink(groupId),
    //             }),
    //         ).unwrap()
    //         navigation.replace('GroupChat', {
    //             groupId: res.id,
    //         })
    //     } catch (error) {
    //         toast.show({
    //             content: t('errors.chat-unavailable'),
    //             status: 'error',
    //         })
    //     }
    //     setIsJoiningGroup(false)
    // }, [dispatch, federationId, groupId, navigation, t, toast])

    // useEffect(() => {
    //     if (!xmppClient || !groupId) return
    //     const refreshGroupConfig = async () => {
    //         const config = await xmppClient.fetchGroupConfig(groupId)
    //         setGroupConfig(config)
    //     }
    //     refreshGroupConfig()
    // }, [groupId, xmppClient])

    // if (!groupConfig) return null

    // return (
    //     <Button
    //         size="sm"
    //         color={theme.colors.secondary}
    //         containerStyle={styles(theme).container}
    //         onPress={handleJoinGroup}
    //         onLongPress={copyToClipboard}
    //         loading={isJoiningGroup}
    //         title={
    //             <View style={styles(theme).contents}>
    //                 <SvgImage
    //                     containerStyle={styles(theme).icon}
    //                     name={
    //                         groupConfig.broadcastOnly
    //                             ? 'SpeakerPhone'
    //                             : 'SocialPeople'
    //                     }
    //                     size={SvgImageSize.xs}
    //                 />
    //                 <Text medium caption>
    //                     {`${t('words.join')} `}
    //                 </Text>
    //                 <Text
    //                     bold
    //                     caption
    //                     numberOfLines={1}
    //                     style={styles(theme).groupNameText}>
    //                     {`${groupConfig.name}`}
    //                 </Text>
    //             </View>
    //         }
    //     />
    // )
}

// const styles = (theme: Theme) =>
//     StyleSheet.create({
//         container: {},
//         contents: {
//             flexDirection: 'row',
//             alignItems: 'center',
//             justifyContent: 'center',
//             minWidth: '100%',
//         },
//         icon: {
//             marginRight: theme.spacing.sm,
//         },
//         groupNameText: {
//             maxWidth: '70%',
//         },
//     })

export default EmbeddedJoinGroupButton
