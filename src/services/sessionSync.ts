import { store } from '@/redux/store'
import { sessionRefreshed } from '@/redux/slices/authSlice'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { apiRequest, tokenStore } from '@/services/apiClient'
import type { AuthUser } from '@/types/auth'

const REFRESH_EVERY_MS = 5 * 60 * 1000
let started = false

/** Re-reads the signed-in user's role and permissions from the backend. */
export async function refreshSession() {
  if (!store.getState().auth.isAuthenticated || !tokenStore.get()) return
  try {
    const user = await apiRequest<AuthUser>('/app/session')
    const before = JSON.stringify(store.getState().auth.user?.permissions)
    store.dispatch(sessionRefreshed(user))
    if (JSON.stringify(user.permissions) !== before) store.dispatch(hrmsApi.util.invalidateTags(['Roles']))
  } catch {
    // 401s sign the user out via the API client; other errors keep the current session.
  }
}

/** Keeps permissions current: on start, when the tab regains focus, and every few minutes. */
export function startSessionSync() {
  if (started || typeof window === 'undefined') return
  started = true
  void refreshSession()
  window.addEventListener('focus', () => void refreshSession())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void refreshSession()
  })
  window.setInterval(() => void refreshSession(), REFRESH_EVERY_MS)
}
