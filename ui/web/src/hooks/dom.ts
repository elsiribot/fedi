import Router from 'next/router'
import { useEffect } from 'react'

export const useAutosizeTextArea = (
    textAreaRef: HTMLTextAreaElement | null,
    value: string,
) => {
    useEffect(() => {
        if (textAreaRef) {
            // We need to reset the height momentarily to get the correct scrollHeight for the textarea
            textAreaRef.style.height = '0px'
            const scrollHeight = textAreaRef.scrollHeight

            // We then set the height directly, outside of the render loop
            // Trying to set this with state or a ref will product an incorrect value.
            textAreaRef.style.height = scrollHeight + 'px'
        }
    }, [textAreaRef, value])
}

export const useIsTouchScreen = () => {
    return (
        'ontouchstart' in window ||
        ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 0)
    )
}

export const useWarnBeforeUnload = (shouldWarn: boolean) => {
    useEffect(() => {
        const confirmationMessage = 'Changes you made may not be saved.'

        const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
            ;(e || window.event).returnValue = confirmationMessage
            return confirmationMessage
        }

        const beforeRouteHandler = (url: string) => {
            if (Router.pathname !== url && !confirm(confirmationMessage)) {
                Router.events.emit('routeChangeError')
                throw `Route change to "${url}" was aborted (this error can be safely ignored). See https://github.com/zeit/next.js/issues/2476.`
            }
        }

        if (shouldWarn) {
            window.addEventListener('beforeunload', beforeUnloadHandler)
            Router.events.on('routeChangeStart', beforeRouteHandler)
        } else {
            window.removeEventListener('beforeunload', beforeUnloadHandler)
            Router.events.off('routeChangeStart', beforeRouteHandler)
        }

        return () => {
            window.removeEventListener('beforeunload', beforeUnloadHandler)
            Router.events.off('routeChangeStart', beforeRouteHandler)
        }
    }, [shouldWarn])
}
