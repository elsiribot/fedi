import { box, randomBytes } from 'tweetnacl'
import {
    decodeUTF8,
    encodeUTF8,
    encodeBase64,
    decodeBase64,
} from 'tweetnacl-util'
import { Buffer } from 'buffer'
import { Key, Keypair } from '../types/chat'

class EncryptionUtils {
    static newNonce = () => randomBytes(box.nonceLength)
    static hexToUint8Array = (hex: string): Uint8Array => {
        const length = hex.length / 2
        const result = new Uint8Array(length)

        for (let i = 0; i < length; i++) {
            result[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
        }

        return result
    }
    generateDeterministicKeyPair = (seed: string): Keypair => {
        // use the keypair seed and to derive a keypair
        const seedBytes = new Uint8Array(EncryptionUtils.hexToUint8Array(seed))
        const keyPair = box.keyPair.fromSecretKey(seedBytes)

        // Extract the public and private keys
        const publicKeyHex = Buffer.from(keyPair.publicKey).toString('hex')
        const privateKeyHex = Buffer.from(keyPair.secretKey).toString('hex')

        return {
            publicKey: {
                hex: publicKeyHex,
                bytes: keyPair.publicKey,
            },
            privateKey: {
                hex: privateKeyHex,
                bytes: keyPair.secretKey,
            },
        }
    }
    encryptMessage = (
        message: string,
        publicKey: Key,
        privateKey: Key,
    ): string => {
        const nonce = EncryptionUtils.newNonce()
        const messageUint8 = decodeUTF8(message)

        const sharedKey = box.before(publicKey.bytes, privateKey.bytes)
        const encrypted = box.after(messageUint8, nonce, sharedKey)

        const fullMessage = new Uint8Array(nonce.length + encrypted.length)
        fullMessage.set(nonce)
        fullMessage.set(encrypted, nonce.length)

        const base64FullMessage = encodeBase64(fullMessage)
        return base64FullMessage
    }
    decryptMessage = (
        messageWithNonce: string,
        publicKey: Key,
        privateKey: Key,
    ): string => {
        const messageWithNonceAsUint8Array = decodeBase64(messageWithNonce)
        const nonce = messageWithNonceAsUint8Array.slice(0, box.nonceLength)
        const message = messageWithNonceAsUint8Array.slice(
            box.nonceLength,
            messageWithNonce.length,
        )

        const sharedKey = box.before(publicKey.bytes, privateKey.bytes)
        const decrypted = box.open.after(message, nonce, sharedKey)

        if (!decrypted) {
            throw new Error('Could not decrypt message')
        }

        const base64DecryptedMessage = encodeUTF8(decrypted)

        return base64DecryptedMessage
    }
}

const encryptionUtils = new EncryptionUtils()
export default encryptionUtils
