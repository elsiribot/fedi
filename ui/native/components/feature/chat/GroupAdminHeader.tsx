import { useNavigation, useRoute } from '@react-navigation/native'
import { Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { Pressable, StyleSheet } from 'react-native'

import { selectMatrixRoomSelfPowerLevel } from '@fedi/common/redux'
import { MatrixPowerLevel } from '@fedi/common/types'

import { Props as GroupAdminProps } from '../../../screens/GroupAdmin'
import { useAppSelector } from '../../../state/hooks'
import { NavigationHook } from '../../../types/navigation'
import Header from '../../ui/Header'
import SvgImage from '../../ui/SvgImage'

type GroupAdminRouteProp = GroupAdminProps['route']

const GroupAdminHeader: React.FC = () => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const route = useRoute<GroupAdminRouteProp>()
    const { roomId } = route.params
    const myPowerLevel = useAppSelector(s =>
        selectMatrixRoomSelfPowerLevel(s, roomId || ''),
    )
    const isAdmin = myPowerLevel >= MatrixPowerLevel.Admin

    return (
        <Header
            backButton
            rightContainerStyle={styles(theme).headerRightContainer}
            headerRight={
                <>
                    {isAdmin && (
                        <Pressable
                            onPress={() =>
                                navigation.navigate('EditGroup', {
                                    roomId,
                                })
                            }
                            style={styles(theme).headerIconContainer}>
                            <SvgImage name="Edit" />
                        </Pressable>
                    )}
                </>
            }
        />
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
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
