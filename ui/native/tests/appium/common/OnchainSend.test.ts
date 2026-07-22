/* eslint-disable no-console */
import { AppiumTestBase } from '../../configs/appium/AppiumTestBase'
import {
    acceptCameraPermissionIfPresent,
    allowPasteIfPrompted,
    setupOnboardedLocalFed,
} from '../fixtures/setupOnboardedLocalFed'
import {
    dismissSendSuccess,
    ensureSatsMode,
    enterAmount,
    generateDevfedEcash,
    getDevfedInvite,
    readWalletSats,
    redeemEcash,
    reverseDevfedPortsIntoDevices,
    waitForWalletReceive,
} from './payments.test'

const FUND_SATS = 10000
const ONCHAIN_SEND_SATS = 1000
// bitcoin-address-validation accepts legacy testnet addresses, whose version
// bytes are also valid for regtest on-chain payments in the local dev fed.
const REGTEST_DESTINATION_ADDRESS = 'mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn'

export class OnchainSend extends AppiumTestBase {
    static prerequisites = [] as const
    static produces = ['onboarded', 'walletUsed'] as const
    static actors = 1

    async execute(): Promise<void> {
        console.log('Starting OnchainSend test')

        await reverseDevfedPortsIntoDevices()
        const invite = await getDevfedInvite()
        await setupOnboardedLocalFed(this, invite)

        const fundEcash = await generateDevfedEcash(FUND_SATS * 1000)
        await redeemEcash(this, fundEcash)
        await this.waitForText('Ecash claimed', 0, true, 120000)
        await this.clickOnText('Go to wallet', 0, true)
        await waitForWalletReceive(this)

        const fundedBalance = await readWalletSats(this)
        if (fundedBalance !== FUND_SATS) {
            throw new Error(
                `wallet has ${fundedBalance} sats after funding, expected ${FUND_SATS}`,
            )
        }

        await this.clickOnText('Send', 0, true)
        await acceptCameraPermissionIfPresent(this)
        await this.setClipboard(REGTEST_DESTINATION_ADDRESS)
        await this.clickElementByKey('PasteButton')
        await allowPasteIfPrompted(this)

        await ensureSatsMode(this)
        await enterAmount(this, ONCHAIN_SEND_SATS)
        await this.clickOnText('Continue', 0, true)

        await this.waitForElementDisplayed('OnchainSendDetailsButton', 30000)
        await this.clickElementByKey('OnchainSendDetailsButton')
        for (const line of ['Send to', 'Fees', 'Send from']) {
            if (!(await this.isTextPresent(line, true, 5000))) {
                throw new Error(
                    `on-chain confirmation details missing "${line}"`,
                )
            }
        }

        await this.clickElementByKey('SendConfirmButton')
        await this.waitForText('You sent', 0, true, 120000)
        await this.waitForText(`${ONCHAIN_SEND_SATS} SATS`, 0, true, 5000)
        await dismissSendSuccess(this)

        const finalBalance = await readWalletSats(this)
        if (finalBalance >= fundedBalance) {
            throw new Error(
                `wallet balance ${finalBalance} should be below funded ${fundedBalance} after on-chain send`,
            )
        }
    }

    catch(error: unknown) {
        console.error('OnchainSend test failed:', error)
    }
}
