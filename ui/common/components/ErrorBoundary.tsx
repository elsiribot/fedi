import React from 'react'

interface ErrorBoundaryState {
    didCatch: boolean
    error: any
}

const initialState: ErrorBoundaryState = {
    didCatch: false,
    error: null,
}

export interface ErrorFallbackProps {
    error: any
    resetErrorBoundary?: () => void
}

interface ErrorBoundaryProps {
    children: React.ReactNode
    /**
     * Can either be a simple ReactNode, or a function that returns a ReactNode.
     * If a function is provided, it will be passed `ErrorFallbackProps`.
     */
    fallback: React.ReactNode | ((props: ErrorFallbackProps) => React.ReactNode)
    /** Optional callback when an error is encountered, no handling required */
    onError?: (error: Error, info: { componentStack: string }) => void
    /**
     * Optional callback that's triggered if the `fallback` component implements
     * and triggers `resetErrorBoundary`. This trigger should do something like
     * reset some component state or navigate a user elsewhere. If not provided,
     * the `fallback` component won't receive a `resetErrorBoundary` function,
     * and shouldn't render an action.
     */
    onReset?: () => void
}

/**
 * ErrorBoundary provides a simple wrapper around components we consider "unsafe"
 * to provide a fallback in case they throw an error.
 */
export class ErrorBoundary extends React.Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    constructor(props: ErrorBoundaryProps) {
        super(props)

        this.resetErrorBoundary = this.resetErrorBoundary.bind(this)
        this.state = initialState
    }

    // Must be a class component to implement `getDerivedStateFromError`.
    static getDerivedStateFromError(error: Error) {
        return { didCatch: true, error }
    }

    resetErrorBoundary() {
        const { error } = this.state

        if (error !== null) {
            this.setState(initialState)
        }
    }

    // Must be a class component to implement `componentDidCatch`.
    componentDidCatch(error: Error, info: React.ErrorInfo) {
        this.props.onError?.(error, info)
        console.error(`[ErrorBoundary]`, error, info)
    }

    render() {
        const { children, fallback } = this.props
        const { didCatch, error } = this.state

        let childToRender = children

        if (didCatch) {
            if (typeof fallback === 'function') {
                const props: ErrorFallbackProps = {
                    error,
                    resetErrorBoundary: this.resetErrorBoundary,
                }
                childToRender = (
                    fallback as (props: ErrorFallbackProps) => React.ReactNode
                )(props)
            } else {
                childToRender = fallback
            }
        }

        return <>{childToRender}</>
    }
}
