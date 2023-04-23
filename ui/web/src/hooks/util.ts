import { useRef, useState, useEffect } from 'react'

export function useUpdatingRef<T>(value: T) {
    const ref = useRef(value)
    ref.current = value
    return ref
}

export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false)

    useEffect(() => {
        const media = window.matchMedia(query)
        setMatches(media.matches)
        const listener = () => setMatches(media.matches)
        media.addEventListener('change', listener)
        return () => media.removeEventListener('change', listener)
    }, [matches, query])

    return matches
}
