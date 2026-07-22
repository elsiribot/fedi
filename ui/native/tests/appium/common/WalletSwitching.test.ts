/* eslint-disable no-console */
import { AppiumTestBase } from '../../configs/appium/AppiumTestBase'

export class WalletSwitching extends AppiumTestBase {
    static prerequisites = ['onboarded'] as const
    static produces = ['onboarded', 'extraFederationsJoined'] as const
    static actors = 1

    async execute(): Promise<void> {
        console.log('Starting Wallet Switching test')

        await this.clickElementByKey('WalletTabButton')
        await this.waitForElementDisplayed('FediTestnetDetailsButton', 2000)

        await this.clickElementByKey('PlusButton')
        await this.scrollToElement('E-CashClubJoinButton')
        await this.clickElementByKey('E-CashClubJoinButton')
        await this.waitForElementDisplayed('JoinFederationButton')
        await this.clickElementByKey('JoinFederationButton')
        await this.waitForElementDisplayed('E-CashClubDetailsButton', 30000)

        await this.openWalletSwitcher()
        await this.clickOnText('Fedi Testnet', 0, true)
        await this.waitForElementDisplayed('FediTestnetDetailsButton', 30000)
        if (await this.elementIsDisplayed('E-CashClubDetailsButton', 2000)) {
            throw new Error(
                'E-Cash Club remained selected after switching to Fedi Testnet',
            )
        }

        await this.openWalletSwitcher()
        await this.clickOnText('E-Cash Club', 0, true)
        await this.waitForElementDisplayed('E-CashClubDetailsButton', 30000)
        if (await this.elementIsDisplayed('FediTestnetDetailsButton', 2000)) {
            throw new Error(
                'Fedi Testnet remained selected after switching to E-Cash Club',
            )
        }
    }

    private async openWalletSwitcher(): Promise<void> {
        await this.clickElementByKey('WalletTabButton')
        await this.waitForText('Select Wallet Service', 0, true, 10000)
    }

    catch(error: unknown) {
        console.error('Wallet Switching test failed:', error)
    }
}
