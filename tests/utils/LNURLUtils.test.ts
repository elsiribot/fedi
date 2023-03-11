import lnurlUtils from '../../utils/LNURLUtils'

// Mock bridge to prevent further imports from pulling in dependencies
// that cause these tests to fail
jest.mock('../../bridge', () => ({
    lnurlSignMessage: jest.fn(() => ({ signature: '', pubkey: '' })),
}))

describe('lnurl', () => {
    describe('decode', () => {
        it('urlFromLnurl', () => {
            const string =
                'LNURL1DP68GURN8GHJ7CTSDYHXKMMVD35KGETJ9EU8J730WCCJ7CT4W35Z7MRWTAKX7EMFDCLHGCT884KX7EMFDCNXKVFA8PJXVVESXVMNZC3HV9JXXVNZXSENGDE58PJNXVTPXVCR2DMZVSEKZCMXVE3NZDP5VYCX2E3EVSUNGVE4VGUKXC3HXGUN2WFSVYURYCGAR0GSF'
            const url = lnurlUtils.urlFromLnurl(string)
            expect(url).toEqual(
                'https://api.kollider.xyz/v1/auth/ln_login?tag=login&k1=8df30371b7adc2b434748e31a3057bd3acffc144a0ef9d9435b9cb729590a82a',
            )
        })
        it('getK1', () => {
            const string =
                'LNURL1DP68GURN8GHJ7CTSDYHXKMMVD35KGETJ9EU8J730WCCJ7CT4W35Z7MRWTAKX7EMFDCLHGCT884KX7EMFDCNXKVFA8PJXVVESXVMNZC3HV9JXXVNZXSENGDE58PJNXVTPXVCR2DMZVSEKZCMXVE3NZDP5VYCX2E3EVSUNGVE4VGUKXC3HXGUN2WFSVYURYCGAR0GSF'
            const k1 = lnurlUtils.getK1(string)
            expect(k1).toEqual(
                '8df30371b7adc2b434748e31a3057bd3acffc144a0ef9d9435b9cb729590a82a',
            )
        })
    })
})
