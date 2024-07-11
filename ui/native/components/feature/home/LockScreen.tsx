import LockScreen, { Props } from '../../../screens/LockScreen'

export default function HomeLockScreen(props: Props) {
    return <LockScreen {...props} feature="app" screen={['TabsNavigator']} />
}
