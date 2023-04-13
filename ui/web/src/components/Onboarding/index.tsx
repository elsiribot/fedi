import React from 'react'

import { styled } from '../../styles'
import { JoinFederation } from './JoinFederation'
import { OnboardingHome } from './OnboardingHome'

interface Props {
    step?: string
}

export const Onboarding: React.FC<Props> = ({ step }) => {
    console.log({ step })
    let content
    if (step === 'join') {
        content = <JoinFederation />
    } else {
        content = <OnboardingHome />
    }

    return <Container>{content}</Container>
}

const Container = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: '50vh',
    textAlign: 'center',
})
