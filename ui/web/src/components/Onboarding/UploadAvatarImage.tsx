import { useRouter } from 'next/router'
import React, { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useToast } from '@fedi/common/hooks/toast'
import {
    selectActiveFederationId,
    selectMatrixAuth,
    uploadAndSetMatrixAvatarUrl,
} from '@fedi/common/redux'

import { useAppDispatch, useAppSelector } from '../../hooks'
import { fedimint, writeBridgeFile } from '../../lib/bridge'
import { Avatar } from '../Avatar'
import { Button } from '../Button'
import { HoloLoader } from '../HoloLoader'
import { Redirect } from '../Redirect'
import { Text } from '../Text'
import {
    OnboardingActions,
    OnboardingContainer,
    OnboardingContent,
} from './components'

export const UploadAvatarImage: React.FC = () => {
    const { t } = useTranslation()
    const { push } = useRouter()
    const toast = useToast()
    const matrixAuth = useAppSelector(selectMatrixAuth)
    const federationId = useAppSelector(selectActiveFederationId)

    const dispatch = useAppDispatch()

    const imageInputRef = useRef<HTMLInputElement>(null)

    const [didUpload, setDidUpload] = useState<boolean>(false)
    const [isUploading, setIsUploading] = useState<boolean>(false)

    const finishStep = () => {
        push('/onboarding/complete')
    }

    const selectAvatarImage = useCallback(
        async (ev: React.ChangeEvent<HTMLInputElement>) => {
            const file = ev.target.files?.[0]

            if (!file) return

            try {
                setIsUploading(true)

                const path = 'onboarding-avatar'
                const mimeType = file.type
                const data = new Uint8Array(await file.arrayBuffer())

                await writeBridgeFile(path, data)

                await dispatch(
                    uploadAndSetMatrixAvatarUrl({ fedimint, path, mimeType }),
                ).unwrap()

                setDidUpload(true)
            } catch (err) {
                toast.error(t, 'errors.unknown-error')
            } finally {
                setIsUploading(false)
            }
        },
        [dispatch, t, toast],
    )

    // TODO: Allow username registration before joining a federation, chat does
    // not require federation membership.
    if (!federationId) {
        return <Redirect path="/onboarding" />
    }

    let content: React.ReactNode
    if (!matrixAuth) {
        content = (
            <OnboardingContent>
                <HoloLoader size="xl" />
            </OnboardingContent>
        )
    } else {
        const greeting = didUpload
            ? `${t('feature.onboarding.greeting-image')}, ${
                  matrixAuth.displayName
              }`
            : `${t('words.hello')}, ${matrixAuth.displayName}`

        // don't render avatar name if image is present
        const avatarName = matrixAuth?.avatarUrl ? '' : matrixAuth.displayName

        const renderPreUploadButtons = () => {
            return (
                <>
                    <Button
                        variant="secondary"
                        width="full"
                        disabled={isUploading || didUpload}
                        onClick={finishStep}>
                        {t('words.skip')}
                    </Button>

                    <Button
                        width="full"
                        type="submit"
                        disabled={isUploading || didUpload}
                        loading={isUploading}
                        onClick={() => imageInputRef.current?.click()}>
                        <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            onChange={selectAvatarImage}
                            style={{ display: 'none' }}
                        />
                        {t('feature.chat.add-a-photo')}
                    </Button>
                </>
            )
        }

        const renderPostUploadButtons = () => {
            return (
                <Button
                    width="full"
                    type="submit"
                    disabled={!didUpload}
                    loading={isUploading}
                    onClick={finishStep}>
                    {t('words.continue')}
                </Button>
            )
        }

        content = (
            <>
                <OnboardingContent>
                    <Avatar
                        id={matrixAuth.userId || ''}
                        src={matrixAuth?.avatarUrl}
                        size="lg"
                        name={avatarName}
                    />

                    <Text>{greeting}</Text>
                </OnboardingContent>
                <OnboardingActions>
                    {didUpload
                        ? renderPostUploadButtons()
                        : renderPreUploadButtons()}
                </OnboardingActions>
            </>
        )
    }

    return <OnboardingContainer>{content}</OnboardingContainer>
}
