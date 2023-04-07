import type { AppProps } from 'next/app'
import { useEffect } from 'react'

import { PWAMetaTags } from '../components/PWAMetaTags'
import { Template } from '../components/Template'
import { detectLanguage } from '../localization/i18n'
import { globalStyles } from '../styles'

const MyApp: React.FC<AppProps> = ({ Component, pageProps }) => {
    globalStyles()

    useEffect(() => {
        detectLanguage()
    }, [])

    return (
        <>
            <PWAMetaTags />
            <Template>
                <Component {...pageProps} />
            </Template>
        </>
    )
}

export default MyApp
