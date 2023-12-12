import Clipboard from '@react-native-clipboard/clipboard'
import { Text } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'

import stringUtils from '@fedi/common/utils/StringUtils'

import { useEnvironmentContext } from '../../../state/contexts/EnvironmentContext'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'

interface BaseProps {
    label: React.ReactNode
    onPress?: () => void
}

interface StringProps extends BaseProps {
    value: string
    truncated?: boolean
    copyable?: boolean
    copiedMessage?: string
}

interface ReactNodeProps extends BaseProps {
    value: React.ReactElement
}

type Props = StringProps | ReactNodeProps

const isStringProps = (props: Props): props is StringProps =>
    typeof props.value === 'string'

export const TransactionDetailItem: React.FC<Props> = props => {
    const { t } = useTranslation()
    const { toast } = useEnvironmentContext().state

    const style = styles()

    let valueEl: React.ReactNode
    if (isStringProps(props)) {
        valueEl = (
            <Text small>
                {props.truncated
                    ? stringUtils.truncateMiddleOfString(props.value, 5)
                    : props.value}
            </Text>
        )
        if (props.copyable) {
            valueEl = (
                <Pressable
                    hitSlop={5}
                    style={style.copyPressable}
                    onPress={() => {
                        Clipboard.setString(props.value)
                        toast?.show(
                            props.copiedMessage ||
                                t('phrases.copied-to-clipboard'),
                        )
                    }}>
                    {valueEl}
                    <SvgImage name="Copy" size={SvgImageSize.xs} />
                </Pressable>
            )
        }
    } else {
        valueEl = props.value
    }

    if (props.onPress) {
        return (
            <Pressable style={style.container} onPress={props.onPress}>
                <Text small medium>
                    {props.label}
                </Text>
                {valueEl}
            </Pressable>
        )
    } else {
        return (
            <View style={style.container}>
                <Text small medium>
                    {props.label}
                </Text>
                {valueEl}
            </View>
        )
    }
}

const styles = () =>
    StyleSheet.create({
        container: {
            minHeight: 24,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        copyPressable: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
    })
