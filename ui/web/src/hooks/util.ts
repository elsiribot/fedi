import { useRef } from 'react'

export function useUpdatingRef<T>(value: T) {
    const ref = useRef(value)
    ref.current = value
    return ref
}
