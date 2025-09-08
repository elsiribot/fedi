import { Community } from '../types'

export const FEDI_GLOBAL_COMMUNITY: Pick<Community, 'id' | 'meta'> = {
    // this is a hard-coded "fake" federation expected to have configured metadata at the provided URL
    id: '00000000000000000000000066656469',
    meta: {
        meta_override_url: 'https://meta.dev.fedibtc.com/meta.json',
    },
}

export const FEDI_GLOBAL_COMMUNITY_INVITE = `fedi:community10v3xxmmdd46ku6t5090k6et5v90h2unvygazy6r5w3c8xw309a4x76tw943k7mtdw4hxjare9eenxtnpd4sh5mmwv9mhxtnrdakj7vpsxyhk6et5vyhx5um0dc386g8m6tx`
