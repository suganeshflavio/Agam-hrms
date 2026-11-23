import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import App from '../App.vue'
import router from '../router'
import { makeUser, signIn, signOut, stubBackend } from './support/backend'

// Screens render backend data only; every response here comes from the test stub.
const settle = async () => {
  for (let i = 0; i < 6; i++) {
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

const mountAt = async (path: string) => {
  await router.push(path)
  await router.isReady()
  const wrapper = mount(App, { global: { plugins: [router] } })
  await settle()
  return wrapper
}

const thisMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

describe('Screens backed by the API', () => {
  let wrapper: VueWrapper | undefined

  beforeEach(() => {
    localStorage.clear()
    signOut()
  })
  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    vi.unstubAllGlobals()
  })

  it('renders the app shell and dashboard stats from the backend', async () => {
    stubBackend({
      'GET /app/stats': {
        totalEmployees: 42, activeEmployees: 40, presentToday: 3, onLeaveToday: 1,
        pendingLeaveRequests: 2, onboardingInProgress: 0, payrollProcessedThisMonth: 0,
      },
    })
    signIn(makeUser('Super Admin'))
    wrapper = await mountAt('/')
    expect(wrapper.text()).toContain('AGAM')
    expect(wrapper.text()).toContain('Total Headcount')
    expect(wrapper.text()).toContain('42')
  })

  it('lists employees from the backend on Employee Onboarding', async () => {
    const fetchMock = stubBackend()
    signIn(makeUser('Super Admin'))
    wrapper = await mountAt('/employees')
    expect(wrapper.text()).toContain('Employee Onboarding')
    expect(wrapper.text()).toContain('Asha')
    expect(wrapper.text()).toContain('Ravi')
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/api/v1/app/employees'))).toBe(true)
  })

  it('shows an empty list instead of sample people when the backend has none', async () => {
    stubBackend({ 'GET /app/employees': [] })
    signIn(makeUser('Super Admin'))
    wrapper = await mountAt('/employees')
    expect(wrapper.text()).not.toContain('Asha')
    expect(wrapper.text()).not.toMatch(/Sarah Connor|Priya Sharma|San Francisco/)
  })

  it('hides HR Administration from non-admins in the sidebar', async () => {
    stubBackend()
    signIn(makeUser('Department Manager'))
    wrapper = await mountAt('/')
    const nav = wrapper.find('nav').exists() ? wrapper.find('nav').text() : wrapper.text()
    expect(nav).not.toContain('HR Administration')
    expect(nav).toContain('Attendance & Shifts')
    expect(nav).toContain('Leave Management')
  })

  it('shows Super Admin the department-wise attendance register and shift templates', async () => {
    stubBackend({
      'GET /app/attendance/daily_register': {
        date: '2026-11-20',
        departments: [
          {
            department: 'Engineering', total: 2, present: 1, counts: { present: 1, absent: 1 },
            employees: [
              { employeeId: '11', employeeCode: 'TEST-0011', employeeName: 'Asha Rao', designation: 'Engineer', department: 'Engineering', status: 'present', checkIn: '09:02 AM' },
              { employeeId: '13', employeeCode: 'TEST-0013', employeeName: 'Kiran Das', designation: 'Engineer', department: 'Engineering', status: 'absent' },
            ],
          },
          {
            department: 'Finance', total: 1, present: 0, counts: { not_marked: 1 },
            employees: [
              { employeeId: '12', employeeCode: 'TEST-0012', employeeName: 'Ravi Kumar', designation: 'Analyst', department: 'Finance', status: 'not_marked' },
            ],
          },
        ],
      },
    })
    signIn(makeUser('Super Admin'))
    wrapper = await mountAt('/attendance')
    const text = wrapper.text()
    expect(text).toContain('Department Attendance Register')
    expect(text).toContain('Engineering')
    expect(text).toContain('1/2 present')
    expect(text).toContain('Kiran Das')
    expect(text).toContain('Not marked')
    expect(text).toContain('Shift Templates')
  })

  it('shows other roles their own attendance as a green/red calendar', async () => {
    const month = thisMonth()
    const days = Array.from({ length: 28 }, (_, i) => {
      const date = `${month}-${String(i + 1).padStart(2, '0')}`
      const status = i === 0 ? 'present' : i === 1 ? 'absent' : i === 2 ? 'weekly_off' : 'upcoming'
      return { date, status, ...(status === 'present' ? { checkIn: '09:01 AM', checkOut: '06:05 PM', workHours: 8 } : {}) }
    })
    stubBackend({
      'GET /app/attendance/calendar': { month, employeeId: '11', days, summary: { present: 1, absent: 1, weekly_off: 1, upcoming: 25 } },
    })
    signIn(makeUser('General Employee'))
    wrapper = await mountAt('/attendance')
    expect(wrapper.text()).toContain('My Attendance')
    expect(wrapper.text()).not.toContain('Shift Templates')
    expect(wrapper.findAll('button.bg-emerald-500')).toHaveLength(1)
    expect(wrapper.findAll('button.bg-rose-500')).toHaveLength(1)
    expect(wrapper.text()).toContain('1 day(s) marked')
  })

  it('shows leave policy and holiday management only to admins', async () => {
    stubBackend()
    signIn(makeUser('Super Admin'))
    wrapper = await mountAt('/leaves')
    for (const label of ['Leave Policies', 'Holiday Calendar']) {
      const tab = wrapper.findAll('button').find((b) => b.text().includes(label))
      expect(tab, label).toBeDefined()
      await tab!.trigger('click')
      await settle()
    }
    expect(wrapper.text()).toContain('Add Holiday')
    wrapper.unmount()

    signOut()
    stubBackend()
    signIn(makeUser('General Employee'))
    wrapper = await mountAt('/leaves')
    expect(wrapper.text()).not.toContain('Add Leave Policy')
    expect(wrapper.text()).not.toContain('Add Holiday')
  })
})
