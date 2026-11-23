/**
 * HTTP client for the Core HRMS backend (core_hrms Rails API).
 *
 * - Base URL: VITE_API_BASE_URL (default `/api/v1`, proxied to Rails by Vite in development).
 * - Mock mode: VITE_API_MODE=mock (and the unit-test environment) keeps the original
 *   localStorage-backed services so the UI can run without a backend.
 */

export const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api/v1'

export const isMockApi = (): boolean =>
  import.meta.env.MODE === 'test' || import.meta.env.VITE_API_MODE === 'mock'

const TOKEN_KEY = 'agam_auth_token'
const EXPIRES_KEY = 'agam_auth_expires_at'
const REFRESH_WINDOW_MS = 5 * 60 * 1000

export interface ApiError {
  status: number
  data: string
  code?: string
}

type UnauthorizedHandler = () => void
let onUnauthorized: UnauthorizedHandler | null = null
let refreshing: Promise<void> | null = null

/** Registered by the store so a 401 logs the user out. */
export const setUnauthorizedHandler = (handler: UnauthorizedHandler) => {
  onUnauthorized = handler
}

export const tokenStore = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  expiresAt: (): number => Number(new Date(localStorage.getItem(EXPIRES_KEY) || 0)),
  set(token: string, expiresAt?: string) {
    localStorage.setItem(TOKEN_KEY, token)
    if (expiresAt) localStorage.setItem(EXPIRES_KEY, expiresAt)
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(EXPIRES_KEY)
  },
}

const toError = async (res: Response): Promise<ApiError> => {
  const body = await res.json().catch(() => ({}))
  const message =
    body?.message || (Array.isArray(body?.errors) ? body.errors.join(', ') : '') || `Request failed (${res.status})`
  return { status: res.status, data: message, code: body?.code }
}

// Sliding session: tokens live 15 minutes, so refresh shortly before expiry.
const refreshIfNeeded = async () => {
  const token = tokenStore.get()
  const expiresAt = tokenStore.expiresAt()
  if (!token || !expiresAt || expiresAt - Date.now() > REFRESH_WINDOW_MS || expiresAt < Date.now()) return

  refreshing ||= fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
    .then(async (res) => {
      if (!res.ok) return
      const body = await res.json()
      tokenStore.set(body.data.token, body.data.expires_at)
    })
    .catch(() => undefined)
    .finally(() => {
      refreshing = null
    })
  await refreshing
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | undefined | null>
  auth?: boolean
}

/** Performs a request and returns the `data` field of the backend envelope. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- default lets runQuery infer T from the endpoint's result type
export async function apiRequest<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true } = options
  // Not logged in yet (e.g. layout data on the login page): don't call the server.
  if (auth && !tokenStore.get()) throw { status: 401, data: 'Not signed in' } as ApiError
  if (auth) await refreshIfNeeded()

  const params = new URLSearchParams()
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  })
  const url = `${API_BASE_URL}${path}${params.toString() ? `?${params}` : ''}`

  const headers: Record<string, string> = { Accept: 'application/json' }
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json'
  const token = tokenStore.get()
  if (auth && token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    })
  } catch {
    throw { status: 0, data: 'Unable to reach the HRMS server. Please check your connection.' } as ApiError
  }

  if (res.status === 401 && auth) {
    tokenStore.clear()
    onUnauthorized?.()
  }
  if (!res.ok) throw await toError(res)

  const json = await res.json().catch(() => ({}))
  return json.data as T
}

/**
 * Wraps an API call for RTK Query's queryFn: returns `{ data }` or `{ error }`.
 * In mock mode the original localStorage implementation runs instead.
 */
export async function runQuery<T>(
  live: () => Promise<T>,
  mock: () => T,
): Promise<{ data: T; error?: undefined } | { error: ApiError; data?: undefined }> {
  try {
    return { data: isMockApi() ? mock() : await live() }
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err) return { error: err as ApiError }
    return { error: { status: 500, data: err instanceof Error ? err.message : 'Unexpected error' } }
  }
}
