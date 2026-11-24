import { configureStore } from '@reduxjs/toolkit'
import uiReducer from './slices/uiSlice'
import authReducer, { logout } from './slices/authSlice'
import { hrmsApi } from './api/hrmsApi'
import { setUnauthorizedHandler } from '@/services/apiClient'

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

// Expired or revoked session: clear state and return to the login screen.
setUnauthorizedHandler(() => {
  if (!store.getState().auth.isAuthenticated) return
  store.dispatch(logout())
  store.dispatch(hrmsApi.util.resetApiState())
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    window.location.assign(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
  }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
