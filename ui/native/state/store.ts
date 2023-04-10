import { configureStore } from '@reduxjs/toolkit'

import { commonReducers } from '@fedi/common/redux'

export const store = configureStore({
    reducer: {
        ...commonReducers,
    },
})

export type AppState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
