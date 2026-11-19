import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AuthState, AuthUser, SystemRoleType } from '@/types/auth'
import { demoUsers, rolePermissionProfiles } from '@/services/authProfiles'

const getSavedUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem('agam_auth_user')
    return raw ? (JSON.parse(raw) as AuthUser) : demoUsers.admin
  } catch {
    return demoUsers.admin
  }
}

const getSavedToken = (): string | null => {
  return localStorage.getItem('agam_auth_token') || 'demo-jwt-token-agam-enterprise'
}

const initialUser = getSavedUser()

const initialState: AuthState = {
  isAuthenticated: !!initialUser,
  user: initialUser,
  token: getSavedToken(),
  loginTime: new Date().toISOString(),
  roleSimulation: false,
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action: PayloadAction<{ user: AuthUser; token: string }>) => {
      state.isAuthenticated = true
      state.user = action.payload.user
      state.token = action.payload.token
      state.loginTime = new Date().toISOString()
      localStorage.setItem('agam_auth_user', JSON.stringify(action.payload.user))
      localStorage.setItem('agam_auth_token', action.payload.token)
    },
    logout: (state) => {
      state.isAuthenticated = false
      state.user = null
      state.token = null
      localStorage.removeItem('agam_auth_user')
      localStorage.removeItem('agam_auth_token')
    },
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
