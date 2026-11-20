import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AuthState, AuthUser, SystemRoleType } from '@/types/auth'
import { demoUsers, rolePermissionProfiles } from '@/services/authProfiles'
import { isMockApi, tokenStore } from '@/services/apiClient'

// In API mode a session exists only after a real login; mock mode keeps the
// original behaviour of starting as the demo admin.
const getSavedUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem('agam_auth_user')
    if (raw) return JSON.parse(raw) as AuthUser
    return isMockApi() ? demoUsers.admin : null
  } catch {
    return isMockApi() ? demoUsers.admin : null
  }
}

const getSavedToken = (): string | null => {
  return tokenStore.get() || (isMockApi() ? 'demo-jwt-token-agam-enterprise' : null)
}

const initialUser = getSavedUser()
const initialToken = getSavedToken()

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
    logout: (state) => {
      state.isAuthenticated = false
      state.user = null
      state.token = null
      localStorage.removeItem('agam_auth_user')
      tokenStore.clear()
    },
    // UI preview only: the backend always enforces the user's real permissions.
    switchRole: (state, action: PayloadAction<SystemRoleType>) => {
      if (state.user) {
        state.user.role = action.payload
        state.user.permissions = rolePermissionProfiles[action.payload]
        state.roleSimulation = true
        localStorage.setItem('agam_auth_user', JSON.stringify(state.user))
      }
    },
  },
})

export const { loginSuccess, logout, switchRole } = authSlice.actions
export default authSlice.reducer
