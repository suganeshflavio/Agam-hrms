import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { storageService } from '../services/storageService'
import AppLayout from '../components/layout/AppLayout.vue'
import AttendanceView from '../views/AttendanceView.vue'
import LeaveView from '../views/LeaveView.vue'
import { store } from '../redux/store'
import { loginSuccess, switchRole } from '../redux/slices/authSlice'
import { demoUsers } from '../services/authProfiles'
import router from '../router'

describe('Leave Management, Attendance & Shifts Scoping, and Role Access', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('allows Admin to add, update, and delete leave policies in storageService', () => {
    const initialPolicies = storageService.getLeavePolicies()
    const newPolicy = storageService.addLeavePolicy({
      name: 'Paternity/Maternity Extended',
      totalAllowedPerYear: 30,
      maxCarryForwardDays: 10,
      carryForwardAllowed: true,
      accrualFrequency: 'Yearly',
      paid: true,
      description: 'Extended parental leave',
    })
    expect(newPolicy.id).toBeDefined()
    expect(newPolicy.name).toBe('Paternity/Maternity Extended')

    const updated = storageService.updateLeavePolicy(newPolicy.id, {
      totalAllowedPerYear: 35,
    })
    expect(updated?.totalAllowedPerYear).toBe(35)

    const deleted = storageService.deleteLeavePolicy(newPolicy.id)
    expect(deleted).toBe(true)
    const afterDelete = storageService.getLeavePolicies()
    expect(afterDelete.find((p) => p.id === newPolicy.id)).toBeUndefined()
  })

  it('allows Admin to add, update, and delete holidays in storageService', () => {
    const newHoliday = storageService.addHoliday({
      name: 'Founders Day',
      date: '2026-10-15',
      type: 'National',
      dayOfWeek: 'Thursday',
    })
    expect(newHoliday.id).toBeDefined()
    expect(newHoliday.name).toBe('Founders Day')

    const updated = storageService.updateHoliday(newHoliday.id, {
      name: 'Annual Founders Day',
    })
    expect(updated?.name).toBe('Annual Founders Day')

    const deleted = storageService.deleteHoliday(newHoliday.id)
    expect(deleted).toBe(true)
    const afterDelete = storageService.getHolidays()
    expect(afterDelete.find((h) => h.id === newHoliday.id)).toBeUndefined()
  })

  it('Department Manager navigation menu hides HR Administration', async () => {
    store.dispatch(
      loginSuccess({
        user: demoUsers.manager,
        token: 'manager-token',
      })
    )

    const wrapper = mount(AppLayout, {
      global: {
        plugins: [router],
      },
    })
    await router.isReady()

    const text = wrapper.text()
    // Department manager should NOT see HR Administration in the navigation
    expect(text).not.toContain('HR Administration')
    // But should see Employee Directory, Attendance & Shifts, Leave Management
    expect(text).toContain('Attendance & Shifts')
    expect(text).toContain('Leave Management')
  })

  it('General Employee navigation menu shows Leave Management and Attendance & Shifts', async () => {
    store.dispatch(
      loginSuccess({
        user: demoUsers.employee,
        token: 'employee-token',
      })
    )

    const wrapper = mount(AppLayout, {
      global: {
        plugins: [router],
      },
    })
    await router.isReady()

    const text = wrapper.text()
    expect(text).toContain('Attendance & Shifts')
    expect(text).toContain('Leave Management')
    expect(text).not.toContain('HR Administration')
  })

  it('AttendanceView removes Regularization and restricts Shift Templates to Admin only', async () => {
    // 1. As Super Admin:
    store.dispatch(
      loginSuccess({
        user: demoUsers.admin,
        token: 'admin-token',
      })
    )

    let wrapper = mount(AttendanceView, {
      global: {
        plugins: [router],
      },
    })
    await router.isReady()

    let text = wrapper.text()
    // Regularization must be completely removed
    expect(text).not.toContain('Request Regularization')
    expect(text).not.toContain('Attendance Regularization Requests')
    // Shift Templates must be visible to Admin
    expect(text).toContain('Shift Templates')

    // 2. As General Employee:
    store.dispatch(
      loginSuccess({
        user: demoUsers.employee,
        token: 'employee-token',
      })
    )

    wrapper = mount(AttendanceView, {
      global: {
        plugins: [router],
      },
    })
    await router.isReady()

    text = wrapper.text()
    // Shift Templates tab must NOT be visible to employee
    expect(text).not.toContain('Shift Templates')
    // Regularization still not visible
    expect(text).not.toContain('Regularization')
  })

  it('LeaveView shows Add Policy / Holiday only to Admin and hides from Employee', async () => {
    // 1. As Super Admin:
    store.dispatch(
      loginSuccess({
        user: demoUsers.admin,
        token: 'admin-token',
      })
    )

    let wrapper = mount(LeaveView, {
      global: {
        plugins: [router],
      },
    })
    await router.isReady()

    // Switch to Policies tab
    const tabs = wrapper.findAll('button')
    const policyTabBtn = tabs.find((b) => b.text().includes('Leave Policies'))
    expect(policyTabBtn).toBeDefined()
    await policyTabBtn!.trigger('click')

    let text = wrapper.text()
    expect(text).toContain('Add Leave Policy')

    // Switch to Holiday Calendar tab
    const holidayTabBtn = wrapper.findAll('button').find((b) => b.text().includes('Holiday Calendar'))
    expect(holidayTabBtn).toBeDefined()
    await holidayTabBtn!.trigger('click')

    text = wrapper.text()
    expect(text).toContain('Add Holiday')

    // 2. As General Employee:
    store.dispatch(
      loginSuccess({
        user: demoUsers.employee,
        token: 'employee-token',
      })
    )

    wrapper = mount(LeaveView, {
      global: {
        plugins: [router],
      },
    })
    await router.isReady()

    // Switch to Policies tab
    const empPolicyTabBtn = wrapper.findAll('button').find((b) => b.text().includes('Leave Policies'))
    await empPolicyTabBtn!.trigger('click')
    text = wrapper.text()
    expect(text).not.toContain('Add Leave Policy')

    // Switch to Holiday Calendar tab
    const empHolidayTabBtn = wrapper.findAll('button').find((b) => b.text().includes('Holiday Calendar'))
    await empHolidayTabBtn!.trigger('click')
    text = wrapper.text()
    expect(text).not.toContain('Add Holiday')
  })
})
