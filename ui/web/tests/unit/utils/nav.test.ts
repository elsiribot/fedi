import { shouldHideNavigation } from '../../../src/utils/nav'

describe('utils/nav', () => {
    describe('shouldHideNavigation', () => {
        describe('Desktop routes', () => {
            describe('Welcome page route', () => {
                it('should hide the nav bar', () => {
                    const result = shouldHideNavigation('/', false)
                    expect(result).toBe(true)
                })
            })

            // Users can access the welcome page with an invite code
            // for a quicker flow to join a federation
            describe('Welcome page route with a query string param', () => {
                it('should hide the nav bar', () => {
                    const result = shouldHideNavigation(
                        '/?invite_code=123',
                        false,
                    )
                    expect(result).toBe(true)
                })
            })

            describe('Welcome page route with a hash param', () => {
                it('should hide the nav bar', () => {
                    const result = shouldHideNavigation('/#id=123', false)
                    expect(result).toBe(true)
                })
            })

            describe('Home page route', () => {
                it('should show the nav bar', () => {
                    const result = shouldHideNavigation('/home', false)
                    expect(result).toBe(false)
                })
            })

            describe('Scan page route', () => {
                it('should show the nav bar', () => {
                    const result = shouldHideNavigation('/scan', false)
                    expect(result).toBe(false)
                })
            })

            describe('Chat page route', () => {
                it('should show the nav bar', () => {
                    const result = shouldHideNavigation('/chat', false)
                    expect(result).toBe(false)
                })
            })

            describe('Onboarding page route', () => {
                it('should hide the nav bar', () => {
                    const result = shouldHideNavigation('/onboarding', false)
                    expect(result).toBe(true)
                })
            })

            describe('Settings page route', () => {
                it('should show the nav bar', () => {
                    const result = shouldHideNavigation('/settings', false)
                    expect(result).toBe(false)
                })
            })

            describe('Settings Nostr page route', () => {
                it('should show the nav bar', () => {
                    const result = shouldHideNavigation(
                        '/settings/nostr',
                        false,
                    )
                    expect(result).toBe(false)
                })
            })

            describe('Chat page route', () => {
                it('should show the nav bar', () => {
                    const result = shouldHideNavigation('/chat', false)
                    expect(result).toBe(false)
                })
            })

            describe('ChatRoom page route', () => {
                it('should show the nav bar', () => {
                    const result = shouldHideNavigation('/chat/room/123', false)
                    expect(result).toBe(false)
                })
            })

            describe('Transactions page route', () => {
                it('should show the nav bar', () => {
                    const result = shouldHideNavigation('/transactions', false)
                    expect(result).toBe(false)
                })
            })
        })

        describe('Mobile routes', () => {
            describe('Welcome page route', () => {
                it('should hide the nav bar', () => {
                    const result = shouldHideNavigation('/', true)
                    expect(result).toBe(true)
                })
            })

            // Users can access the welcome page with an invite code
            // for a quicker flow to join a federation
            describe('Welcome page route with a query string param', () => {
                it('should hide the nav bar', () => {
                    const result = shouldHideNavigation(
                        '/?invite_code=123',
                        false,
                    )
                    expect(result).toBe(true)
                })
            })

            describe('Home page route', () => {
                it('should show the nav bar', () => {
                    const result = shouldHideNavigation('/home', true)
                    expect(result).toBe(false)
                })
            })

            describe('Scan page route', () => {
                it('should show the nav bar', () => {
                    const result = shouldHideNavigation('/scan', true)
                    expect(result).toBe(true)
                })
            })

            describe('Onboarding page route', () => {
                it('should hide the nav bar', () => {
                    const result = shouldHideNavigation('/onboarding', true)
                    expect(result).toBe(true)
                })
            })

            describe('Settings page route', () => {
                it('should hide the nav bar', () => {
                    const result = shouldHideNavigation('/settings', true)
                    expect(result).toBe(true)
                })
            })

            describe('Settings Nostr page route', () => {
                it('should hide the nav bar', () => {
                    const result = shouldHideNavigation('/settings/nostr', true)
                    expect(result).toBe(true)
                })
            })

            describe('Chat page route', () => {
                it('should hide the nav bar', () => {
                    const result = shouldHideNavigation('/chat', true)
                    expect(result).toBe(false)
                })
            })

            describe('ChatRoom page route', () => {
                it('should hide the nav bar', () => {
                    const result = shouldHideNavigation('/chat/room/123', true)
                    expect(result).toBe(true)
                })
            })

            describe('Transactions page route', () => {
                it('should hide the nav bar', () => {
                    const result = shouldHideNavigation('/transactions', true)
                    expect(result).toBe(true)
                })
            })
        })
    })
})
