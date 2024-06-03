import { CommonState } from '../redux';
import { LatestStoredState, StorageApi } from '../types/storage';
export declare const STATE_STORAGE_KEY = "fedi:state";
/**
 * Given the current Redux state, transform it into the latest storage state.
 */
export declare function transformStateToStorage(state: CommonState): LatestStoredState;
/**
 * Retrieve state from storage. Automatically runs migrations on it to ensure
 * it matches the LatestStoredState interface.
 */
export declare function getStoredState(storage: StorageApi): Promise<LatestStoredState | null>;
/**
 * Given the previous version of state and the next version of state, return whether
 * or not there have been any changes that should be persisted.
 */
export declare function hasStorageStateChanged(oldState: CommonState, newState: CommonState): boolean;
