import type { AuthUser } from '@/types/auth'
import { apiRequest, type ApiError } from '@/services/apiClient'

/** Password shared by the seeded demo accounts (`bin/rails hrms:demo:agam`). */
export const DEMO_PASSWORD: string = (import.meta.env.VITE_DEMO_PASSWORD as string | undefined) || 'Password@2026'

export interface BackendSession {
  user: AuthUser
  token: string
  expiresAt: string
}

interface LoginResponse {
  token: string
  expires_at: string
  app_user: AuthUser
}

const toSession = (data: LoginResponse): BackendSession => ({
  user: data.app_user,
  token: data.token,
  expiresAt: data.expires_at,
})

/**
 * Email + password login. The backend resolves the company from the email;
 * when the email exists in several companies it asks for the company code.
 */
export async function loginWithPassword(email: string, password: string, companyCode?: string): Promise<BackendSession> {
  try {
    const data = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      auth: false,
      body: { login: { email, password, company_code: companyCode } },
    })
    return toSession(data)
  } catch (err) {
    const error = err as ApiError
    if (error.code === 'company_code_required' && !companyCode && typeof window !== 'undefined') {
      const code = window.prompt('This email belongs to more than one company. Enter your company code:')
      if (code) return loginWithPassword(email, password, code.trim())
    }
    throw new Error(error.data || 'Login failed')
  }
}

/** Zoho OAuth: the backend exchanges the code and signs in the matching user. */
export async function loginWithZohoCode(code: string, redirectUri: string, accountsServer?: string): Promise<BackendSession> {
  try {
    const data = await apiRequest<LoginResponse>('/auth/zoho', {
      method: 'POST',
      auth: false,
      body: { code, redirect_uri: redirectUri, accounts_server: accountsServer },
    })
    return toSession(data)
  } catch (err) {
    throw new Error((err as ApiError).data || 'Zoho sign-in failed')
  }
}
