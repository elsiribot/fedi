/**
 * Submit a fetch request to Fedimod URL to try and find metadata to use
 * as a default icon and title
 */
export declare function fetchMetadataFromUrl(url: URL | string): Promise<{
    fetchedIcon: string;
    fetchedTitle: string;
}>;
/**
 * Filters out duplicate mods
 */
export declare const deduplicate: <T extends {
    id: string;
}>(arr: T[]) => T[];
