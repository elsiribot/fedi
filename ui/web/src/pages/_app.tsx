import '../styles/reset.css'
import '../styles/fonts.css'
import type { AppProps } from 'next/app'

const MyApp: React.FC<AppProps> = ({ Component, pageProps, router }) => {
    return <Component {...pageProps} />
}

export default MyApp
