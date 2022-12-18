import { bech32 } from 'bech32'
import { lnurlSignMessage } from '../bridge'

const bytesToString = (bytes: number[]) => {
    return String.fromCharCode.apply(null, bytes)
}

export function urlFromLnurl(lnurl: string): string {
    const decoded = bech32.decode(lnurl, 4096)
    return bytesToString(bech32.fromWords(decoded.words))
}

export function getK1(lnurl: string): string {
    const url = urlFromLnurl(lnurl)
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

export async function getToken(
    lnurl: string,
    federationId: string,
): Promise<string> {
    const url = urlFromLnurl(lnurl)
    const k1 = getK1(lnurl)
    const { signature, pubkey } = await lnurlSignMessage(k1, federationId)
    const updatedUrl = `${url}&sig=${signature}&key=${pubkey}`
    return fetch(updatedUrl).then(r => r.text())
}
