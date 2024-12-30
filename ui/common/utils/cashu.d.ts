import { MSats } from '@fedi/common/types';
import { ResultObject } from './cbor';
import { FedimintBridge } from './fedimint';
type PayloadProof = {
    amount: number;
    secret: string;
    C: string;
    id: string;
};
type PayloadToken = {
    proofs: PayloadProof[];
};
type Payload = {
    token: PayloadToken[];
    mint: string;
};
type Proof = {
    amount: number;
    secret: string;
    C: string;
};
type Token = {
    proofs: Proof[];
    id: string;
};
export type ParsedToken = {
    token: Token[];
    unit?: string;
    mint: string;
    memo?: string;
};
type MeltPayload = {
    quote: string;
    inputs: Array<Proof>;
};
type MeltQuote = {
    mintHost: string;
    meltPayload: MeltPayload;
    amountMsats: MSats;
    feesMsats: MSats;
};
export type MeltSummary = {
    quotes: MeltQuote[];
    totalFees: MSats;
    totalAmount: MSats;
};
export type MeltResult = {
    mSats: MSats;
};
type CashuV4Proof = {
    a: number;
    s: string;
    c: Uint8Array;
    d: ResultObject | undefined;
    w: string | undefined;
};
export type CashuV4Token = {
    i: Uint8Array;
    p: Array<CashuV4Proof>;
};
export declare function validateCashuTokens(raw: string): string;
export declare function decodeCashuTokens(raw: string): Payload;
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
export declare function getMeltQuotes(tokens: Payload, fedimint: FedimintBridge, federationId: string | undefined): Promise<MeltSummary>;
/**
 *
 * Takes a list of melt quotes and executes them
 *
 * @param quotes List of melt quotes
 * @returns MeltResult
 */
export declare function executeMelts(meltSummary: MeltSummary): Promise<MeltResult>;
export {};
