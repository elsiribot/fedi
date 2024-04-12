import { ObservableVecUpdate, SerdeVectorDiff } from '../types/bindings';
/**
 * Apply diff from bridge SerdeVectorDiff to an observable list.
 * TODO: Return identical reference if no changes are made, like upsertListItem.
 */
export declare function applyObservableUpdate<T>(prev: T[], update: SerdeVectorDiff<T>): T[];
/**
 * Apply a set of diffs from bridge SerdeVectorDiff to an observable list.
 * TODO: Return identical reference if no changes are made, like upsertListItem.
 */
export declare function applyObservableUpdates<T>(original: T[], updates: ObservableVecUpdate<T>['update']): T[];
/**
 * Given an observable update, apply a mapping function to it. Handles the
 * various kinds of updates with their different shapes.
 */
export declare function mapObservableUpdate<T, R>(update: SerdeVectorDiff<T>, map: (value: T) => R): SerdeVectorDiff<R>;
/**
 * Given a set of observable updates, apply a mapping function to them. Handles
 * the various kinds of updates with their different shapes.
 */
export declare function mapObservableUpdates<T, R>(updates: ObservableVecUpdate<T>['update'], map: (value: T) => R): SerdeVectorDiff<R>[];
export declare function makeInitialResetUpdate<T>(values: T[]): SerdeVectorDiff<T>[];
/**
 * Given a set of observable updates, get a set of IDs that belong to items
 * that have been added to the list.
 */
export declare function getNewObservableIds<T>(updates: ObservableVecUpdate<T>['update'], getId: (value: T) => string | false | null | undefined): Set<string>;
