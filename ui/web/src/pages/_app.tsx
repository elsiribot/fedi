import type { AppProps } from 'next/app'
import { useEffect } from 'react'

import { FediBridgeGateway } from '../components/FediBridgeGateway'
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
            <FediBridgeGateway>
                <Template>
                    <Component {...pageProps} />
                </Template>
            </FediBridgeGateway>
        </>
    )
}

export default MyApp
