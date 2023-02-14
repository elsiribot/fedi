describe('Splash Screen', () => {
    beforeAll(async () => {
        await device.launchApp()
    })

    beforeEach(async () => {
        await device.reloadReactNative()
    })

    it('should render button to join federation', async () => {
        await expect(element(by.id('JoinFederationButton'))).toBeVisible()
    })

    it.skip('should render a link to the EULA', async () => {
        // TODO
    })
})
