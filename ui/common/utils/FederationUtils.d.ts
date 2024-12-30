import { FederationMetadata, Community, FederationListItem, FederationStatus, FediMod, JoinPreview, LightningGateway, LoadedFederation, MSats, PublicFederation, SupportedCurrency } from '../types';
import { GuardianStatus, RpcCommunity, RpcFederation } from '../types/bindings';
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
export declare const getMetaUrl: (meta: FederationMetadata) => string | undefined;
type ExternalMetaJson = Record<string, Community['meta'] | undefined>;
/**
 * Runs `fetchFederationExternalMetadata` on a list of federations and assembles
 * the results as a map of federation id -> meta. Optional callback is called with
 * (federationId, meta).
 *
 * Note this currently seems very overcomplicated since it doesn't
 * need to handle multiple communities with external meta urls anymore
 * and it wasn't worth refactoring to remove the extra complexity.
 *
 * TODO: Remove this function entirely when the bridge can provide us with the global
 * community meta and we don't have to fetch it ourselves
 */
export declare const fetchFederationsExternalMetadata: (communitiesToFetch: Pick<Community, "id" | "meta" | "hasWallet">[], onBackgroundSuccess?: (federationId: Community["id"], meta: Community["meta"]) => void) => Promise<ExternalMetaJson>;
export declare const fetchPublicFederations: () => Promise<PublicFederation[]>;
export declare const getFederationDefaultCurrency: (metadata: FederationMetadata) => SupportedCurrency | null;
export declare const getFederationFixedExchangeRate: (metadata: FederationMetadata) => number | null;
export declare const getFederationMaxBalanceMsats: (metadata: FederationMetadata) => MSats | undefined;
export declare const getFederationMaxInvoiceMsats: (metadata: FederationMetadata) => MSats | undefined;
export declare const getFederationMaxStableBalanceMsats: (metadata: FederationMetadata) => MSats | undefined;
export declare const shouldShowInviteCode: (metadata: FederationMetadata) => boolean;
export declare const shouldShowJoinFederation: (metadata: FederationMetadata) => boolean;
export declare const shouldShowSocialRecovery: (federation: LoadedFederation) => boolean;
export declare const shouldShowOfflineWallet: (metadata: FederationMetadata) => boolean;
export declare const shouldEnableOnchainDeposits: (metadata: FederationMetadata) => boolean;
export declare const shouldEnableStabilityPool: (metadata: FederationMetadata) => boolean;
export declare function supportsSingleSeed(federation: LoadedFederation): boolean;
export declare const getFederationGroupChats: (metadata: FederationMetadata) => string[];
export declare const getFederationFediMods: (metadata: FederationMetadata) => FediMod[];
type PopupInfo = {
    endTimestamp: string;
    countdownMessage: string | null;
    endedMessage: string | null;
};
export declare const getFederationPopupInfo: (metadata: FederationMetadata) => PopupInfo | null;
export declare const getFederationTosUrl: (metadata: FederationMetadata) => string | null;
export declare const getFederationName: (federation: FederationListItem | JoinPreview) => string;
export declare const getFederationWelcomeMessage: (metadata: FederationMetadata) => string | null;
export declare const getFederationPinnedMessage: (metadata: FederationMetadata) => string | null;
export declare const getFederationIconUrl: (metadata: FederationMetadata) => string | null;
export declare const getIsFederationSupported: (federation: JoinPreview) => boolean;
export declare const coerceLoadedFederation: (federation: {
    init_state: "ready";
} & RpcFederation) => LoadedFederation;
export declare const coerceFederationListItem: (community: RpcCommunity) => FederationListItem;
export declare const coerceJoinPreview: (preview: RpcCommunity) => JoinPreview;
export declare const detectInviteCodeType: (code: string) => "federation" | "community";
/**
 * detects if the code belongs to a federation or a no-wallet
 * community and joins the appropriate one. It then coerces
 * the result into a FederationListItem
 * @param code
 */
export declare const joinFromInvite: (fedimint: FedimintBridge, code: string, recoverFromScratch?: boolean) => Promise<FederationListItem>;
export declare const previewInvite: (fedimint: FedimintBridge, code: string) => Promise<JoinPreview>;
export declare const getGuardianStatuses: (fedimint: FedimintBridge, federationId: string) => Promise<GuardianStatus[]>;
export declare const switchGateway: (fedimint: FedimintBridge, federationId: string, nodePubKey: string) => Promise<void>;
export declare const getFederationStatus: (fedimint: FedimintBridge, federationId: FederationListItem["id"]) => Promise<FederationStatus>;
export declare const getGatewaysList: (fedimint: FedimintBridge, federationId: string) => Promise<LightningGateway[]>;
export {};
