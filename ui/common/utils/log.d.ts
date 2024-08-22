import { StorageApi } from '../types';
/**
 * Configure the logger with platform and environment specific configuration.
 * Can safely be called multiple times with any changes to configuration.
 */
export declare function configureLogging(storageArg: StorageApi): void;
/**
 * Create a logging object. Pass in a context string to be included with all
 * logs to make logs easier to find.
 */
export declare function makeLog(context: string): {
    debug: (msg: string, ...extra: unknown[]) => void;
    info: (msg: string, ...extra: unknown[]) => void;
    warn: (msg: string, ...extra: unknown[]) => void;
    error: (msg: string, ...extra: unknown[]) => void;
};
/**
 * Export logs as a plain string that can be saved to a file.
 */
export declare function exportLogs(): Promise<string>;
/**
 * Forcibly save logs to storage. Logs are automatically saved to storage
 * periodically, This should only be called when the app is about to close
 * to prevent logs that haven't been stored yet from being lost.
 */
export declare function saveLogsToStorage(): Promise<void>;
