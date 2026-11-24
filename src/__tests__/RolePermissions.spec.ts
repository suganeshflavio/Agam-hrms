import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import router from '../router'
import { store } from '../redux/store'
import { refreshSession } from '../services/sessionSync'
import { makeUser, signIn, signOut, stubBackend } from './support/backend'

describe('Roles & Permissions drive access', () => {
  beforeEach(() => {
    localStorage.clear()
    signOut()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('opens only the pages a custom role can read', async () => {
    stubBackend()
    signIn(makeUser('General Employee', { role: 'General Employee' }, { payroll: { view: true } }))
    await router.push('/payroll')
    expect(router.currentRoute.value.path).toBe('/payroll')
    await router.push('/admin')
    expect(router.currentRoute.value.path).toBe('/')
    await router.push('/employees')
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('lets a role with Employee Onboarding read open the employee pages', async () => {
    stubBackend()
    signIn(makeUser('General Employee', {}, { employees: { view: true } }))
    await router.push('/employees')
    expect(router.currentRoute.value.path).toBe('/employees')
  })

  it('picks up permission changes from the backend without re-login', async () => {
    signIn(makeUser('General Employee'))
    await router.push('/admin')
    expect(router.currentRoute.value.path).toBe('/')

    const upgraded = makeUser('General Employee', {}, { admin: { view: true, edit: true } })
    stubBackend({ 'GET /app/session': upgraded })
    await refreshSession()
    expect(store.getState().auth.user?.permissions.find((p) => p.module === 'admin')?.actions.view).toBe(true)

    await router.push('/admin')
    expect(router.currentRoute.value.path).toBe('/admin')
  })
})
