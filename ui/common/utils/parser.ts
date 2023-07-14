import { validate as validateBitcoinAddress } from 'bitcoin-address-validation'
import { TFunction } from 'i18next'
import { getParams as getLnurlParams } from 'js-lnurl'
import { parse as queryStringParse } from 'querystring'

import { Btc } from '../types'
import {
    AnyParsedData,
    ParserDataType,
    ParsedBip21,
    ParsedBitcoinAddress,
    ParsedBolt11,
    ParsedBolt12,
    ParsedFederationInvite,
    ParsedFediChatGroup,
    ParsedFediChatMember,
    ParsedFedimintEcash,
    ParsedLnurlAuth,
    ParsedLnurlPay,
    ParsedLnurlWithdraw,
    ParsedUnknownData,
} from '../types/parser'
import { FedimintBridge } from './fedimint'
import { decodeGroupInvitationLink, decodeDirectChatLink } from './xmpp'

/**
 * Parses any data that would the user would input via QR code, copy / paste etc.
 * Returns a structured object that identifies the type of data, and formatted
 * keys for the data where available.
 */
export function parseUserInput<T extends TFunction>(
    raw: string,
    fedimint: FedimintBridge,
    t: T,
): Promise<AnyParsedData> {
    return new Promise(resolve => {
        // Run all parsers simultaneously.
        const parserPromises = [
            parseBolt11(raw, fedimint),
            parseBolt12(raw),
            parseLnurl(raw, t),
            parseBitcoinAddress(raw),
            parseBip21(raw, fedimint),
            parseFediUri(raw),
            parseFedimintInvite(raw),
            parseFedimintEcash(raw),
        ]

        // Return the first parser to come back with a non-falsy value.
        let resolved = false
        for (const parserPromise of parserPromises) {
            Promise.resolve(parserPromise)
                .then(result => {
                    if (result && !resolved) {
                        resolved = true
                        resolve(result)
                    }
                })
                .catch(err => {
                    console.warn(
                        'Encountered an error running a QR parser, ignoring',
                        err,
                    )
                })
        }

        // If all parsers return nothing, return unknown.
        Promise.all(parserPromises).then(() => {
            if (!resolved) {
                resolve({
                    type: ParserDataType.Unknown,
                    data: { message: t('feature.parser.unrecognized') },
                })
            }
        })
    })
}

/**
 * Attempt to parse an LNURL or lightning address.
 * LNURL docs: https://github.com/lnurl/luds
 * Lightning address docs: https://github.com/andrerfneves/lightning-address
 */
async function parseLnurl(
    raw: string,
    t: TFunction,
): Promise<
    | ParsedLnurlAuth
    | ParsedLnurlPay
    | ParsedLnurlWithdraw
    | ParsedUnknownData
    | undefined
> {
    const lnRaw = stripProtocol(raw, 'lightning').toLowerCase()
    let lnurlParamPromise: ReturnType<typeof getLnurlParams> | undefined

    // LNURLs and lightning addresses both use `getLnurlParams` and are
    // handled the same way, so get the promise separately but handle it
    // in one place.
    if (lnRaw.startsWith('lnurl') || lnRaw.startsWith('keyauth')) {
        lnurlParamPromise = getLnurlParams(lnRaw)
    } else if (lnRaw.match(/^[^@]+@[^@]+\.[^@]+$/)) {
        const [username, domain] = lnRaw.split('@')
        if (username && domain) {
            const url = `https://${domain}/.well-known/lnurlp/${username}`
            lnurlParamPromise = getLnurlParams(url)
        }
    }

    if (!lnurlParamPromise) return

    try {
        const params = await lnurlParamPromise
        if (!('tag' in params)) {
            // If the Lnurl
            // Parse certain error types for special handling.
            if (params.status === 'ERROR') {
                if (params.reason.includes('Invalid URL')) {
                    // Ignore this and try to parse using things below.
                }
                return {
                    type: ParserDataType.Unknown,
                    // TODO: i18n?
                    data: { message: params.reason },
                }
            }
        } else if (params.tag === 'payRequest') {
            return {
                type: ParserDataType.LnurlPay,
                data: {
                    domain: params.domain,
                    callback: params.callback,
                    metadata: params.decodedMetadata,
                    minSendable: params.minSendable,
                    maxSendable: params.maxSendable,
                },
            }
        } else if (params.tag === 'withdrawRequest') {
            return {
                type: ParserDataType.LnurlWithdraw,
                data: {
                    domain: params.domain,
                    callback: params.callback,
                    k1: params.k1,
                    defaultDescription: params.defaultDescription,
                    minWithdrawable: params.minWithdrawable,
                    maxWithdrawable: params.maxWithdrawable,
                },
            }
        } else if (params.tag === 'login') {
            return {
                type: ParserDataType.LnurlAuth,
                data: {
                    domain: params.domain,
                    callback: params.callback,
                    k1: params.k1,
                    // TODO: https://github.com/nbd-wtf/js-lnurl/issues/9
                    // action: params.action,
                },
            }
        } else {
            console.warn('parseLnurl unsupported LNURL params', params)
            return {
                type: ParserDataType.Unknown,
                data: {
                    message: t('feature.parser.unsupported-lnurl', {
                        type: params.tag,
                    }),
                },
            }
        }
    } catch (err) {
        console.warn('parseLnurl error', err)
        /* no-op, other parsers will be attempted */
    }
}

/**
 * Attempt to parse a BOLT 11 invoice.
 * BOLT 11 docs: https://github.com/lightning/bolts/blob/master/11-payment-encoding.md
 */
async function parseBolt11(
    raw: string,
    fedimint: FedimintBridge,
): Promise<ParsedBolt11 | undefined> {
    const lnRaw = stripProtocol(raw, 'lightning').toLowerCase()

    // Quick detection of BOLT 11, but ignore BOLT 12 and LNURL.
    if (
        !lnRaw.startsWith('ln') ||
        lnRaw.startsWith('lno') ||
        lnRaw.startsWith('lnurl')
    ) {
        return
    }

    try {
        const decoded = await fedimint.decodeInvoice(lnRaw)

        return {
            type: ParserDataType.Bolt11,
            data: {
                bolt11: lnRaw,
                ...decoded,
            },
        }
    } catch (err) {
        console.warn('parseBolt11 error', err)
        /* no-op, other parsers will be attempted */
    }
}

/**
 * Attempt to parse a BOLT 12 invoice. Currently not supported, so no data is
 * actually parsed from the invoice.
 * BOLT 12 docs: https://bolt12.org/
 */
function parseBolt12(raw: string): ParsedBolt12 | undefined {
    const lnRaw = stripProtocol(raw, 'lightning').toLowerCase()
    if (lnRaw.startsWith('lno1')) {
        return { type: ParserDataType.Bolt12, data: null }
    }
}

/**
 * Parse any kind of on-chain address. Only handles raw addresses, URIs are
 * handled by BIP 21.
 */
function parseBitcoinAddress(raw: string): ParsedBitcoinAddress | undefined {
    if (validateBitcoinAddress(raw)) {
        return {
            type: ParserDataType.BitcoinAddress,
            data: { address: raw },
        }
    }
}

/**
 * Parse a BIP 21 URI. Extended with unified QR code lightning support.
 * BIP 21 docs: https://github.com/bitcoin/bips/blob/master/bip-0021.mediawiki
 * Unified QR code docs: https://bitcoinqr.dev/
 */
async function parseBip21(
    raw: string,
    fedimint: FedimintBridge,
): Promise<ParsedBip21 | ParsedBolt11 | undefined> {
    // Only consider things that start with URIs, otherwise it's handled by parseBitcoinAddress.
    if (!raw.toLowerCase().startsWith('bitcoin:')) return

    // Strip protocol but don't lower case, query param values may be case sensitive
    const btcRaw = stripProtocol(raw, 'bitcoin')
    const btcAddress = btcRaw.split('?')[0]
    if (!validateBitcoinAddress(btcAddress)) {
        return
    }

    // Parse query params on BIP 21
    const queryParams = queryStringParse(btcRaw.split('?')[1] || '')
    const param = (key: string): string | undefined => {
        const value = queryParams[key]
        return value ? (Array.isArray(value) ? value[0] : value) : undefined
    }
    const amount = param('amount')
    const label = param('label')
    const message = param('message')
    const bolt11 = param('lightning')

    // If lightning invoice is present, return this as a bolt11 rather than a bip21
    if (bolt11) {
        try {
            const invoice = await fedimint.decodeInvoice(bolt11)
            return {
                type: ParserDataType.Bolt11,
                data: {
                    bolt11,
                    fallbackAddress: btcAddress,
                    ...invoice,
                },
            }
        } catch (err) {
            /* no-op, return bip21 as-is */
        }
    }

    return {
        type: ParserDataType.Bip21,
        data: {
            address: btcAddress,
            amount: amount ? (parseFloat(amount) as Btc) : undefined,
            label,
            message,
        },
    }
}

function parseFediUri(
    raw: string,
): ParsedFediChatGroup | ParsedFediChatMember | undefined {
    if (!raw.toLowerCase().startsWith('fedi:')) {
        return
    }

    // Chat member
    try {
        const id = decodeDirectChatLink(raw)
        return {
            type: ParserDataType.FediChatMember,
            data: { id },
        }
    } catch {
        // no-op
    }

    // Chat group
    try {
        const id = decodeGroupInvitationLink(raw)
        return {
            type: ParserDataType.FediChatGroup,
            data: { id },
        }
    } catch {
        // no-op
    }
}

function parseFedimintInvite(raw: string): ParsedFederationInvite | undefined {
    // Federation invite code
    // TODO: Proper bech32 validation
    // TODO: Use future bridge method for fetching federation info https://github.com/fedibtc/fedi/issues/1380
    // TODO: Consider standard URI prefix?
    if (raw.toLowerCase().startsWith('fed1')) {
        return { type: ParserDataType.FedimintInvite, data: { invite: raw } }
    }
}

function parseFedimintEcash(raw: string): ParsedFedimintEcash | undefined {
    // Fedimint ecash
    // TODO: Proper validation
    if (raw.startsWith('AAAAAAAA')) {
        return { type: ParserDataType.FedimintEcash, data: null }
    }
}

/**
 * Removes the protocol from the front of a string. Supports both
 * `protocol:` and `protocol://` formats, case insensitive.
 */
function stripProtocol(raw: string, protocol: string) {
    return raw.replace(new RegExp(`^${protocol}:\\/?\\/?`, 'i'), '')
}
