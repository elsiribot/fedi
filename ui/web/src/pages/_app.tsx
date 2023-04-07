import { globalStyles } from '../styles'
import type { AppProps } from 'next/app'

const MyApp: React.FC<AppProps> = ({ Component, pageProps }) => {
    globalStyles()
    return <Component {...pageProps} />
}

export default MyApp
