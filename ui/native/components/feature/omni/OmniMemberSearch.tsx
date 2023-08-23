import { Input, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    SectionList,
    Insets,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    View,
    SectionListData,
    ActivityIndicator,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

import { theme as fediTheme } from '@fedi/common/constants/theme'
import { useChatMemberSearch } from '@fedi/common/hooks/chat'
import {
    fetchChatMember,
    selectActiveFederation,
    selectChatClientStatus,
    selectChatConnectionOptions,
    selectChatMember,
    selectChatMembersWithHistory,
    selectRecentChatMembers,
} from '@fedi/common/redux'
import { isValidInternetIdentifier } from '@fedi/common/utils/validation'
import { encodeDirectChatLink } from '@fedi/common/utils/xmpp'

import { useAppDispatch, useAppSelector } from '../../../state/hooks'
import { ChatMember } from '../../../types'
import Avatar, { AvatarSize } from '../../ui/Avatar'
import SvgImage from '../../ui/SvgImage'
import { OmniActions } from './OmniActions'
import { OmniInputAction } from './OmniInput'

interface Props {
    onInput(data: string): void
    actions: OmniInputAction[]
    canLnurlPay?: boolean
}

export const OmniMemberSearch: React.FC<Props> = ({
    actions,
    onInput,
    canLnurlPay,
}) => {
    const dispatch = useAppDispatch()
    const { t } = useTranslation()
    const { theme } = useTheme()
    const insets = useSafeAreaInsets()
    const membersWithHistory = useAppSelector(selectChatMembersWithHistory)
    const recentMembers = useAppSelector(selectRecentChatMembers)
    const federationId = useAppSelector(selectActiveFederation)?.id
    const chatDomain = useAppSelector(selectChatConnectionOptions)?.domain
    const isChatOnline = useAppSelector(selectChatClientStatus) === 'online'
    const [isFocused, setIsFocused] = useState(false)
    const { query, setQuery, searchedMembers, isExactMatch } =
        useChatMemberSearch(membersWithHistory)
    const [isFetchingUnknownMember, setIsFetchingUnknownMember] =
        useState(false)
    const exactMatchMember = useAppSelector(s =>
        chatDomain && !isExactMatch
            ? selectChatMember(s, `${query}@${chatDomain}`)
            : null,
    )
    const [fetchedMember, setFetchedMember] = useState<ChatMember>()

    const isShowingSearch = isFocused || query.length > 0
    const hasExactMatchMember = !!exactMatchMember
    const noHistoryMember = exactMatchMember || fetchedMember
    const style = styles(theme, insets)

    // If their query is not an exact match, search for a potentially unknown
    // member. Search is debounced to reduce unnecessary searches while typing.
    useEffect(() => {
        // If we're unable to do a search due to anything missing, clear
        // previous result and stop showing loading indicator
        if (
            !query ||
            !chatDomain ||
            !federationId ||
            !isChatOnline ||
            isExactMatch ||
            hasExactMatchMember
        ) {
            setIsFetchingUnknownMember(false)
            setFetchedMember(undefined)
            return
        }

        // Mark loading and clear previous result immediately
        setIsFetchingUnknownMember(true)
        setFetchedMember(undefined)

        // Wrap search in async cancelable function to be called after delay
        let canceled = false
        const search = async () => {
            const memberId = `${query}@${chatDomain}`
            try {
                const member = await dispatch(
                    fetchChatMember({ federationId, memberId }),
                ).unwrap()
                if (canceled) return
                setFetchedMember(member)
            } catch {
                /* no-op */
            }
            if (canceled) return
            setIsFetchingUnknownMember(false)
        }

        // On re-run of useEffect, clear search debounce and cancel in case it's in flight
        const timeout = setTimeout(search, 500)
        return () => {
            clearTimeout(timeout)
            canceled = true
        }
    }, [
        query,
        chatDomain,
        federationId,
        isChatOnline,
        isExactMatch,
        hasExactMatchMember,
        dispatch,
    ])

    const searchResultsSections = useMemo(() => {
        const sections: SectionListData<
            | { username: string; id: string; inputData?: string }
            | { loading: true }
        >[] = []
        // Show people they know that fit the search query
        if (searchedMembers.length) {
            sections.push({
                title: t('words.people'),
                data: searchedMembers,
            })
        }
        // If they provided a lightning address and support lnurl payments, suggest that
        if (canLnurlPay && isValidInternetIdentifier(query)) {
            sections.push({
                title: t('phrases.lightning-address'),
                data: [{ username: query, id: query, inputData: query }],
            })
        }
        // Show members that are exact matches that we have no history with, or a loader
        // if we're looking up if they exist
        if (noHistoryMember) {
            sections.push({
                title: t('feature.omni.search-no-history-header'),
                data: [noHistoryMember],
            })
        } else if (isFetchingUnknownMember) {
            sections.push({ title: '', data: [{ loading: true }] })
        }
        return sections
    }, [
        query,
        searchedMembers,
        noHistoryMember,
        isFetchingUnknownMember,
        canLnurlPay,
        t,
    ])

    let content: React.ReactNode
    if (isShowingSearch) {
        content = (
            <SafeAreaView
                edges={['left', 'right']}
                style={style.searchMembersContainer}>
                <SectionList
                    sections={searchResultsSections}
                    renderSectionHeader={({ section }) =>
                        'loading' in section ? null : (
                            <Text small medium style={style.searchHeading}>
                                {section.title}
                            </Text>
                        )
                    }
                    renderItem={({ item }) =>
                        'loading' in item ? (
                            <ActivityIndicator />
                        ) : (
                            <Pressable
                                style={style.searchMember}
                                hitSlop={theme.spacing.md}
                                onPress={() =>
                                    onInput(
                                        item.inputData
                                            ? item.inputData
                                            : encodeDirectChatLink(item.id),
                                    )
                                }>
                                <Avatar
                                    id={item.id}
                                    name={item.username}
                                    size={AvatarSize.md}
                                />
                                <Text
                                    numberOfLines={1}
                                    style={style.searchMemberText}>
                                    {item.username}
                                </Text>
                                <SvgImage name="ChevronRight" />
                            </Pressable>
                        )
                    }
                    keyExtractor={item =>
                        'id' in item ? `${item.id}` : 'loading'
                    }
                    style={style.searchMembersScrollOuter}
                    contentContainerStyle={style.searchMembersScrollInner}
                    ListEmptyComponent={
                        query ? (
                            <View style={style.searchEmpty}>
                                <Text>
                                    {t('feature.omni.search-no-results', {
                                        query,
                                    })}
                                </Text>
                            </View>
                        ) : null
                    }
                />
            </SafeAreaView>
        )
    } else {
        content = (
            <SafeAreaView
                edges={['left', 'right', 'bottom']}
                style={style.defaultContainer}>
                <View>
                    <Text small medium style={style.recentMembersLabel}>
                        {t('words.people')}
                    </Text>
                    <View style={style.recentMembers}>
                        {recentMembers.map(member => (
                            <Pressable
                                key={member.id}
                                style={style.recentMember}
                                onPress={() =>
                                    onInput(encodeDirectChatLink(member.id))
                                }>
                                <Avatar
                                    id={member.id}
                                    name={member.username}
                                    size={AvatarSize.md}
                                />
                                <Text
                                    caption
                                    medium
                                    numberOfLines={1}
                                    style={style.recentMemberUsername}>
                                    {member.username}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>
                <OmniActions actions={actions} />
            </SafeAreaView>
        )
    }

    return (
        <KeyboardAvoidingView
            enabled={Platform.OS === 'ios'}
            behavior="padding"
            keyboardVerticalOffset={insets.top + 40}
            style={style.container}>
            <SafeAreaView edges={['left', 'right']} style={style.controls}>
                <Text>{t('words.to').toLowerCase()}:</Text>
                <Input
                    containerStyle={style.inputContainerOuter}
                    inputContainerStyle={style.inputContainerInner}
                    style={style.input}
                    value={query}
                    placeholder={t(
                        canLnurlPay
                            ? 'feature.omni.search-placeholder-username-or-ln'
                            : 'feature.omni.search-placeholder-username',
                    )}
                    onChangeText={setQuery}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    autoCapitalize="none"
                />
                {isShowingSearch && (
                    <Pressable
                        onPress={() => {
                            // Hide the keyboard, then the next frame the input blur will
                            // trigger one last onChangeText with the final value, then the
                            // frame after that we'll clear the input forreal.
                            Keyboard.dismiss()
                            requestAnimationFrame(() => {
                                requestAnimationFrame(() => {
                                    setQuery('')
                                })
                            })
                        }}>
                        <SvgImage name="Close" />
                    </Pressable>
                )}
            </SafeAreaView>
            <View style={style.content}>{content}</View>
        </KeyboardAvoidingView>
    )
}

const styles = (theme: Theme, insets: Insets) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
        controls: {
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            height: 56,
            marginTop: theme.spacing.sm,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.sm,
            borderColor: theme.colors.extraLightGrey,
            borderTopWidth: 1,
            borderBottomWidth: 1,
        },
        inputContainerOuter: {
            flex: 1,
            height: 40,
        },
        inputContainerInner: {
            borderBottomWidth: 0,
        },
        input: {
            fontSize: fediTheme.fontSizes.body,
        },
        content: {
            flex: 1,
            width: '100%',
        },
        searchMembersContainer: {
            flex: 1,
        },
        searchMembersScrollOuter: {
            flex: 1,
        },
        searchMembersScrollInner: {
            paddingTop: theme.spacing.md,
            paddingBottom: Math.max(theme.spacing.md, insets.bottom || 0),
        },
        searchHeading: {
            backgroundColor: theme.colors.secondary,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.xs,
            color: theme.colors.grey,
        },
        searchMember: {
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: theme.spacing.lg,
        },
        searchMemberText: {
            flex: 1,
        },
        searchEmpty: {
            alignItems: 'center',
            padding: theme.spacing.lg,
            gap: theme.spacing.md,
        },
        searchEmptyText: {
            color: theme.colors.grey,
            textAlign: 'center',
        },
        searchEmptySend: {
            color: theme.colors.blue,
        },
        defaultContainer: {
            padding: theme.spacing.lg,
            gap: theme.spacing.lg,
        },
        recentMembersLabel: {
            marginBottom: theme.spacing.lg,
            color: theme.colors.grey,
        },
        recentMembers: {
            width: '100%',
            flexDirection: 'row',
        },
        recentMember: {
            width: '25%',
            alignItems: 'center',
            gap: theme.spacing.sm,
        },
        recentMemberUsername: {
            paddingHorizontal: theme.spacing.xs,
        },
        alignStart: {
            alignItems: 'flex-start',
        },
    })
