import { TFunction } from 'i18next';
import { AnyParsedData, ParsedBolt11, ParsedUnknownData, ParserDataType } from '../types/parser';
import { FedimintBridge } from './fedimint';
/** List of parse types that are usable before a user is a member of a federation */
export declare const ALLOWED_PARSER_TYPES_BEFORE_FEDERATION: ParserDataType[];
/** List of parse types that are not usable before recovery is complete */
export declare const BLOCKED_PARSER_TYPES_DURING_RECOVERY: ParserDataType[];
/** List of Legacy Code kinds **/
export declare const LEGACY_CODE_TYPES: ParserDataType[];
/**
 * Parses any data that would the user would input via QR code, copy / paste etc.
 * Returns a structured object that identifies the type of data, and formatted
 * keys for the data where available.
 */
export declare function parseUserInput<T extends TFunction>(raw: string, fedimint: FedimintBridge, t: T, federationId?: string | undefined): Promise<AnyParsedData>;
/**
 * Attempt to parse a BOLT 11 invoice.
 * BOLT 11 docs: https://github.com/lightning/bolts/blob/master/11-payment-encoding.md
 *
 * isBolt11 can be used to avoid using the bridge to
 * do a full decoding which requires a federationId to include
 * fee details
 */
export declare function isBolt11(raw: string): boolean;
export declare function parseBolt11(raw: string, fedimint: FedimintBridge, t: TFunction, federationId?: string | null): Promise<ParsedBolt11 | ParsedUnknownData | undefined>;
