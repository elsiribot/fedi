import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ImageSourcePropType } from 'react-native'
import { Images } from '../../../assets/images'
import HoloGuidance from '../../ui/HoloGuidance'

type OnboardingSlideProps = {
    title: string
    message: string
    iconImage: ImageSourcePropType
}
const OnboardingSlide: React.FC<OnboardingSlideProps> = ({
    title,
    message,
    iconImage,
}: OnboardingSlideProps) => {
    return (
        <HoloGuidance iconImage={iconImage} title={title} message={message} />
    )
}
export type OnboardingSlidesParamList = {
    Slide1: OnboardingSlideProps
    Slide2: OnboardingSlideProps
    Slide3: OnboardingSlideProps
    Slide4: OnboardingSlideProps
}
const Tab = createMaterialTopTabNavigator<OnboardingSlidesParamList>()

export type Props = {
    onSlideChanged: (page: number) => void
}

const OnboardingSlides: React.FC<Props> = ({ onSlideChanged }: Props) => {
    const { t } = useTranslation()

    const slides = [
        {
            key: 'welcome-to-fedi',
            title: t('feature.onboarding.welcome-to-fedi'),
            message: t('feature.onboarding.guidance-1'),
            iconImage: Images.FediLogoIcon,
        },
        {
            key: 'commmunity-first',
            title: t('feature.onboarding.community-first'),
            message: t('feature.onboarding.guidance-2'),
            iconImage: Images.SocialPeople,
        },
        {
            key: 'simple-and-private',
            title: t('feature.onboarding.simple-and-private'),
            message: t('feature.onboarding.guidance-3'),
            iconImage: Images.Fedimint,
        },
        {
            key: 'earn-and-save',
            title: t('feature.onboarding.earn-and-save'),
            message: t('feature.onboarding.guidance-4'),
            iconImage: Images.Cash,
        },
    ]

    return (
        <Tab.Navigator
            initialRouteName="Slide1"
            id="SplashTabs"
            screenListeners={{
                state: e => {
                    // Do something with the state
                    console.log('state changed', e.data)
                    console.log('state changed', e.data?.state.index)
                    onSlideChanged(e.data?.state.index + 1)
                },
            }}
            screenOptions={() => ({
                tabBarStyle: { display: 'none' },
            })}>
            {slides.map((s, index) => (
                <Tab.Screen
                    key={s.key}
                    name={
                        `Slide${index + 1}` as keyof OnboardingSlidesParamList
                    }
                    initialParams={s}>
                    {props => <OnboardingSlide {...props} {...s} />}
                </Tab.Screen>
            ))}
        </Tab.Navigator>
    )
}

export default OnboardingSlides
