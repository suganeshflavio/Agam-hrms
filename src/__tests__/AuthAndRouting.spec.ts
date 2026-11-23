import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import router from '../router'
import { getZohoAuthorizationUrl, getZohoConfig } from '../services/zohoAuthService'
import { apiRequest, setUnauthorizedHandler } from '../services/apiClient'
import { makeUser, signIn, signOut, stubBackend } from './support/backend'

describe('Authentication, routing and API client', () => {
  beforeEach(() => {
    localStorage.clear()
    signOut()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('sends signed-out users to the login page', async () => {
    await router.push('/employees')
    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/employees')
  })

  it('keeps the forgot / reset password pages public', async () => {
    await router.push('/forgot-password')
    expect(router.currentRoute.value.path).toBe('/forgot-password')
    await router.push('/reset-password?token=abc')
    expect(router.currentRoute.value.path).toBe('/reset-password')
  })

  it('forces users with a temporary password to change it first', async () => {
    signIn(makeUser('General Employee', { mustChangePassword: true }))
    await router.push('/leaves')
    expect(router.currentRoute.value.path).toBe('/change-password')
  })

  it('keeps HR Administration away from non-admin roles', async () => {
    signIn(makeUser('General Employee'))
    await router.push('/admin')
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('builds the Zoho authorization URL from configuration without a client secret', () => {
    const config = getZohoConfig()
    expect(config).not.toHaveProperty('clientSecret')
    const url = getZohoAuthorizationUrl('state-1')
    expect(url).toContain('response_type=code')
    expect(url).toContain('state=state-1')
    expect(url).toContain(`redirect_uri=${encodeURIComponent(config.redirectUri)}`)
  })

  it('unwraps backend data and reports backend error messages', async () => {
    signIn(makeUser('Super Admin'))
    stubBackend({
      'GET /app/company': { id: '1', name: 'Test Company' },
      'POST /app/grades': new Response(JSON.stringify({ status: 'error', message: 'Grade name is required' }), { status: 422 }),
    })
    await expect(apiRequest('/app/company')).resolves.toMatchObject({ name: 'Test Company' })
    await expect(apiRequest('/app/grades', { method: 'POST', body: {} })).rejects.toMatchObject({ status: 422, data: 'Grade name is required' })
  })

  it('signs the user out when the backend says the session is invalid', async () => {
    signIn(makeUser('Super Admin'))
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    stubBackend({ 'GET /app/stats': new Response(JSON.stringify({ status: 'error', message: 'Unauthorized' }), { status: 401 }) })
    await expect(apiRequest('/app/stats')).rejects.toMatchObject({ status: 401 })
    expect(onUnauthorized).toHaveBeenCalled()
  })

  it('does not call the backend before sign-in', async () => {
    const fetchMock = stubBackend()
    await expect(apiRequest('/app/stats')).rejects.toMatchObject({ status: 401 })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
