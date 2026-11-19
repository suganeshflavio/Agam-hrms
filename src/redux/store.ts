import { configureStore } from '@reduxjs/toolkit'
import uiReducer from './slices/uiSlice'
import authReducer from './slices/authSlice'
import { hrmsApi } from './api/hrmsApi'

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    auth: authReducer,
    [hrmsApi.reducerPath]: hrmsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(hrmsApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
