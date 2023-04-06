import type { AppProps } from 'next/app'
import { globalStyles } from '../styles'
import { Template } from '../components/Template'
import { detectLanguage } from '../localization/i18n'
import { useEffect } from 'react'

const MyApp: React.FC<AppProps> = ({ Component, pageProps }) => {
    globalStyles()

    useEffect(() => {
        detectLanguage()
    }, [])

    return (
        <Template>
            <Component {...pageProps} />
        </Template>
    )
}

export default MyApp
