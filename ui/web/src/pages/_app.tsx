import { globalStyles } from '../styles'
import type { AppProps } from 'next/app'
import { Template } from '../components/Template'

const MyApp: React.FC<AppProps> = ({ Component, pageProps }) => {
    globalStyles()
    return (
        <Template>
            <Component {...pageProps} />
        </Template>
    )
}

export default MyApp
