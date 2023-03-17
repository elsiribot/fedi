import { box, randomBytes } from 'tweetnacl'
import {
    decodeUTF8,
    encodeUTF8,
    encodeBase64,
    decodeBase64,
} from 'tweetnacl-util'
import { createHash } from 'crypto'

type Key = {
    hex: string
    bytes: Uint8Array
}
type Keypair = {
    publicKey: Key
    privateKey: Key
}

const newNonce = () => randomBytes(box.nonceLength)

class EncryptionUtils {
    generateDeterministicKeyPair = (seed: string): Keypair => {
        // Hash the keypair seed and use it to derive a keypair
        const hash = createHash('sha256')
        hash.update(seed)
        const hashedSeed = new Uint8Array(hash.digest())
        const keyPair = box.keyPair.fromSecretKey(hashedSeed)

        // Extract the public and private keys
        const publicKeyHex = Buffer.from(keyPair.publicKey).toString('hex')
        const privateKeyHex = Buffer.from(keyPair.secretKey).toString('hex')

        console.log('keys:', {
            publicKeyHex,
            privateKeyHex,
        })

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
        console.info('message', message)
        const nonce = newNonce()
        const messageUint8 = decodeUTF8(message)

        const sharedKey = box.before(publicKey.bytes, privateKey.bytes)
        const encrypted = box.after(messageUint8, nonce, sharedKey)

        console.info('encrypted', encrypted)

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
        console.info('message', messageWithNonce)
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

        console.info('base64DecryptedMessage', base64DecryptedMessage)
        return base64DecryptedMessage
    }
}

const encryptionUtils = new EncryptionUtils()
export default encryptionUtils
