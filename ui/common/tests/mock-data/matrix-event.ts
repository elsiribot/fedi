import { MatrixEvent, MatrixEventStatus } from '@fedi/common/types'
import { MatrixEventContentType } from '@fedi/common/utils/matrix'

export const mockMatrixEventImage: MatrixEvent<
    MatrixEventContentType<'m.image'>
> = {
    content: {
        body: 'B27534A5-B070-480F-9093-3A2EFA8BF3F4.png',
        msgtype: 'm.image',
        info: {
            mimetype: 'image/png',
            size: 10000,
            w: 100,
            h: 100,
        },
        file: {
            hashes: {
                sha256: 'test',
            },
            url: 'mxc://m1.8fa.in/HIIFNqoGfANjvFOEDULIPoKy',
            v: 'v2',
        },
    },
    error: null,
    eventId: '$lZ5PilJSxLL_OBo0_bZuva7Z-Wnw-tMN9Um1DBpw0Yk',
    id: '14',
    roomId: '!tErPyFRkaElRGYRAyQ:m1.8fa.in',
    senderId:
        '@npub1rvlu99xmn62wn5neseg3dayjp857tzu6yeefnwr4ctrqkn5h08wqttl4ja:m1.8fa.in',
    status: MatrixEventStatus.sent,
    timestamp: 1750083034389,
    txnId: undefined,
}

export const mockMatrixEventVideo: MatrixEvent<
    MatrixEventContentType<'m.video'>
> = {
    content: {
        body: 'B27534A5-B070-480F-9093-3A2EFA8BF3F4.mp4',
        msgtype: 'm.video',
        info: {
            mimetype: 'video/mp4',
            size: 10000,
            w: 100,
            h: 100,
        },
        file: {
            hashes: {
                sha256: 'test',
            },
            url: 'mxc://m1.8fa.in/HIIFNqoGfANjvFOEDULIPoKy',
            v: 'v2',
        },
    },
    error: null,
    eventId: '$lZ5PilJSxLL_OBo0_bZuva7Z-Wnw-tMN9Um1DBpw0Yk',
    id: '14',
    roomId: '!tErPyFRkaElRGYRAyQ:m1.8fa.in',
    senderId:
        '@npub1rvlu99xmn62wn5neseg3dayjp857tzu6yeefnwr4ctrqkn5h08wqttl4ja:m1.8fa.in',
    status: MatrixEventStatus.sent,
    timestamp: 1750083034389,
    txnId: undefined,
}
