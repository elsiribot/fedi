import { useRoute } from '@react-navigation/native'

/** Return whether or not we're in a screen that has the tabs navigator visible */
export function useHasBottomTabsNavigation() {
    const { name } = useRoute()
    return ['Home', 'Chat', 'OmniScanner'].includes(name)
}
