import { Buffer } from 'buffer'

import Base from '.'

export class Key extends Base {
    hex: string
    bytes: Uint8Array
    constructor(data: any) {
        super(data)
        if (data.hex && !data.bytes) {
            this.bytes = Buffer.from(data.hex, 'hex')
        }
    }
}

export type Keypair = {
    publicKey: Key
    privateKey: Key
}
