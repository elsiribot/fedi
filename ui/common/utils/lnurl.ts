import { ParsedLnurlAuth } from '../types'
import { FedimintBridge } from './fedimint'

/**
 * Given a federation and a set of parsed LNURL Auth data, submit an auth request.
 * Can throw with a standard `fetch` error, or an error containing the message
 * from the service.
 */
export async function lnurlAuth(
    fedimint: FedimintBridge,
    federationId: string,
    lnurlData: ParsedLnurlAuth['data'],
) {
    const { signature, pubkey } = await fedimint.lnurlSignMessage(
        lnurlData.k1,
        federationId,
    )
    const callbackUrl = new URL(`${lnurlData.callback}`)
    callbackUrl.searchParams.set('sig', signature)
    callbackUrl.searchParams.set('key', pubkey)

    const res = await fetch(callbackUrl.toString()).then(r => r.json())
    if (res.status === 'OK') {
        return
    } else {
        throw new Error(res.reason || 'errors.unknown-error')
    }
}
