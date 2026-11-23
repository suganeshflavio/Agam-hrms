// Test-only backend stub: fixtures here never ship in the app.
import { vi } from 'vitest'
import { store } from '@/redux/store'
import { loginSuccess, logout } from '@/redux/slices/authSlice'
import { hrmsApi } from '@/redux/api/hrmsApi'
import type { AuthUser, SystemRoleType, UserPermission } from '@/types/auth'

type Routes = Record<string, unknown>

const MODULES: UserPermission['module'][] = [
  'admin', 'employees', 'onboarding', 'recruitment', 'attendance', 'leaves', 'payroll',
  'performance', 'learning', 'expenses', 'exit', 'master-data',
]

const all = (on: boolean) => ({ view: on, create: on, edit: on, delete: on, approve: on, export: on })

/**
 * Per-module flags exactly as the backend sends them: Super Admin / HR Manager
 * get everything; other roles only what `grants` lists (Roles & Permissions).
 */
export const makeUser = (
  role: SystemRoleType,
  overrides: Partial<AuthUser> = {},
  grants: Partial<Record<UserPermission['module'], Partial<UserPermission['actions']>>> = {},
): AuthUser => {
  const full = role === 'Super Admin' || role === 'HR Manager'
  const defaults: typeof grants = role === 'Department Manager' ? { employees: { view: true } } : {}
  return {
    id: '11',
    employeeId: '11',
    name: `${role} Tester`,
    email: `${role.toLowerCase().replace(/ /g, '.')}@example.test`,
    role,
    department: 'Engineering',
    designation: 'Engineer',
    permissions: MODULES.map((module) => ({
      module,
      actions: { ...all(full), ...(defaults[module] || {}), ...(grants[module] || {}) },
    })),
    ...overrides,
  }
}

export const fixtures = {
  employees: [
    {
      id: '11', employeeCode: 'TEST-0011', firstName: 'Asha', lastName: 'Rao', email: 'asha@example.test', phone: '9000000011',
      department: 'Engineering', designation: 'Engineer', grade: 'L1', branch: 'Head Office', employmentType: 'Full-time',
      status: 'Active', joiningDate: '2025-01-06', salary: 600000, hasLogin: true, documents: [], history: [],
    },
    {
      id: '12', employeeCode: 'TEST-0012', firstName: 'Ravi', lastName: 'Kumar', email: 'ravi@example.test', phone: '9000000012',
      department: 'Finance', designation: 'Analyst', grade: 'L1', branch: 'Head Office', employmentType: 'Full-time',
      status: 'Active', joiningDate: '2025-02-03', salary: 500000, hasLogin: false, reportingManagerId: '11', documents: [], history: [],
    },
  ],
  departments: [
    { id: '1', name: 'Engineering', code: 'ENG', head: 'Asha Rao', totalEmployees: 1, budget: 0 },
    { id: '2', name: 'Finance', code: 'FIN', head: '', totalEmployees: 1, budget: 0 },
  ],
  branches: [{ id: '1', name: 'Head Office', code: 'HO', address: '', city: '', country: '', isHeadquarters: true, timezone: 'Asia/Kolkata', activeEmployees: 2 }],
  stats: { totalEmployees: 2, activeEmployees: 2, presentToday: 0, onLeaveToday: 0, pendingLeaveRequests: 0, onboardingInProgress: 0, payrollProcessedThisMonth: 0 },
  company: { id: '1', name: 'Test Company', legalName: '', registrationNumber: '', taxId: '', website: '', industry: '', headquarters: '', currency: 'INR', fiscalYearStart: 'April' },
  roles: [
    { id: '1', roleName: 'Department Manager', description: '', usersCount: 0,
      permissions: [{ module: 'HR Administration', read: false, write: false, delete: false, approve: false }] },
  ],
}

const defaults: Routes = {
  'GET /app/employees': fixtures.employees,
  'GET /app/departments': fixtures.departments,
  'GET /app/branches': fixtures.branches,
  'GET /app/designations': [],
  'GET /app/grades': [],
  'GET /app/roles': fixtures.roles,
  'GET /app/workflows': [],
  'GET /app/stats': fixtures.stats,
  'GET /app/company': fixtures.company,
  'GET /app/shifts': [],
  'GET /app/attendance': [],
  'GET /app/regularizations': [],
  'GET /app/leave_policies': [],
  'GET /app/holidays': [],
  'GET /app/leave_requests': [],
  'GET /app/payslips': [],
  'GET /app/onboarding_candidates': [],
  'GET /app/master_data': [],
}

/** Replaces fetch with canned `{ status: 'success', data }` responses. Returns the mock for assertions. */
export function stubBackend(overrides: Routes = {}) {
  const routes = { ...defaults, ...overrides }
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost')
    const key = `${(init?.method || 'GET').toUpperCase()} ${url.pathname.replace(/^\/api\/v1/, '')}`
    if (!(key in routes)) {
      return new Response(JSON.stringify({ status: 'error', message: `Not stubbed: ${key}` }), { status: 404 })
    }
    const body = routes[key]
    if (body instanceof Response) return body
    return new Response(JSON.stringify({ status: 'success', data: body }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

export function signIn(user: AuthUser) {
  store.dispatch(hrmsApi.util.resetApiState())
  store.dispatch(loginSuccess({ user, token: 'test-token', expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() }))
}

export function signOut() {
  store.dispatch(logout())
  store.dispatch(hrmsApi.util.resetApiState())
}
