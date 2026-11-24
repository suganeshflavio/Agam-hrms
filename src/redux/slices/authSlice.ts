import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AuthState, AuthUser } from '@/types/auth'
import { tokenStore } from '@/services/apiClient'

// A session exists only after a real login against the backend.
const getSavedUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem('agam_auth_user')
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

const initialUser = getSavedUser()
const initialToken = tokenStore.get()

const initialState: AuthState = {
  isAuthenticated: !!initialUser && !!initialToken,
  user: initialUser,
  token: initialToken,
  loginTime: new Date().toISOString(),
  roleSimulation: false,
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action: PayloadAction<{ user: AuthUser; token: string; expiresAt?: string }>) => {
      state.isAuthenticated = true
      state.user = action.payload.user
      state.token = action.payload.token
      state.loginTime = new Date().toISOString()
      localStorage.setItem('agam_auth_user', JSON.stringify(action.payload.user))
      tokenStore.set(action.payload.token, action.payload.expiresAt)
    },
    // Fresh permissions from the backend (e.g. after HR edits a role).
    sessionRefreshed: (state, action: PayloadAction<AuthUser>) => {
      if (!state.isAuthenticated) return
      state.user = action.payload
      localStorage.setItem('agam_auth_user', JSON.stringify(action.payload))
    },
    logout: (state) => {
      state.isAuthenticated = false
      state.user = null
      state.token = null
      localStorage.removeItem('agam_auth_user')
      tokenStore.clear()
    },
  },
})

export const { loginSuccess, sessionRefreshed, logout } = authSlice.actions
export default authSlice.reducer
