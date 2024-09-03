import FeatureLockScreen, { Props } from '../../../screens/FeatureLockScreen'

export default function NostrKeysLockScreen(props: Props) {
    return (
        <FeatureLockScreen
            {...props}
            feature="nostrKeys"
            screen={['NostrKeys']}
        />
    )
}
