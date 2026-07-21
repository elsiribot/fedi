/* eslint-disable no-console */
import { AppiumTestBase } from '../../configs/appium/AppiumTestBase'

const TEST_DISPLAY_NAME = 'e2eprofile'
const FALLBACK_TEST_DISPLAY_NAME = 'e2eprofile2'

export class SettingsProfile extends AppiumTestBase {
    static prerequisites = ['onboarded'] as const
    static produces = ['onboarded'] as const

    private async openSettings(): Promise<void> {
        await this.clickElementByKey('HomeTabButton')
        await this.clickElementByKey('AvatarButton')
        await this.waitForElementDisplayed('UserQrContainer')
    }

    private async changeDisplayName(displayName: string): Promise<void> {
        await this.scrollToText('Edit profile')
        await this.clickOnText('Edit profile', 0, true)
        await this.waitForElementDisplayed('DisplayNameInput')
        await this.typeIntoElementByKey('DisplayNameInput', displayName)
        await this.dismissKeyboard()
        await this.clickOnText('Save', 0, true)
        await this.waitForElementDisplayed('UserQrContainer')
    }

    private async assertDisplayedName(expected: string): Promise<void> {
        const actual = await this.getTextByKey('DisplayNameProper')

        if (actual !== expected) {
            throw new Error(
                `Expected display name "${expected}", but found "${actual}"`,
            )
        }
    }

    async execute(): Promise<void> {
        console.log('Starting Settings Profile Test')

        await this.openSettings()

        const originalDisplayName = await this.getTextByKey('DisplayNameProper')
        const updatedDisplayName =
            originalDisplayName === TEST_DISPLAY_NAME
                ? FALLBACK_TEST_DISPLAY_NAME
                : TEST_DISPLAY_NAME

        await this.changeDisplayName(updatedDisplayName)
        await this.assertDisplayedName(updatedDisplayName)

        await this.changeDisplayName(originalDisplayName)
        await this.assertDisplayedName(originalDisplayName)

        await this.clickElementByKey('HeaderCloseButton')
    }
    catch(error: unknown) {
        console.error('Settings profile test failed:', error)
    }
}
