import { useNavigation, useRoute } from '@react-navigation/native'
import { Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { Pressable, StyleSheet } from 'react-native'

import { Props as GroupAdminProps } from '../../../screens/GroupAdmin'
import { NavigationHook } from '../../../types/navigation'
import Header from '../../ui/Header'
import SvgImage from '../../ui/SvgImage'

type GroupAdminRouteProp = GroupAdminProps['route']

const GroupAdminHeader: React.FC<{}> = () => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const route = useRoute<GroupAdminRouteProp>()
    const { group } = route.params

    return (
        <Header
            backButton
            containerStyle={styles(theme).container}
            rightContainerStyle={styles(theme).headerRightContainer}
            headerRight={
                <>
                    <Pressable
                        onPress={() =>
                            navigation.navigate('EditGroup', {
                                group,
                            })
                        }
                        style={styles(theme).headerIconContainer}>
                        <SvgImage name="Edit" />
                    </Pressable>
                </>
            }
        />
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            marginTop: theme.spacing.md,
        },
        headerCenterContainer: {
            flex: 6,
            justifyContent: 'flex-start',
        },
        headerRightContainer: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
        },
        headerIconContainer: {
            padding: theme.spacing.sm,
        },
        headerIcon: {
            height: theme.sizes.sm,
            width: theme.sizes.sm,
        },
        groupIcon: {
            height: theme.sizes.sm,
            width: theme.sizes.sm,
            marginRight: theme.spacing.sm,
        },
        groupNameContainer: {
            padding: theme.spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
        },
    })

export default GroupAdminHeader
