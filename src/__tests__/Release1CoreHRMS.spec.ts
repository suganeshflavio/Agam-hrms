import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { storageService } from '../services/storageService'
import DashboardView from '../views/DashboardView.vue'
import { store } from '../redux/store'
import { loginSuccess } from '../redux/slices/authSlice'
import { demoUsers } from '../services/authProfiles'
import router from '../router'

describe('Release 1 – Core HRMS Service Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  // Module 4: Attendance & Shifts
  it('manages daily clock-in / clock-out punches and shift tracking', () => {
    const employeeId = 'emp-1'
    const employeeName = 'Sarah Connor'

    // First punch: Clock in
    const punchIn = storageService.recordAttendance(employeeId, employeeName)
    expect(punchIn.id).toBeDefined()
    expect(punchIn.checkIn).toBeDefined()
    expect(punchIn.status).toBe('Present')

    // Second punch on same day: Clock out
    const punchOut = storageService.recordAttendance(employeeId, employeeName)
    expect(punchOut.checkOut).toBeDefined()
    expect(punchOut.workHours).toBe(8.5)
  })

  it('retrieves shift rosters and processes attendance regularizations', () => {
    const shifts = storageService.getShifts()
    expect(shifts.length).toBeGreaterThanOrEqual(3)

    const reg = storageService.submitRegularization({
      employeeId: 'emp-2',
      employeeName: 'Priya Sharma',
      date: '2026-11-17',
      actualCheckIn: '09:00 AM',
      actualCheckOut: '06:00 PM',
      reason: 'Off-site recruiting event',
    })

    expect(reg.id).toBeDefined()
    expect(reg.status).toBe('Pending')

    const approved = storageService.updateRegularizationStatus(reg.id, 'Approved')
    expect(approved.status).toBe('Approved')
  })

  // Module 5: Leave Management
  it('submits leave applications, calculates balances, and updates approval status', () => {
    const initialPolicies = storageService.getLeavePolicies()
    expect(initialPolicies.length).toBeGreaterThanOrEqual(4)

    const initialHolidays = storageService.getHolidays()
    expect(initialHolidays.length).toBeGreaterThanOrEqual(5)

    const newLeave = storageService.addLeaveRequest({
      employeeId: 'emp-1',
      employeeName: 'Sarah Connor',
      department: 'Engineering',
      leaveType: 'Annual',
      startDate: '2026-12-24',
      endDate: '2026-12-28',
      daysCount: 4,
      reason: 'Year-end family holiday',
    })

    expect(newLeave.id).toBeDefined()
    expect(newLeave.status).toBe('Pending')

    const approved = storageService.updateLeaveStatus(newLeave.id, 'Approved')
    expect(approved.status).toBe('Approved')
  })

  // Module 6: Payroll
  it('processes monthly payroll batch runs and calculates statutory deductions', () => {
    const payslips = storageService.processPayrollRun('November 2026')
    expect(payslips.length).toBeGreaterThan(0)

    const sample = payslips[0]!
    expect(sample.monthYear).toBe('November 2026')
    expect(sample.breakdown.grossEarnings).toBeGreaterThan(0)
    expect(sample.breakdown.providentFund).toBeGreaterThan(0)
    expect(sample.breakdown.incomeTaxTds).toBeGreaterThan(0)
    expect(sample.breakdown.netPay).toBe(
      sample.breakdown.grossEarnings - sample.breakdown.totalDeductions
    )
    expect(sample.paymentStatus).toBe('Paid')
  })

  // Dashboard View: Daily Attendance Register & Leave Management Top 5 (without Departments)
  it('renders Daily Attendance Register and Top 5 Leave Management on Dashboard and removes departments', () => {
    store.dispatch(
      loginSuccess({
        user: demoUsers.admin,
        token: 'test-token',
      })
    )

    const wrapper = mount(DashboardView, {
      global: {
        plugins: [router],
      },
    })

    const text = wrapper.text()
    expect(text).toContain('Daily Attendance Register')
    expect(text).toContain('Leave Management')
    expect(text).toContain('Top 5')
    // Department breakdown header is removed
    expect(wrapper.find('h2:contains("Departments")').exists()).toBe(false)
  })
})
