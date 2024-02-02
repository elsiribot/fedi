import Image from 'next/image'
import React from 'react'
import { useTranslation } from 'react-i18next'

import ChatIllustration from '@fedi/common/assets/images/illustration-chat.png'

import { styled } from '../styles'
import { Button } from './Button'
import * as Layout from './Layout'
import { Text } from './Text'

export const ChatNeedRegistration: React.FC = () => {
    const { t } = useTranslation()

    return (
        <Layout.Root>
            <Layout.Content centered>
                <Content>
                    <Image
                        src={ChatIllustration}
                        alt=""
                        width={240}
                        height={240}
                    />
                    <Text variant="h2" weight="normal">
                        {t('feature.chat.need-registration-title')}
                    </Text>
                    <Text>
                        {t('feature.chat.need-registration-description')}
                    </Text>
                </Content>
            </Layout.Content>
            <Layout.Actions>
                <Button
                    width="full"
                    href="/onboarding/username"
                    css={{ maxWidth: 320 }}>
                    {t('feature.chat.register-a-username')}
                </Button>
            </Layout.Actions>
        </Layout.Root>
    )
}

const Content = styled('div', {
    flex: 1,
    maxWidth: 320,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    alignSelf: 'center',
    textAlign: 'center',
})
