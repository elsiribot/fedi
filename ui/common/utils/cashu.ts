import { Buffer } from 'buffer'

import { MSats, Sats } from '@fedi/common/types'

import amountUtils from './AmountUtils'
import { FedimintBridge } from './fedimint'
import { makeLog } from './log'

const log = makeLog('common/utils/cashu')

interface Proof {
    id: string
    amount: number
    secret: string
    C: string
}

interface Token {
    mint: string
    proofs: Proof[]
}

export interface SerializedToken {
    token: Token[]
    unit?: string
    memo?: string
}

interface MeltQuoteResponse {
    quote: string
    amount: Sats
    fee_reserve: Sats
}

interface MeltPayload {
    quote: string
    inputs: Array<Proof>
}

export function decodeCashuTokens(token: string): SerializedToken {
    // remove prefixes
    const uriPrefixes = ['web+cashu://', 'cashu://', 'cashu:']
    uriPrefixes.forEach(prefix => {
        if (token.startsWith(prefix)) {
            token = token.slice(prefix.length)
        }
    })
    if (!token.startsWith('cashuA')) {
        throw new Error('Invalid cashu token')
    }
    const rawToken = token.replace('cashuA', '')

    const parsedTokenBuffer = JSON.parse(
        Buffer.from(rawToken, 'base64').toString(),
    )
    // check if v3
    if (
        'token' in parsedTokenBuffer &&
        Array.isArray(parsedTokenBuffer.token)
    ) {
        return parsedTokenBuffer
    }
    // if v2 token return v3 format
    if (
        'proofs' in parsedTokenBuffer &&
        'mints' in parsedTokenBuffer &&
        parsedTokenBuffer.mints.length > 0 &&
        parsedTokenBuffer.mints[0].url
    ) {
        return {
            token: [
                {
                    proofs: parsedTokenBuffer.proofs,
                    mint: parsedTokenBuffer.mints[0].url,
                },
            ],
        }
    }
    // check if v1
    if (Array.isArray(parsedTokenBuffer)) {
        throw new Error('v1 cashu tokens are not supported')
    }

    throw new Error('No valid ecash proofs found')
}

async function getMeltQuote(
    mintHost: string,
    invoice: string,
): Promise<MeltQuoteResponse> {
    log.debug('getMeltQuote mintHost, invoice', mintHost, invoice)
    const feeResponse = await fetch(`${mintHost}/v1/melt/quote/bolt11`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ request: invoice, unit: 'sat' }),
    })
    const json = await feeResponse.json()
    log.debug('getMeltQuote json', json)

    return json
}

async function meltTokens(mintHost: string, payload: MeltPayload) {
    const response = await fetch(`${mintHost}/v1/melt/bolt11`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })

    return await response.json()
}

async function buildMeltPayload(
    meltQuoteId: string,
    proofs: Proof[],
): Promise<MeltPayload> {
    const meltPayload: MeltPayload = {
        quote: meltQuoteId,
        inputs: proofs,
    }
    return meltPayload
}

async function getUpdatedMeltQuote(
    totalTokensSats: Sats,
    federationId: string,
    mintHost: string,
    fedimint: FedimintBridge,
): Promise<{ amountMsats: MSats; meltQuoteId: string }> {
    let invoice = ''
    let meltQuote: MeltQuoteResponse | undefined = undefined
    const totalTokensMsats = amountUtils.satToMsat(totalTokensSats)
    let amountMsats = totalTokensMsats
    let quoteAmountMsats = 0
    // Start with max fee to ensure at least 1 melt quote attempt
    let quoteFeeReserveMsats = Number.MAX_SAFE_INTEGER
    // If the fees are <= fee reserve it continues with the melt otherwise it makes another invoice using the new fees
    while (quoteFeeReserveMsats + quoteAmountMsats > totalTokensMsats) {
        log.debug(`generateInvoice for ${amountMsats} msats`)
        invoice = await fedimint.generateInvoice(
            amountMsats,
            'cashu melt',
            federationId,
        )
        meltQuote = await getMeltQuote(mintHost, invoice)
        log.debug('meltQuote', meltQuote)
        const { amount, fee_reserve } = meltQuote
        quoteAmountMsats = amountUtils.satToMsat(amount)
        quoteFeeReserveMsats = amountUtils.satToMsat(fee_reserve)
        amountMsats = (quoteAmountMsats - quoteFeeReserveMsats) as MSats
        log.debug('fee_reserve + amount', fee_reserve + amount)
        log.debug('totalTokensMsats', totalTokensMsats)
    }
    log.debug('meltQuote?.quote', meltQuote?.quote)

    return { amountMsats, meltQuoteId: meltQuote?.quote || '' }
}

export async function redeemCashuTokens(
    tokens: string | SerializedToken,
    fedimint: FedimintBridge,
    federationId: string | undefined,
): Promise<MSats> {
    if (!federationId) throw new Error('No federation id')
    const decodedTokens =
        typeof tokens === 'string' ? decodeCashuTokens(tokens) : tokens
    let totalMelted: MSats = 0 as MSats

    log.debug('tokens', tokens)
    log.debug('decodedTokens', decodedTokens)

    // Iterate over each token
    for (const token of decodedTokens.token) {
        const mintHost = token.mint
        const proofs = token.proofs
        log.debug('token.proofs', token.proofs)

        // Check if we have enough tokens
        const totalTokensSats = proofs.reduce(
            (sum, proof) => sum + proof.amount,
            0,
        ) as Sats

        const { amountMsats, meltQuoteId } = await getUpdatedMeltQuote(
            totalTokensSats,
            federationId,
            mintHost,
            fedimint,
        )

        // Build the melt payload
        const meltPayload = await buildMeltPayload(meltQuoteId, proofs)
        log.debug('meltPayload', meltPayload)

        // Melt tokens
        const meltData = await meltTokens(mintHost, meltPayload)
        log.debug('meltData', meltData)
        if (!meltData.paid) {
            throw new Error('Payment failed')
        }

        // Add the amount melted for this token to the total
        totalMelted = (totalMelted + amountMsats) as MSats
    }
    log.debug('totalMelted', totalMelted)

    // Return the total amount of MSats melted
    return totalMelted
}
