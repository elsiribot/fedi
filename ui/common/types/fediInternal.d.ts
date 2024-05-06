import { RequestInvoiceArgs } from 'webln';
export type EcashRequest = Omit<RequestInvoiceArgs, 'defaultMemo'>;
export declare const FediInternalVersion: 0;
