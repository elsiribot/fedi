import { RequestInvoiceArgs } from 'webln'

export type EcashRequest = Omit<RequestInvoiceArgs, 'defaultMemo'>

export const FediInternalVersion = 0 as const
