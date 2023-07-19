import { useRouter } from 'next/router'
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react'

import {
    ParsedBolt11,
    ParsedFederationInvite,
    ParsedLnurlPay,
    ParsedLnurlWithdraw,
} from '@fedi/common/types'

interface RouteStateByPath {
    '/send': ParsedLnurlPay | ParsedBolt11
    '/request': ParsedLnurlWithdraw
    '/onboarding/join': ParsedFederationInvite
}

type RouteStateFn = <
    Route extends keyof RouteStateByPath,
    State extends RouteStateByPath[Route] = RouteStateByPath[Route],
>(
    route: Route,
    state: State,
) => void

const noopRouteStateFn: RouteStateFn = (_r, _s) => null
const initialState = {
    routeState: undefined as
        | RouteStateByPath[keyof RouteStateByPath]
        | undefined,
    pushWithState: noopRouteStateFn,
    replaceWithState: noopRouteStateFn,
}

export const RouteStateContext = createContext(initialState)

interface Props {
    children: React.ReactNode
}

export const RouteStateProvider: React.FC<Props> = ({ children }) => {
    const { push, replace, pathname } = useRouter()
    const [routeState, setRouteState] = useState(initialState.routeState)
    const routePathnameRef = useRef<string | undefined>(undefined)

    // Reset route state when we navigate away
    useEffect(() => {
        if (routePathnameRef.current && pathname !== routePathnameRef.current) {
            setRouteState(undefined)
            routePathnameRef.current = undefined
        }
    }, [pathname])

    const pushWithState: RouteStateFn = useCallback(
        (route, state) => {
            routePathnameRef.current = route
            setRouteState(state)
            push(route)
        },
        [push],
    )

    const replaceWithState: RouteStateFn = useCallback(
        (route, state) => {
            routePathnameRef.current = route
            setRouteState(state)
            replace(route)
        },
        [replace],
    )

    return (
        <RouteStateContext.Provider
            value={{
                routeState,
                pushWithState,
                replaceWithState,
            }}>
            {children}
        </RouteStateContext.Provider>
    )
}

export const useRouteStateContext = () => useContext(RouteStateContext)

export const useRouteState = <Route extends keyof RouteStateByPath>(
    _: Route,
): RouteStateByPath[Route] | undefined => {
    const { routeState } = useContext(RouteStateContext)
    return routeState as RouteStateByPath[Route] | undefined
}
