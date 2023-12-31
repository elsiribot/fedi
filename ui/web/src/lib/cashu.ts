import { Buffer } from 'buffer';
import {fedimint} from './bridge/index';
import { MSats } from '@fedi/common/types';

interface Proof {
  id: string;
  amount: number;
  secret: string;
  C: string;
}

interface Token {
  mint: string;
  proofs: Proof[];
}

interface SerializedToken {
  token: Token[];
  unit?: string;
  memo?: string;
}

interface MeltPayload {
  amount: number;
  pr: string;
  proofs: Array<Proof>;
};

function getDecodedToken(token: string): SerializedToken {
  // remove prefixes
  const uriPrefixes = ['web+cashu://', 'cashu://', 'cashu:', 'cashuA'];
  uriPrefixes.forEach((prefix) => {
    if (token.startsWith(prefix)) {
      token = token.slice(prefix.length);
    }
  });
  return handleTokens(token);
}

function handleTokens(token: string): SerializedToken {
  const obj = JSON.parse(Buffer.from(token, 'base64').toString());

  // check if v3
  if ('token' in obj) {
    return obj;
  }

  // check if v1
  if (Array.isArray(obj)) {
    return { token: [{ proofs: obj, mint: '' }] };
  }

  // if v2 token return v3 format
  return { token: [{ proofs: obj.proofs, mint: obj?.mints[0]?.url ?? '' }] };
}

// async function requestMeltQuote(mintHost: string, request: string) {
//   const response = await fetch(`${mintHost}/melt/quote/bolt11`, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify({
//       request,
//       unit: 'sat', // Cashu only supports satoshis
//     })
//   });

//   return await response.json();
// }

async function meltTokens(mintHost: string, payload: MeltPayload) {
  const response = await fetch(`${mintHost}/melt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return await response.json();
}

async function calculateAmountMsatsToMelt(totalTokensSats: number, feeReserve: number): Promise<MSats> {
  const amount = totalTokensSats - feeReserve;
  return amount * 1000 as MSats;
}

async function checkFees(mintHost: string, invoice: string) {
  const feeResponse = await fetch(`${mintHost}/checkfees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ pr: invoice })
  });
  return await feeResponse.json();
}

async function buildMeltPayload(amount: number, invoice: string, proofs: Proof[]): Promise<MeltPayload> {
  const meltPayload: MeltPayload = {
    amount: amount,
    pr: invoice,
    proofs,
  };
  return meltPayload;
}

async function handleFeesAndInvoice(totalTokensSats: number, feeReserve: number, federationId: string, mintHost: string): Promise<{amountMsats: MSats, invoice: string}> {
    // Calculate the amount to melt
    let amountMsats = await calculateAmountMsatsToMelt(totalTokensSats, feeReserve);

    // Request a pr for the amount to melt
    let invoice = await fedimint.generateInvoice(amountMsats, 'cashu melt', federationId);

    // Check fees with {pr: invoice}
    let feeData = await checkFees(mintHost, invoice);

    // If the fees are <= fee reserve it continues with the melt otherwise it makes another invoice using the new fees
    while (feeData.fee > feeReserve) {
        feeReserve = feeData.fee;
        amountMsats = await calculateAmountMsatsToMelt(totalTokensSats, feeReserve);
        invoice = await fedimint.generateInvoice(amountMsats, 'cashu melt', federationId);
        feeData = await checkFees(mintHost, invoice);
    }

    return { amountMsats, invoice };
}

async function cashuMeltTokens(encodedTokens: string, federationId: string): Promise<MSats> {
  const decodedTokens = getDecodedToken(encodedTokens);
  let totalMelted: MSats = 0 as MSats;

  // Iterate over each token
  for (const token of decodedTokens.token) {
    const mintHost = token.mint;
    const proofs = token.proofs;

    const feeReserve = 2; // Start with a fee_reserve of 2 sats

    // Check if we have enough tokens
    const totalTokensSats = proofs.reduce((sum, proof) => sum + proof.amount, 0);

    const { amountMsats, invoice } = await handleFeesAndInvoice(totalTokensSats, feeReserve, federationId, mintHost);

    // Build the melt payload
    const meltPayload = await buildMeltPayload(amountMsats / 1000, invoice, proofs);

    // Melt tokens
    const meltData = await meltTokens(mintHost, meltPayload);
    if (!meltData.paid) {
        throw new Error('Payment failed');
    }

    // Add the amount melted for this token to the total
    totalMelted += amountMsats;
  }

  // Return the total amount of MSats melted
  return totalMelted;
}

export { cashuMeltTokens };
