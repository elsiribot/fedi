import React from 'react'

import { styled } from '../../styles'
import { CreateUsername } from './CreateUsername'
import { FederationTerms } from './FederationTerms'
import { FederationWelcome } from './FederationWelcome'
import { JoinFederation } from './JoinFederation'
import { OnboardingComplete } from './OnboardingComplete'
import { OnboardingHome } from './OnboardingHome'
import { PersonalRecovery } from './PersonalRecovery'
import { WalletRecovery } from './WalletRecovery'

interface Props {
    step?: string
}

export const Onboarding: React.FC<Props> = ({ step }) => {
    let content
    if (step === 'join') {
        content = <JoinFederation />
    } else if (step === 'welcome') {
        content = <FederationWelcome />
    } else if (step === 'recover') {
        content = <WalletRecovery />
    } else if (step === 'recover/personal') {
        content = <PersonalRecovery />
    } else if (step === 'terms') {
        content = <FederationTerms />
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
