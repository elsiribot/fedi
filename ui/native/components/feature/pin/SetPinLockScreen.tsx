import LockScreen, { Props } from '../../../screens/LockScreen'

export default function SetPinLockScreen(props: Props) {
    return <LockScreen {...props} feature="changePin" screen={['SetPin']} />
}
