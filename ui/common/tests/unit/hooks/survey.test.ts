import { act, waitFor } from '@testing-library/react'
import fetchMock from 'jest-fetch-mock'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

import { API_ORIGIN } from '../../../constants/api'
import { useSurveyForm } from '../../../hooks/survey'
import {
    checkSurveyCondition,
    setSurveyTimestamp,
    setupStore,
} from '../../../redux'
import { renderHookWithState } from '../../utils/render'

fetchMock.enableMocks()

describe('useSurveyForm', () => {
    const server = setupServer(
        rest.get(`${API_ORIGIN}/api/active-survey`, (_req, res, ctx) =>
            res(
                ctx.status(200),
                ctx.set('Content-Type', 'application/json'),
                ctx.body(
                    JSON.stringify({
                        enabled: true,
                        url: 'https://enabled.com',
                        title: 'enabled survey title',
                        description: 'enabled survey description',
                        buttonText: 'enabled survey button text',
                        id: 'enabled-survey-id',
                    }),
                ),
            ),
        ),
    )

    let store: ReturnType<typeof setupStore>

    beforeEach(() => {
        store = setupStore()
        server.listen()
    })
    afterEach(() => {
        server.resetHandlers()
        jest.resetModules()
    })
    afterAll(() => server.close())

    describe('API Endpoint enabled', () => {
        it('should show the active and enabled survey form', async () => {
            const { result } = renderHookWithState(() => useSurveyForm(), store)

            await waitFor(() => {
                expect(result.current.show).toBeTruthy()
            })
        })

        it('should not show if the user has been surveyed in the past 7 days', async () => {
            // Set last surveyed timestamp to now
            store.dispatch(setSurveyTimestamp(Date.now()))

            const { result } = renderHookWithState(() => useSurveyForm(), store)

            await waitFor(() => {
                expect(result.current.show).toBeFalsy()
            })
        })

        it('handleDismiss should increase the number of times the survey was dismissed', async () => {
            const { result } = renderHookWithState(() => useSurveyForm(), store)

            await waitFor(() => {
                expect(result.current.show).toBeTruthy()
            })

            act(() => result.current.handleDismiss())

            await waitFor(() => {
                const activeSurveyId = result.current.activeSurvey?.id ?? ''
                const completion =
                    store.getState().survey.surveyCompletions[activeSurveyId]
                expect(completion?.timesDismissed).toEqual(1)
            })
        })

        it('handleAccept should mark the active survey form as completed and not show it again', async () => {
            const { result } = renderHookWithState(() => useSurveyForm(), store)

            await waitFor(() => {
                expect(result.current.show).toBeTruthy()
            })

            act(() => result.current.handleAccept(() => {}))

            await waitFor(() => {
                const activeSurveyId = result.current.activeSurvey?.id ?? ''
                const completion =
                    store.getState().survey.surveyCompletions[activeSurveyId]
                expect(completion?.isCompleted).toBeTruthy()
            })

            // After completion, reset the timestamp and try to show it again
            store.dispatch(setSurveyTimestamp(-1))
            store.dispatch(checkSurveyCondition())

            await waitFor(() => {
                expect(result.current.show).toBeFalsy()
            })
        })

        it('should not show the same survey again if dismissed more than twice', async () => {
            const { result } = renderHookWithState(() => useSurveyForm(), store)

            await waitFor(() => {
                expect(result.current.show).toBeTruthy()
            })

            act(() => result.current.handleDismiss())

            // Reset timestamp (simulates waiting for a week) and try to show it again
            store.dispatch(setSurveyTimestamp(-1))
            store.dispatch(checkSurveyCondition())

            await waitFor(() => {
                expect(result.current.show).toBeTruthy()
            })

            // Dismiss a second time
            act(() => result.current.handleDismiss())

            // Reset again
            store.dispatch(setSurveyTimestamp(-1))
            store.dispatch(checkSurveyCondition())

            await waitFor(() => {
                expect(result.current.show).toBeFalsy()
            })
        })

        it('should show a new survey form if the ID changes, regardless of whether a previous one was completed, after a seven-day cooldown', async () => {
            const { result } = renderHookWithState(() => useSurveyForm(), store)

            await waitFor(() => {
                expect(result.current.show).toBeTruthy()
                expect(result.current.activeSurvey?.id).toEqual(
                    'enabled-survey-id',
                )
            })

            act(() => result.current.handleAccept(() => {}))

            await waitFor(() => {
                const activeSurveyId = result.current.activeSurvey?.id ?? ''
                const completion =
                    store.getState().survey.surveyCompletions[activeSurveyId]
                expect(completion?.isCompleted).toBeTruthy()
            })

            // Change the survey from the server side
            server.use(
                rest.get(`${API_ORIGIN}/api/active-survey`, (_req, res, ctx) =>
                    res(
                        ctx.status(200),
                        ctx.set('Content-Type', 'application/json'),
                        ctx.body(
                            JSON.stringify({
                                enabled: true,
                                url: 'https://enabled-two.com',
                                title: 'enabled survey title two',
                                description: 'enabled survey description two',
                                buttonText: 'enabled button text two',
                                id: 'enabled-survey-id-2',
                            }),
                        ),
                    ),
                ),
            )

            // After completion, reset the timestamp and try to show it again
            store.dispatch(setSurveyTimestamp(-1))
            store.dispatch(checkSurveyCondition())

            await waitFor(() => {
                expect(result.current.show).toBeTruthy()
                expect(result.current.activeSurvey?.id).toEqual(
                    'enabled-survey-id-2',
                )
            })
        })
    })

    describe('API Endpoint not enabled', () => {
        it('should not show if the api endpoint is disabled', async () => {
            server.use(
                rest.get(`${API_ORIGIN}/api/active-survey`, (_req, res, ctx) =>
                    res(
                        ctx.status(200),
                        ctx.set('Content-Type', 'application/json'),
                        ctx.body(
                            JSON.stringify({
                                enabled: false,
                                url: 'https://disabled.com',
                                title: 'disabled survey title',
                                description: 'disabled survey description',
                                buttonText: 'disabled survey button text',
                                id: 'disabled-survey-id',
                            }),
                        ),
                    ),
                ),
            )

            const { result } = renderHookWithState(() => useSurveyForm(), store)

            await waitFor(() => {
                expect(result.current.show).toBeFalsy()
            })
        })

        it("should not show if the api endpoint doesn't match the right response schema", async () => {
            server.use(
                rest.get(`${API_ORIGIN}/api/active-survey`, (_req, res, ctx) =>
                    res(
                        ctx.status(200),
                        ctx.set('Content-Type', 'application/json'),
                        ctx.body(
                            JSON.stringify({
                                enabled: 'maybe',
                                id: 'disabled-survey-id',
                                foo: 'bar',
                            }),
                        ),
                    ),
                ),
            )

            const { result } = renderHookWithState(() => useSurveyForm(), store)

            await waitFor(() => {
                expect(result.current.show).toBeFalsy()
            })
        })

        it('should not show if the api endpoint returns a non-json response', async () => {
            server.use(
                rest.get(`${API_ORIGIN}/api/active-survey`, (_req, res, ctx) =>
                    res(
                        ctx.status(200),
                        ctx.set('Content-Type', 'text/html'),
                        ctx.body(
                            '<!DOCTYPE html><head><title>your mom</title></head><body></body>',
                        ),
                    ),
                ),
            )

            const { result } = renderHookWithState(() => useSurveyForm(), store)

            await waitFor(() => {
                expect(result.current.show).toBeFalsy()
            })
        })
    })
})
