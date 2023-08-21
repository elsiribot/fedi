import { useNavigation } from '@react-navigation/native'
import { Input, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    FlatList,
    Insets,
    Keyboard,
    KeyboardAvoidingView,
    ListRenderItem,
    Platform,
    Pressable,
    StyleSheet,
    View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

import { theme as fediTheme } from '@fedi/common/constants/theme'
import {
    selectRecentChatMembers,
    selectSearchChatMembers,
} from '@fedi/common/redux'
import { encodeDirectChatLink } from '@fedi/common/utils/xmpp'

import { useAppSelector } from '../../../state/hooks'
import { ChatMember } from '../../../types'
import Avatar, { AvatarSize } from '../../ui/Avatar'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'
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
    const { t } = useTranslation()
    const { theme } = useTheme()
    const insets = useSafeAreaInsets()
    const navigation = useNavigation()
    const recentMembers = useAppSelector(selectRecentChatMembers)
    const [isFocused, setIsFocused] = useState(false)
    const [inputValue, setInputValue] = useState('')
    const filteredMembers = useAppSelector(s =>
        selectSearchChatMembers(s, inputValue),
    )

    const isShowingSearch = isFocused || inputValue.length > 0
    const style = styles(theme, insets)

    // Handle back button while search is showing, clear & blur input
    useEffect(() => {
        if (!isShowingSearch) return
        const unsubscribe = navigation.addListener('beforeRemove', ev => {
            ev.preventDefault()
            Keyboard.dismiss()
            // Clear input after one frame, bluring it updates the value
            requestAnimationFrame(() => setInputValue(''))
        })
        return () => unsubscribe()
    }, [navigation, isShowingSearch])

    let content: React.ReactNode
    if (isShowingSearch) {
        const renderMember: ListRenderItem<ChatMember> = ({ item }) => (
            <Pressable
                style={style.searchMember}
                hitSlop={theme.spacing.md}
                onPress={() => onInput(encodeDirectChatLink(item.id))}>
                <Avatar
                    id={item.id}
                    name={item.username}
                    size={AvatarSize.md}
                />
                <Text numberOfLines={1}>{item.username}</Text>
            </Pressable>
        )
        const empty = inputValue ? (
            <View style={style.searchEmpty}>
                <Text caption style={style.searchEmptyText}>
                    {t('feature.omni.search-no-history', {
                        username: inputValue,
                    })}
                </Text>
                <Pressable
                    onPress={() => onInput(encodeDirectChatLink(inputValue))}>
                    <Text
                        caption
                        style={[style.searchEmptyText, style.searchEmptySend]}>
                        {t('feature.omni.search-no-history-send', {
                            username: inputValue,
                        })}
                    </Text>
                </Pressable>
            </View>
        ) : null
        content = (
            <SafeAreaView
                edges={['left', 'right']}
                style={style.searchMembersContainer}>
                <FlatList
                    data={filteredMembers}
                    renderItem={renderMember}
                    keyExtractor={item => `${item.id}`}
                    style={style.searchMembersScrollOuter}
                    contentContainerStyle={style.searchMembersScrollInner}
                    ListEmptyComponent={empty}
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
                    value={inputValue}
                    placeholder={t(
                        canLnurlPay
                            ? 'feature.omni.search-placeholder-username-or-ln'
                            : 'feature.omni.search-placeholder-username',
                    )}
                    onChangeText={setInputValue}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    autoCapitalize="none"
                />
                <Pressable
                    onPress={() =>
                        inputValue && onInput(encodeDirectChatLink(inputValue))
                    }>
                    <SvgImage
                        name="SendArrowRightCircle"
                        color={theme.colors.blue}
                        size={SvgImageSize.md}
                    />
                </Pressable>
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
        searchMember: {
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: theme.spacing.lg,
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
