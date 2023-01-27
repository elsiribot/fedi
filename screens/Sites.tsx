import { createNativeStackNavigator } from '@react-navigation/native-stack'
import React from 'react'

import SitesBrowser from './SitesBrowser'
import SitesList from './SitesList'

import { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import SelectedFederationHeader from '../components/feature/federations/SelectedFederationHeader'
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
                options={() => ({
                    header: () => <SelectedFederationHeader />,
                })}
            />
            <Stack.Screen
                name="SitesBrowser"
                component={SitesBrowser}
                options={{
                    headerShown: false,
                }}
            />
        </Stack.Navigator>
    )
}

export default Sites
