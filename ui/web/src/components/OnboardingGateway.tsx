import { useRouter } from 'next/router'
import React from 'react'

import { selectActiveFederation } from '@fedi/common/redux'

import { useAppSelector } from '../hooks'
import { Redirect } from './Redirect'

export const OnboardingGateway: React.FC = () => {
    const { isReady, pathname } = useRouter()
    const activeFederation = useAppSelector(selectActiveFederation)

    if (isReady && !activeFederation && !pathname.startsWith('/onboarding')) {
        return <Redirect path="/onboarding" />
    }

    return <>{children}</>
}
