import { ClientConfigMetadata, Federation, MSats, FediMod, SupportedCurrency, XmppConnectionOptions, PublicFederation, FederationListItem, JoinPreview } from '../types';
import { RpcCommunity } from '../types/bindings';
import { FedimintBridge } from './fedimint';
/**
 * This function is used to look for the meta URL to use as an external override
 * to any meta fields that may exist in consensus-signed metadata
 *
 * This fallback behavior is needed to preserve backwards compatibility since
 * fedimint uses meta_override_url and Fedi uses meta_external_url for essentially
 * the same behavior
 *
 * Fedi should phase out its use of meta_external_url and use the fedimint standard
 * meta_override_url but until all known federations stop using meta_external_url
 * we support both via this function
 */
export declare const getMetaUrl: (meta: ClientConfigMetadata) => string | undefined;
type ExternalMetaJson = Record<string, Federation['meta'] | undefined>;
/**
 * Runs `fetchFederationExternalMetadata` on a list of federations and assembles
 * the results as a map of federation id -> meta. Optional callback is called with
 * (federationId, meta).
 */
export declare const fetchFederationsExternalMetadata: (federations: Pick<FederationListItem, 'id' | 'meta' | 'hasWallet'>[], onBackgroundSuccess?: ((federationId: FederationListItem['id'], meta: FederationListItem['meta']) => void) | undefined) => Promise<ExternalMetaJson>;
export declare const fetchPublicFederations: () => Promise<PublicFederation[]>;
export declare const getFederationDefaultCurrency: (metadata: ClientConfigMetadata) => SupportedCurrency | null;
export declare const getFederationFixedExchangeRate: (metadata: ClientConfigMetadata) => number | null;
/** @deprecated xmpp */
export declare const getFederationChatServerDomain: (metadata: ClientConfigMetadata) => string | null;
export declare const makeChatServerOptions: (domain: string) => XmppConnectionOptions;
export declare const getFederationMaxBalanceMsats: (metadata: ClientConfigMetadata) => MSats | undefined;
export declare const getFederationMaxInvoiceMsats: (metadata: ClientConfigMetadata) => MSats | undefined;
export declare const getFederationMaxStableBalanceMsats: (metadata: ClientConfigMetadata) => MSats | undefined;
export declare const shouldShowInviteCode: (metadata: ClientConfigMetadata) => boolean;
export declare const shouldShowJoinFederation: (metadata: ClientConfigMetadata) => boolean;
export declare const shouldShowSocialRecovery: (federation: FederationListItem) => boolean;
export declare const shouldShowOfflineWallet: (metadata: ClientConfigMetadata) => boolean;
export declare const shouldEnableOnchainDeposits: (metadata: ClientConfigMetadata) => boolean;
export declare const shouldEnableFediInternalInjection: (metadata: ClientConfigMetadata) => boolean;
export declare const shouldEnableStabilityPool: (metadata: ClientConfigMetadata) => boolean;
export declare const shouldEnableNostr: (federation: FederationListItem) => boolean;
export declare function supportsSingleSeed(federation: FederationListItem): boolean;
export declare const getFederationGroupChats: (metadata: ClientConfigMetadata) => string[];
export declare const getFederationFediMods: (metadata: ClientConfigMetadata) => FediMod[];
type PopupInfo = {
    endTimestamp: string;
    countdownMessage: string | null;
    endedMessage: string | null;
};
export declare const getFederationPopupInfo: (metadata: ClientConfigMetadata) => PopupInfo | null;
export declare const getFederationTosUrl: (metadata: ClientConfigMetadata) => string | null;
export declare const getFederationName: (metadata: ClientConfigMetadata) => string | null;
export declare const getFederationWelcomeMessage: (metadata: ClientConfigMetadata) => string | null;
export declare const getFederationPinnedMessage: (metadata: ClientConfigMetadata) => string | null;
export declare const getFederationIconUrl: (metadata: ClientConfigMetadata) => string | null;
export declare const getIsFederationSupported: (federation: Pick<FederationListItem, 'version' | 'hasWallet'>) => boolean;
export declare const coerceFederationListItem: (community: RpcCommunity) => FederationListItem;
export declare const coerceJoinPreview: (preview: RpcCommunity) => JoinPreview;
export declare const detectInviteCodeType: (code: string) => 'federation' | 'community';
/**
 * detects if the code belongs to a federation or a no-wallet
 * community and joins the appropriate one. It then coerces
 * the result into a FederationListItem
 * @param code
 */
export declare const joinFromInvite: (fedimint: FedimintBridge, code: string) => Promise<FederationListItem>;
export declare const previewInvite: (fedimint: FedimintBridge, code: string) => Promise<JoinPreview>;
export {};
