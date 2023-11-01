import { SupportedCurrency } from '../types'
import { makeLog } from './log'

const log = makeLog('common/utils/BitfinexPriceOracle')

interface PriceUpdate {
    currency: SupportedCurrency
    price: number
}

type PriceSubscription = (update: PriceUpdate) => void

class BitfinexPriceOracle {
    socket: WebSocket | undefined
    errorCount = 0

    private stopped = true
    private subscriptions: PriceSubscription[] = []

    async start() {
        this.stopped = false

        if (this.socket) {
            log.info('Bitfinex socket already started')
            return
        }

        const socket = new WebSocket('wss://api-pub.bitfinex.com/ws/2')
        const priceChannels: { [channelId: number]: string } = {}
        this.socket = socket

        socket.onopen = () => {
            // Subscribe to USD price
            socket.send(
                JSON.stringify({
                    event: 'subscribe',
                    channel: 'ticker',
                    symbol: 'tBTCUSD',
                }),
            )
            // Subscribe to EUR price
            socket.send(
                JSON.stringify({
                    event: 'subscribe',
                    channel: 'ticker',
                    symbol: 'tBTCEUR',
                }),
            )
        }

        socket.onmessage = (message: MessageEvent) => {
            const parsedData = JSON.parse(message.data)
            // This event is received once provides the channel ID + currency pair
            if (parsedData.event === 'subscribed') {
                const channelId: number = parsedData.chanId as number
                // Keep a map of channel IDs + currencies
                priceChannels[channelId] = parsedData.pair
            }
            // This event is recieved periodically and are sent as one of
            // these two types:
            // [number, string] - [11111, "hb"]
            // [number, number[]] - [11111, [1,2,3,4,5,6,7,8,9,10]]
            if (
                parsedData[0] &&
                priceChannels[parsedData[0]] &&
                Array.isArray(parsedData[1])
            ) {
                // Find the price data if it is the latter type
                const channelId = parsedData[0]
                const priceData = parsedData[1]
                const updatedPrice = priceData[6]
                // Check the map to figure out which currency price to update
                switch (priceChannels[channelId]) {
                    case 'BTCUSD':
                        this.emit({
                            currency: SupportedCurrency.USD,
                            price: updatedPrice,
                        })
                        break
                    case 'BTCEUR':
                        this.emit({
                            currency: SupportedCurrency.EUR,
                            price: updatedPrice,
                        })
                        break
                    default:
                }
            }
        }

        // Re-try connection on closing with a backoff, unless stopped
        socket.onclose = () => {
            if (this.stopped) return
            this.errorCount++
            this.socket = undefined
            setTimeout(() => {
                this.start()
            }, 1000 * this.errorCount)
        }
    }

    stop() {
        this.stopped = true
        this.errorCount = 0
        this.socket?.close()
    }

    emit(update: PriceUpdate) {
        this.subscriptions.forEach(s => s(update))
    }

    subscribe(subscription: PriceSubscription) {
        this.subscriptions.push(subscription)
        return () => {
            this.subscriptions = this.subscriptions.filter(
                s => s !== subscription,
            )
        }
    }
}

export const bitfinexPriceOracle = new BitfinexPriceOracle()
