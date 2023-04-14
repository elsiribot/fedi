import React from 'react'

import { styled } from '../../styles'
import { CreateUsername } from './CreateUsername'
import { JoinFederation } from './JoinFederation'
import { OnboardingComplete } from './OnboardingComplete'
import { OnboardingHome } from './OnboardingHome'
import { WalletRecovery } from './WalletRecovery'
import { Welcome } from './Welcome'

interface Props {
    step?: string
}

export const Onboarding: React.FC<Props> = ({ step }) => {
    let content
    if (step === 'join') {
        content = <JoinFederation />
    } else if (step === 'welcome') {
        content = <Welcome />
    } else if (step === 'recovery') {
        content = <WalletRecovery />
    } else if (step === 'username') {
        content = <CreateUsername />
    } else if (step === 'complete') {
        content = <OnboardingComplete />
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
