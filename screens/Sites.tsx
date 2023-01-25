import { createNativeStackNavigator } from '@react-navigation/native-stack'
import React from 'react'

import SitesBrowser from './SitesBrowser'
import SitesList from './SitesList'

import { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import SitesHeader from '../components/feature/sites/SitesHeader'
import type {
    HomeTabsParamList,
    RootStackParamList,
    SitesStackParamList,
} from '../types/navigation'

export type Props = BottomTabScreenProps<
    HomeTabsParamList & RootStackParamList,
    'Sites'
>

const Stack = createNativeStackNavigator<SitesStackParamList>()

const Sites: React.FC<Props> = ({}) => {
    // TODO: Add offline state as part of #53

    return (
        <Stack.Navigator>
            <Stack.Screen
                name="SitesList"
                component={SitesList}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="SitesBrowser"
                component={SitesBrowser}
                options={{
                    headerShown: false,
                    header: () => <SitesHeader />,
                }}
            />
        </Stack.Navigator>
    )
}

export default Sites
