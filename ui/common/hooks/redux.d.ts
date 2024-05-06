import { TypedUseSelectorHook } from 'react-redux';
import { CommonDispatch, CommonState } from '../redux';
/**
 * Provides a `dispatch` function that allows you to dispatch common redux actions.
 */
export declare const useCommonDispatch: () => CommonDispatch;
/**
 * Provides common state from redux, given a selector.
 */
export declare const useCommonSelector: TypedUseSelectorHook<CommonState>;
