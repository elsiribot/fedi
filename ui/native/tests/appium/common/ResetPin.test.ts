/* eslint-disable no-console */
import { AppiumTestBase } from '../../configs/appium/AppiumTestBase'
import { Platform, currentPlatform } from '../../configs/appium/types'

const IOS_BUNDLE_ID = process.env.BUNDLE_ID || 'org.fedi.alpha'
const ANDROID_APP_ID = process.env.APP_PACKAGE || 'com.fedi'

const INITIAL_PIN = ['1', '2', '3', '4'] as const
const NEW_PIN = ['4', '3', '2', '1'] as const
const WRONG_PIN = ['0', '0', '0', '0'] as const

const LOCK_SCREEN_TIMEOUT = 60_000

export class ResetPin extends AppiumTestBase {
    static prerequisites = ['onboarded'] as const
    static produces = ['onboarded', 'pinProtected'] as const

    private async enterPin(digits: readonly string[]): Promise<void> {
        for (const digit of digits) {
            await this.clickElementByKey(`NumpadButton-${digit}`)
        }
    }

    private async clearPin(): Promise<void> {
        for (let i = 0; i < INITIAL_PIN.length; i++) {
            await this.clickElementByKey('NumpadButton-backspace')
        }
    }

    private async relaunchApp(): Promise<void> {
        console.log('Terminating and relaunching app to trigger lock screen')
        if (currentPlatform === Platform.IOS) {
            await this.driver.executeScript('mobile: terminateApp', [
                { bundleId: IOS_BUNDLE_ID },
            ])
            await this.driver.executeScript('mobile: activateApp', [
                { bundleId: IOS_BUNDLE_ID },
            ])
            return
        }

        if (currentPlatform === Platform.ANDROID) {
            await this.driver.executeScript('mobile: terminateApp', [
                { appId: ANDROID_APP_ID },
            ])
            await this.driver.executeScript('mobile: activateApp', [
                { appId: ANDROID_APP_ID },
            ])
            return
        }

        throw new Error('Reset PIN test is not implemented for this platform')
    }

    private async captureSeedWords(): Promise<string[]> {
        console.log('Capturing seed words from personal backup')

        await this.clickElementByKey('HomeTabButton')
        await this.clickElementByKey('AvatarButton')
        await this.waitForElementDisplayed('UserQrContainer')
        await this.scrollToElement('Personal Backup')
        await this.clickElementByKey('Personal Backup')
        await this.scrollToElement('SeedWord12')

        const seedWords: string[] = []
        for (let i = 1; i <= 12; i++) {
            seedWords.push(await this.getTextByKey(`SeedWord${i}`))
        }

        await this.clickElementByKey('ContinueButton')
        await this.waitForElementDisplayed('UserQrContainer')

        return seedWords
    }

    private async createInitialPin(): Promise<void> {
        console.log('Creating initial PIN')

        await this.scrollToElement('PIN Access')
        await this.clickElementByKey('PIN Access')
        await this.waitForElementDisplayed('NumpadButton-1')

        await this.enterPin(INITIAL_PIN)
        if (!(await this.isTextPresent('Re-enter PIN'))) {
            throw new Error('Re-enter PIN prompt not found')
        }

        await this.enterPin(INITIAL_PIN)
        await this.waitForElementDisplayed('Done')
        await this.clickElementByKey('Done')
        await this.waitForElementDisplayed('PinSwitch-app')
    }

    private async resetPinWithSeedWords(seedWords: string[]): Promise<void> {
        console.log('Resetting PIN with personal backup')

        await this.relaunchApp()
        await this.waitForElementDisplayed(
            'NumpadButton-1',
            LOCK_SCREEN_TIMEOUT,
        )

        await this.enterPin(WRONG_PIN)
        await this.waitForElementDisplayed('ForgotPinButton')
        await this.clickElementByKey('ForgotPinButton')
        await this.waitForText('Recover with your backup', 0, true)
        await this.clickElementByKey('Continue')

        for (let i = 0; i < seedWords.length; i++) {
            const key = `SeedWordInput${i + 1}`
            await this.scrollToElement(key)
            await this.typeIntoElementByKey(key, seedWords[i])
        }

        await this.clickElementByKey('Recover wallet')
        await this.waitForElementDisplayed('NumpadButton-1')

        await this.enterPin(NEW_PIN)
        if (!(await this.isTextPresent('Re-enter PIN'))) {
            throw new Error('Re-enter PIN prompt not found after reset')
        }

        await this.enterPin(NEW_PIN)
        await this.waitForElementDisplayed('Done')
        await this.clickElementByKey('Done')
        await this.waitForElementDisplayed('PinSwitch-app')
    }

    private async verifyOnlyNewPinUnlocks(): Promise<void> {
        console.log('Verifying old PIN is rejected and new PIN unlocks')

        await this.relaunchApp()
        await this.waitForElementDisplayed(
            'NumpadButton-1',
            LOCK_SCREEN_TIMEOUT,
        )

        await this.enterPin(INITIAL_PIN)
        if (!(await this.isTextPresent("PIN doesn't match"))) {
            throw new Error('Old PIN should be rejected after reset')
        }
        await this.clearPin()

        await this.enterPin(NEW_PIN)
        await this.waitForElementDisplayed('HomeTabButton')
    }

    async execute(): Promise<void> {
        console.log('Starting Reset PIN Test')

        const seedWords = await this.captureSeedWords()

        await this.createInitialPin()
        await this.resetPinWithSeedWords(seedWords)
        await this.verifyOnlyNewPinUnlocks()

        console.log('Reset PIN Test complete')
    }

    catch(error: unknown) {
        console.error('Reset PIN test failed:', error)
    }
}
