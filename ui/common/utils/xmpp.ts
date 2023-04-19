import { client, xml } from '@xmpp/client'
import debug from '@xmpp/debug'
import XMPPError from '@xmpp/error'

import { XMPP_CONNECTION_OPTIONS, XMPP_DOMAIN } from '../constants/xmpp'

/**
 * Creates an ephemeral XMPP client used solely for registration
 * opens the stream and terminates on success or failure.
 */
export const registerXmppUser = async (
    username: string,
    password: string,
): Promise<boolean> => {
    console.log('register xmpp user', username, password)
    return new Promise((resolve, reject) => {
        // Connect to XMPP server without credentials to establish
        // a session for registration
        const xmppConnectionOptions = XMPP_CONNECTION_OPTIONS
        console.info(
            'registerXmppUser: xmppConnectionOptions',
            xmppConnectionOptions,
        )

        const xmpp = client(xmppConnectionOptions)
        debug(xmpp, true)

        // Send the registration request when the stream is opened
        xmpp.on('open', () => {
            xmpp.send(
                xml(
                    'iq',
                    { type: 'set', to: XMPP_DOMAIN, id: 'register' },
                    xml(
                        'query',
                        { xmlns: 'jabber:iq:register' },
                        xml('username', {}, username),
                        xml('password', {}, password),
                    ),
                ),
            )
        })

        // Listen for successful registration
        xmpp.on('stanza', async stanza => {
            // Receive a registration response from the server
            if (stanza.is('iq') && stanza.getAttr('id') === 'register') {
                // Shutdown the XMPP client (to be reinstantiated later)
                await xmpp.stop()
                xmpp.removeAllListeners()

                // Resolve or reject the promise based on registration response
                if (stanza.getAttr('type') === 'result') {
                    resolve(true)
                } else if (stanza.getAttr('type') === 'error') {
                    const error = stanza.getChild('error')
                    // TODO: Figure out how to bubble up i18n strings better.
                    // We should probably create an ErrorWithTranslation class or
                    // something that sets has an i18n property.
                    let errorMessage = 'errors.unknown-error'
                    if (error?.getChild('conflict')) {
                        errorMessage = 'errors.username-already-exists'
                    }

                    reject(errorMessage)
                }
            }
        })

        xmpp.start().catch(console.error)
    })
}

/**
 * Creates an ephemeral XMPP client used solely for authentication check
 * opens the stream and terminates on success or failure.
 */
export const checkXmppUser = async (
    username: string,
    password: string,
): Promise<boolean> => {
    return new Promise(resolve => {
        // Connect to XMPP server with provided credentials to check
        // if the user exists
        const xmppConnectionOptions = {
            ...XMPP_CONNECTION_OPTIONS,
            username,
            password,
        }
        console.info(
            'checkXmppUser: xmppConnectionOptions',
            xmppConnectionOptions,
        )

        const xmpp = client(xmppConnectionOptions)
        debug(xmpp, true)

        // Listen for not-authorized error meaning the credentials are not valid
        xmpp.on('error', async (error: XMPPError) => {
            console.info('error', error)
            if (error.condition === 'not-authorized') {
                await xmpp.stop()
                xmpp.removeAllListeners()
                resolve(false)
            }
        })

        // Listen for successful online event meaning the credentials are valid
        xmpp.on('online', async () => {
            // Shutdown the XMPP client (to be reinstantiated later)
            // TODO: Refactor this to not require ephemeral clients
            await xmpp.stop()
            xmpp.removeAllListeners()
            resolve(true)
        })

        xmpp.start().catch(console.error)
    })
}
