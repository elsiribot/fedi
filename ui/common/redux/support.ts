import {
    createSlice,
    PayloadAction,
    Dispatch,
    createAsyncThunk,
} from '@reduxjs/toolkit'
import { z } from 'zod'

import { CommonState } from '.'
import { API_ORIGIN } from '../constants/api'
import { loadFromStorage } from './storage'

/*** Initial State ***/

const initialState = {
    supportPermissionGranted: false,
    zendeskPushNotificationToken: null as string | null,
    zendeskInitialized: false,
    zendeskUnreadMessageCount: 0,
    lastShownSurveyTimestamp: null as number | null,
}

export type SupportState = typeof initialState

/*** Slice definition ***/

export const supportSlice = createSlice({
    name: 'support',
    initialState,
    reducers: {
        setSupportPermission(state, action: PayloadAction<boolean>) {
            state.supportPermissionGranted = action.payload
        },
        setZendeskPushNotificationToken(state, action: PayloadAction<string>) {
            state.zendeskPushNotificationToken = action.payload
        },
        setZendeskInitialized(state, action: PayloadAction<boolean>) {
            state.zendeskInitialized = action.payload
        },
        setZendeskUnreadMessageCount(state, action: PayloadAction<number>) {
            state.zendeskUnreadMessageCount = action.payload
        },
        resetSurveyTimestamp(state) {
            state.lastShownSurveyTimestamp = Date.now()
        },
    },
    extraReducers: builder => {
        builder.addCase(loadFromStorage.fulfilled, (state, action) => {
            if (!action.payload?.support) return
            const { supportPermissionGranted, zendeskPushNotificationToken } =
                action.payload.support

            state.supportPermissionGranted =
                supportPermissionGranted ?? state.supportPermissionGranted
            state.zendeskPushNotificationToken =
                zendeskPushNotificationToken ??
                state.zendeskPushNotificationToken
            state.lastShownSurveyTimestamp =
                action.payload.lastShownSurveyTimestamp
        })
    },
})

/*** Basic actions ***/

export const {
    setSupportPermission,
    setZendeskPushNotificationToken,
    setZendeskInitialized,
    setZendeskUnreadMessageCount,
    resetSurveyTimestamp,
} = supportSlice.actions

/*** Asynchronous thonkers ***/

export const checkSurveyCondition = createAsyncThunk<
    { enabled: true; url: string } | { enabled: false; url: null },
    undefined,
    { state: CommonState }
>('support/checkSurveyCondition', async (_, { getState }) => {
    const state = getState()

    const oneWeekMs = 7 * 24 * 60 * 60 * 1000
    const lastShownTimestamp = state.support.lastShownSurveyTimestamp
    const hasBeenSevenDays =
        lastShownTimestamp && Date.now() - lastShownTimestamp >= oneWeekMs
    const fallback = { enabled: false as const, url: null }

    // If it has been 7 days since the last survey
    // OR if the user has already accepted the survey
    // don't show the survey again
    if (!hasBeenSevenDays || state.nux.steps.hasAcceptedSurvey) return fallback

    // TODO: make a fetch to the server endpoint once implemented
    const surveyResponse = await fetch(`${API_ORIGIN}/api/active-survey`).then(
        res => res.json(),
    )
    const surveySchema = z.object({
        enabled: z.boolean(),
        url: z.string(),
    })

    const surveyResult = await surveySchema
        .parseAsync(surveyResponse)
        .catch(() => fallback)

    if (surveyResult.enabled && surveyResult.url)
        return surveyResult as { enabled: true; url: string }

    return fallback
})

/*** Selectors ***/

export const selectSupportPermissionGranted = (s: CommonState) =>
    s.support.supportPermissionGranted

export const selectZendeskPushNotificationToken = (s: CommonState) =>
    s.support.zendeskPushNotificationToken

export const selectZendeskInitialized = (s: CommonState) =>
    s.support.zendeskInitialized

export const selectZendeskUnreadMessageCount = (s: CommonState) =>
    s.support.zendeskUnreadMessageCount

/*** Synchronous wrapper actions ***/

export const grantSupportPermission = () => (dispatch: Dispatch) => {
    dispatch(setSupportPermission(true))
}

export const saveZendeskPushNotificationToken =
    (token: string) => (dispatch: Dispatch) => {
        dispatch(setZendeskPushNotificationToken(token))
    }

export const updateZendeskUnreadMessageCount =
    (count: number) => (dispatch: Dispatch) => {
        dispatch(setZendeskUnreadMessageCount(count))
    }
