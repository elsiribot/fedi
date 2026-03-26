export function useWalletButtons(federationId: string) {
    const federation = useCommonSelector(s =>
        selectLoadedFederation(s, federationId),
    )
    const receivesDisabled = useAppSelector(s =>
        selectReceivesDisabled(s, federationId),
    )
    const stableBalancePending = useAppSelector(s =>
        selectStableBalancePending(s, federationId),
    )
    const isOffline = useAppSelector(selectIsInternetUnreachable)

    const popupInfo = usePopupFederationInfo(federation?.meta ?? {})
    const stableBalanceBlocked =
        paymentType === 'stable-balance' && stableBalancePending < 0

    const receiveDisabled =
        popupInfo?.ended ||
        receivesDisabled ||
        recoveryInProgress ||
        stableBalanceBlocked
    const sendDisabled =
        popupInfo?.ended ||
        (paymentType === 'bitcoin'
            ? recoveryInProgress || federation.balance < 1000
            : stableBalanceBlocked)

    const disabledMessage = recoveryInProgress
        ? t('feature.recovery.recovery-in-progress-wallet')
        : stableBalanceBlocked
          ? t('feature.stabilitypool.pending-withdrawal-blocking')
          : receivesDisabled
            ? t('errors.receives-have-been-disabled')
            : null

    return {
        sendDisabled,
        receiveDisabled,
        disabledMessage,
    }
}
