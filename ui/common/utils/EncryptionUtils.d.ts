import { Key, Keypair } from '../types';
declare class EncryptionUtils {
    static newNonce: () => Uint8Array;
    static bytes: (hex: string) => Uint8Array;
    generateDeterministicKeyPair: (seed: string) => Keypair;
    encryptMessage: (message: string, publicKey: Key, privateKey: Key) => string;
    decryptMessage: (messageWithNonce: string, publicKey: Key, privateKey: Key) => string;
    private sha256;
    toSha256EncHex: (message: string) => string;
}
declare const encryptionUtils: EncryptionUtils;
export default encryptionUtils;
