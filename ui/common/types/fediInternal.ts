import { RequestInvoiceArgs } from 'webln'

export type EcashRequest = Omit<RequestInvoiceArgs, 'defaultMemo'>

export type FediInternalVersion = '0.0.0'
