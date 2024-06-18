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

type MeltQuoteResponse = {
    quote: string // Id of the cashu quote
    amount: Sats
    fee_reserve: Sats
}

type MeltPayload = {
    quote: string
    inputs: Array<Proof>
}

type MeltQuote = {
    mintHost: string
    meltPayload: MeltPayload
    amountMsats: MSats
    feesMsats: MSats
}

export type MeltSummary = {
    quotes: MeltQuote[]
    totalFees: MSats
    totalAmount: MSats
}

export type MeltResult = {
    mSats: MSats
}

// TODO: Add complete validation
export function validateCashuTokens(raw: string) {
    if (!raw.startsWith('cashuA')) {
        throw new Error('Invalid cashu token')
    }
}

// Takes cashu note, parses it into individual tokens for each mint
// Then, we melt for each mint (convert to lightning invoices and pay self)
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

// Given a lightning invoice, the cashu mint responds with a quoted
// amount of cashu ecash tokens to pay.
// Need to call this for each parsed token that belongs to a different mint
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

// Pays the invoice
/**
 * @param mintHost URL of the cashu mint
 * @param payload contains quoteId and ecash to pay the quote
 * @returns the result after paying the invoice from the cashu mint
 */
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

// After we have a quote for melting ecash,
// we need to an "updated" quote that includes the new fees
async function getUpdatedMeltQuote(
    totalTokensSats: Sats,
    federationId: string,
    mintHost: string,
    fedimint: FedimintBridge,
): Promise<{
    amountMsats: MSats
    meltQuoteId: string
    quoteFeeReserveMsats: MSats
}> {
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
        quoteFeeReserveMsats = amountUtils.satToMsat(fee_reserve) as MSats
        amountMsats = (quoteAmountMsats - quoteFeeReserveMsats) as MSats
        log.debug('fee_reserve + amount', fee_reserve + amount)
        log.debug('totalTokensMsats', totalTokensMsats)
    }
    log.debug('meltQuote?.quote', meltQuote?.quote)

    return {
        amountMsats, // Amount you get paid (with fees deducted)
        meltQuoteId: meltQuote?.quote || '',
        quoteFeeReserveMsats: quoteFeeReserveMsats as MSats, // fees
    }
}

/**
 *  After a cashu note is scanned, we want to convert the ecash tokens into fedimint.
 *  We do this by generating lightning invoices from the user's fedimint wallet for each cashu token
 *  and then paying the invoices from the cashu mint.
 *
 * @param tokens Cashu Tokens to melt (ecash --> lightning receive into fedimint)
 * @param fedimint Bridge
 * @param federationId federationId of the destination for melted ecash tokens
 * @returns
 */
export async function getMeltQuotes(
    tokens: string | SerializedToken,
    fedimint: FedimintBridge,
    federationId: string | undefined,
): Promise<MeltSummary> {
    if (!federationId) throw new Error('No federation id')
    const decodedTokens =
        typeof tokens === 'string' ? decodeCashuTokens(tokens) : tokens

    const quotes: MeltQuote[] = []

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

        // amountMsats is the amount you get paid (with fees deducted)
        const { amountMsats, meltQuoteId, quoteFeeReserveMsats } =
            await getUpdatedMeltQuote(
                totalTokensSats,
                federationId,
                mintHost,
                fedimint,
            )

        // Build the melt payload
        const meltPayload = await buildMeltPayload(meltQuoteId, proofs)
        log.debug('meltPayload', meltPayload)

        quotes.push({
            mintHost,
            meltPayload,
            amountMsats,
            feesMsats: quoteFeeReserveMsats,
        })
    }
    const totalFees = quotes.reduce(
        (sum, quote) => sum + quote.feesMsats,
        0,
    ) as MSats
    const totalAmount = quotes.reduce(
        (sum, quote) => sum + quote.amountMsats,
        0,
    ) as MSats
    // calculate total values/fees by summing quotes
    return {
        quotes,
        totalFees,
        totalAmount,
    }
}

/**
 *
 * Takes a list of melt quotes and executes them
 *
 * @param quotes List of melt quotes
 * @returns MeltResult
 */
export async function executeMelts(
    meltSummary: MeltSummary,
): Promise<MeltResult> {
    let totalMelted: MSats = 0 as MSats
    for (const quote of meltSummary.quotes) {
        const { mintHost, meltPayload, amountMsats } = quote
        const meltData = await meltTokens(mintHost, meltPayload)
        log.debug('meltData', meltData)
        if (!meltData.paid) {
            throw new Error('Payment failed')
        }
        // Add the amount melted for this token to the total
        totalMelted = (totalMelted + amountMsats) as MSats
    }

    log.debug('totalMelted', totalMelted)
    return { mSats: totalMelted }
}
