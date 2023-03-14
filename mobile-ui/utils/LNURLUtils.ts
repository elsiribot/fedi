import { bech32 } from 'bech32'
import { lnurlSignMessage } from '../bridge'

class LNURLUtils {
    static DECODE_LENGTH_LIMIT: number = 4096

    bytesToString = (bytes: number[]) => {
        return String.fromCharCode.apply(null, bytes)
    }
    urlFromLnurl(lnurl: string): string {
        const decoded = bech32.decode(lnurl, LNURLUtils.DECODE_LENGTH_LIMIT)
        return this.bytesToString(bech32.fromWords(decoded.words))
    }
    getK1(lnurl: string): string {
        const url = this.urlFromLnurl(lnurl)
        // URLSearchParams doesn't work on React Native ...
        var regex = /[?&]([^=#]+)=([^&#]*)/g,
            match
        while ((match = regex.exec(url))) {
            if (match[1] === 'k1') {
                return match[2]
            }
        }
        throw new Error('k1 not found')
    }
    async getToken(lnurl: string, federationId: string): Promise<string> {
        const url = this.urlFromLnurl(lnurl)
        const k1 = this.getK1(lnurl)
        const { signature, pubkey } = await lnurlSignMessage(k1, federationId)
        const updatedUrl = `${url}&sig=${signature}&key=${pubkey}`
        return fetch(updatedUrl).then(r => r.text())
    }
}

const lnurlUtils = new LNURLUtils()
export default lnurlUtils
