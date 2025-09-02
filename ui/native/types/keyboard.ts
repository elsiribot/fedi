import { useSafeAreaInsets } from 'react-native-safe-area-context'

export type KeyboardState = {
    isVisible: boolean
    height: number
    screenHeight: number
    animationDuration: number
}

export interface KeyboardContextValue extends KeyboardState {
    insets: ReturnType<typeof useSafeAreaInsets>
}

export type KeyboardDirection = 'end' | 'top' | 'none'

export type KeyboardScrollableProps = {
    direction?: KeyboardDirection
    enabled?: boolean
    settleDelayMs?: number
}

export type KeyboardScrollableRef = React.RefObject<{
    scrollTo?(options: { y?: number; x?: number; animated?: boolean }): void
    scrollToEnd?(options?: { animated?: boolean }): void
}>
