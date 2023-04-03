import '../styles/reset.scss';
import '../styles/fonts.scss';
import type { AppProps } from "next/app";

const MyApp: React.FC<AppProps> = ({ Component, pageProps, router }) => {
  return <Component {...pageProps} />
}

export default MyApp
