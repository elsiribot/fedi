import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Switch, Text, useTheme } from '@rneui/themed'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import { fedimint } from '../bridge'
import CustomOverlay from '../components/ui/CustomOverlay'
import { FieldInput } from '../components/ui/FieldInput'
import Flex from '../components/ui/Flex'
import { PressableIcon } from '../components/ui/PressableIcon'
import { SafeScrollArea } from '../components/ui/SafeArea'
import SvgImage from '../components/ui/SvgImage'
import { RootStackParamList } from '../types/navigation'
import { styles } from './CreatePoll'

type Props = NativeStackScreenProps<RootStackParamList, 'EditPoll'>

const EditPoll: React.FC<Props> = ({ route, navigation }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const [isConfirmingEnd, setIsConfirmingEnd] = useState(false)
    const event = route.params.event

    const style = styles(theme)

    return (
        <SafeScrollArea
            contentContainerStyle={style.container}
            safeAreaContainerStyle={style.content}
            edges="bottom">
            <FieldInput
                label={t('words.question')}
                value={event.content.body}
                disabled
            />
            <Flex gap="sm">
                <Text small style={style.optionsLabel}>
                    {t('words.options')}
                </Text>
                <Flex gap="sm">
                    {event.content.answers.map(answer => (
                        <Flex row align="center" gap="sm" key={answer.id}>
                            <View style={style.optionInput}>
                                <FieldInput value={answer.text} disabled />
                            </View>
                            <PressableIcon
                                svgName="Trash"
                                containerStyle={style.deleteOptionIcon}
                                disabled
                            />
                        </Flex>
                    ))}
                </Flex>
                <Flex row>
                    <View style={style.addOptionButton}>
                        <Text>{t('words.add')}</Text>
                        <SvgImage name="PlusCircle" />
                    </View>
                </Flex>
            </Flex>
            <Flex gap="lg">
                <Flex row align="center" justify="between" gap="sm">
                    <Flex row align="center" gap="sm">
                        <SvgImage name="List" />
                        <Text>{t('feature.chat.multiple-choice')}</Text>
                    </Flex>
                    <Switch value={event.content.maxSelections > 1} disabled />
                </Flex>
                <Flex row align="center" justify="between" gap="sm">
                    <Flex row align="center" gap="sm">
                        <SvgImage name="Bolt" />
                        <Text>{t('feature.chat.show-live-results')}</Text>
                    </Flex>
                    <Switch
                        value={event.content.kind === 'disclosed'}
                        disabled
                    />
                </Flex>
            </Flex>
            <Button
                title={t('feature.chat.end-poll')}
                buttonStyle={style.endButton}
                containerStyle={style.submitButton}
                onPress={() => setIsConfirmingEnd(true)}
            />
            <CustomOverlay
                show={isConfirmingEnd}
                onBackdropPress={() => setIsConfirmingEnd(false)}
                contents={{
                    body: (
                        <Flex align="center" gap="lg">
                            <View style={style.pollPreview}>
                                <Text>{event.content.body}</Text>
                            </View>
                            <Text medium>
                                {t('feature.chat.confirm-end-poll')}
                            </Text>
                        </Flex>
                    ),
                    buttons: [
                        {
                            text: t('words.cancel'),
                            onPress: () => setIsConfirmingEnd(false),
                        },
                        {
                            text: t('feature.chat.end-poll-confirmation'),
                            primary: true,
                            onPress: () => {
                                if (!event.eventId) return

                                fedimint
                                    .matrixEndPoll(event.roomId, event.eventId)
                                    .then(() => navigation.goBack())
                            },
                        },
                    ],
                }}
            />
        </SafeScrollArea>
    )
}

export default EditPoll
