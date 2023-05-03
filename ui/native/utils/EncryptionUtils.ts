import { Buffer } from 'buffer'
import { createHash } from 'crypto'
import { box, randomBytes } from 'tweetnacl'
import {
    decodeUTF8,
    encodeUTF8,
    encodeBase64,
    decodeBase64,
} from 'tweetnacl-util'

import { Key, Keypair } from '@fedi/common/types'

class EncryptionUtils {
    static newNonce = () => randomBytes(box.nonceLength)
    static bytes = (hex: string): Uint8Array => Buffer.from(hex, 'hex')
    generateDeterministicKeyPair = (seed: string): Keypair => {
        // Hash the keypair seed and use it to derive a keypair
        const hash = createHash('sha256')
        hash.update(seed)
        const hashedSeed = new Uint8Array(hash.digest())
        const keyPair = box.keyPair.fromSecretKey(hashedSeed)

        // Extract the public and private keys
        const publicKeyHex = Buffer.from(keyPair.publicKey).toString('hex')
        const privateKeyHex = Buffer.from(keyPair.secretKey).toString('hex')

        return {
            publicKey: {
                hex: publicKeyHex as string,
            },
            privateKey: {
                hex: privateKeyHex as string,
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

        const sharedKey = box.before(
            EncryptionUtils.bytes(publicKey.hex),
            EncryptionUtils.bytes(privateKey.hex),
        )
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

        const sharedKey = box.before(
            EncryptionUtils.bytes(publicKey.hex),
            EncryptionUtils.bytes(privateKey.hex),
        )
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
