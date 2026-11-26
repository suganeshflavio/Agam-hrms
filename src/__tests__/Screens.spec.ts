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
    expect(wrapper.findAll('[data-status="present"]')).toHaveLength(1)
    expect(wrapper.findAll('[data-status="absent"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('1 day(s) marked')
  })

  it('lets an employee request regularization for a missed day', async () => {
    const month = thisMonth()
    const days = Array.from({ length: 28 }, (_, i) => ({
      date: `${month}-${String(i + 1).padStart(2, '0')}`,
      status: i === 0 ? 'absent' : 'upcoming',
    }))
    const fetchMock = stubBackend({
      'GET /app/attendance/calendar': { month, employeeId: '11', days, summary: { absent: 1 } },
      'POST /app/regularizations': { id: '1', employeeId: '11', employeeName: 'Tester', date: `${month}-01`, actualCheckIn: '', actualCheckOut: '', correctedCheckIn: '09:00 AM', correctedCheckOut: '06:00 PM', reason: 'Forgot to punch', status: 'Pending' },
    })
    signIn(makeUser('General Employee'))
    wrapper = await mountAt('/attendance')

    await wrapper.find('[data-status="absent"]').trigger('click')
    await settle()
    const open = wrapper.findAll('button').find((b) => b.text().includes('Request regularization'))
    expect(open).toBeDefined()
    await open!.trigger('click')
    await settle()
    await wrapper.find('textarea').setValue('Forgot to punch')
    await wrapper.find('form').trigger('submit')
    await settle()

    const post = fetchMock.mock.calls.find(([url, init]) => String(url).includes('/app/regularizations') && (init as RequestInit)?.method === 'POST')
    expect(post).toBeDefined()
    expect(JSON.parse(String((post![1] as RequestInit).body))).toMatchObject({ date: `${month}-01`, correctedCheckIn: '09:00', correctedCheckOut: '18:00', reason: 'Forgot to punch' })
    expect(wrapper.text()).toContain('Request sent for approval')
  })

  const postBody = (fetchMock: ReturnType<typeof stubBackend>, path: string) => {
    const call = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith(path) && (init as RequestInit)?.method === 'POST')
    return call ? JSON.parse(String((call[1] as RequestInit).body)) : undefined
  }

  const radio = (w: VueWrapper, label: string) => w.findAll('[role="radio"]').find((b) => b.text().includes(label))!

  it('clocks in at the chosen work location, Office by default', async () => {
    const clockedIn = { employeeId: '11', clockedIn: true, location: 'Client location', since: '09:30 AM', doneForDay: false }
    const fetchMock = stubBackend({ 'POST /app/attendance/punch': clockedIn })
    signIn(makeUser('General Employee'))
    wrapper = await mountAt('/attendance')

    expect(radio(wrapper, 'Office').attributes('aria-checked')).toBe('true')
    expect(wrapper.findAll('[role="radio"]').map((r) => r.text())).toEqual(['Office', 'Client location'])
    await radio(wrapper, 'Client location').trigger('click')
    await wrapper.findAll('button').find((b) => b.text() === 'Clock In')!.trigger('click')
    await settle()

    expect(postBody(fetchMock, '/app/attendance/punch')).toMatchObject({ employeeId: '11', location: 'Client location' })
    expect(wrapper.text()).toContain('Clocked in at Client location')
  })

  it('closes clock-in after clocking out and points to a regularization for later work', async () => {
    const fetchMock = stubBackend({
      'GET /app/attendance/today': {
        employeeId: '11', clockedIn: false, doneForDay: true,
        office: { location: 'Office', checkIn: '09:00 AM', checkOut: '06:00 PM' },
      },
    })
    signIn(makeUser('General Employee'))
    wrapper = await mountAt('/attendance')

    expect(wrapper.findAll('[role="radio"]')).toHaveLength(0)
    const done = wrapper.findAll('button').find((b) => b.text() === 'Done for today')!
    expect(done.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Worked after clocking out? Request a regularization')

    await wrapper.findAll('button').find((b) => b.text().includes('Request regularization'))!.trigger('click')
    await settle()
    expect(router.currentRoute.value.query.regularize).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(fetchMock.mock.calls.some(([, init]) => (init as RequestInit)?.method === 'POST')).toBe(false)
  })

  it('edits an employee from Employee Onboarding without sending masked values back', async () => {
    const fetchMock = stubBackend({
      'PATCH /app/employees/11': { id: '11', employeeCode: 'TEST-0011', firstName: 'Asha', lastName: 'Menon', email: 'asha@example.test' },
    })
    signIn(makeUser('Super Admin'))
    wrapper = await mountAt('/employees')

    await wrapper.find('button[title="Edit Employee"]').trigger('click')
    await settle()
    expect(wrapper.text()).toContain('Edit Asha Rao')
    const lastName = wrapper.find('#lastName')
    expect((lastName.element as HTMLInputElement).value).toBe('Rao')
    await lastName.setValue('Menon')

    await wrapper.findAll('button').find((b) => b.text().includes('Review'))!.trigger('click')
    await settle()
    await wrapper.findAll('button').find((b) => b.text().includes('Save changes'))!.trigger('click')
    await settle()

    const call = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith('/app/employees/11') && (init as RequestInit)?.method === 'PATCH')
    expect(call).toBeDefined()
    const body = JSON.parse(String((call![1] as RequestInit).body))
    expect(body.updates).toMatchObject({ firstName: 'Asha', lastName: 'Menon', department: 'Engineering', salary: 600000 })
    expect(body.updates).not.toHaveProperty('panNumber')
    expect(body.updates).not.toHaveProperty('createLogin')
    expect(wrapper.text()).toContain('details were updated')
  })

  it('applies for work from home from self-service', async () => {
    const fetchMock = stubBackend({
      'POST /app/remote_work': {
        id: '1', employeeId: '11', employeeName: 'Tester', fromDate: '2026-11-23', toDate: '2026-11-24', days: 2,
        reason: 'Internet installation', status: 'Pending', appliedOn: '2026-11-20', canCancel: true,
      },
    })
    signIn(makeUser('General Employee'))
    wrapper = await mountAt('/self-service')
    await wrapper.findAll('button').find((b) => b.text().includes('Work From Home') && !b.text().includes('Apply'))!.trigger('click')
    await settle()
    await wrapper.findAll('button').find((b) => b.text().includes('Apply Work From Home'))!.trigger('click')
    await settle()

    const form = wrapper.find('form')
    const [from, to] = form.findAll('input[type="date"]')
    await from!.setValue('2026-11-23')
    await to!.setValue('2026-11-24')
    expect(form.text()).toContain('2 weekday(s)')
    await form.find('textarea').setValue('Internet installation')
    await form.trigger('submit')
    await settle()

    expect(postBody(fetchMock, '/app/remote_work')).toEqual({ fromDate: '2026-11-23', toDate: '2026-11-24', reason: 'Internet installation' })
    expect(wrapper.text()).toContain('shows as WFH in your attendance calendar once approved')
  })

  it('shows approved work-from-home days as WFH in the calendar', async () => {
    const month = thisMonth()
    const days = Array.from({ length: 28 }, (_, i) => ({
      date: `${month}-${String(i + 1).padStart(2, '0')}`,
      status: i === 0 ? 'wfh' : i === 1 ? 'upcoming' : 'upcoming',
      ...(i === 1 ? { wfhPending: true } : {}),
    }))
    stubBackend({ 'GET /app/attendance/calendar': { month, employeeId: '11', days, summary: { wfh: 1, upcoming: 27 } } })
    signIn(makeUser('General Employee'))
    wrapper = await mountAt('/attendance')

    expect(wrapper.findAll('[data-status="wfh"]')).toHaveLength(1)
    expect(wrapper.find('[title="Work from home pending approval"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Work from home')
  })

  it('lets Super Admin filter regularizations and work-from-home requests by date', async () => {
    const fetchMock = stubBackend()
    signIn(makeUser('Super Admin'))
    wrapper = await mountAt('/attendance')
    await wrapper.findAll('button').find((b) => b.text().includes('Requests & Approvals'))!.trigger('click')
    await settle()
    expect(wrapper.text()).toContain('Show requests for')

    await wrapper.findAll('button').find((b) => b.text() === 'Today')!.trigger('click')
    await settle()

    const d = new Date()
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const ranged = (path: string) =>
      fetchMock.mock.calls.some(([url]) => {
        const u = new URL(String(url), 'http://localhost')
        return u.pathname.endsWith(path) && u.searchParams.get('from') === today && u.searchParams.get('to') === today
      })
    expect(ranged('/app/remote_work')).toBe(true) // Work From Home sub-tab is open first

    await wrapper.findAll('[role="tab"]').find((b) => b.text().includes('Regularizations'))!.trigger('click')
    await settle()
    expect(ranged('/app/regularizations')).toBe(true)
  })

  it('pages long request lists 10 at a time', async () => {
    const wfh = Array.from({ length: 23 }, (_, i) => ({
      id: String(i + 1), employeeId: '12', employeeName: `Person ${i + 1}`, fromDate: '2026-11-23', toDate: '2026-11-23',
      days: 1, reason: 'Working from home', status: 'Approved', appliedOn: '2026-11-20',
    }))
    stubBackend({ 'GET /app/remote_work': wfh })
    signIn(makeUser('Super Admin'))
    wrapper = await mountAt('/attendance')
    await wrapper.findAll('button').find((b) => b.text().includes('Requests & Approvals'))!.trigger('click')
    await settle()
    await wrapper.findAll('button').find((b) => b.text() === 'All')!.trigger('click')
    await settle()

    expect(wrapper.text()).toContain('Showing 1–10 of 23')
    await wrapper.findAll('button').find((b) => b.text().includes('Next'))!.trigger('click')
    await settle()
    expect(wrapper.text()).toContain('Showing 11–20 of 23')
    await wrapper.findAll('button').find((b) => b.text() === '3')!.trigger('click')
    await settle()
    expect(wrapper.text()).toContain('Showing 21–23 of 23')
  })

  it('shows month summary cards, an encouragement message and quick actions on the calendar', async () => {
    const month = thisMonth()
    const days = Array.from({ length: 28 }, (_, i) => ({
      date: `${month}-${String(i + 1).padStart(2, '0')}`,
      status: i < 9 ? 'present' : i === 9 ? 'wfh' : 'upcoming',
    }))
    stubBackend({
      'GET /app/attendance/calendar': { month, employeeId: '11', days, summary: { present: 9, wfh: 1, upcoming: 18 } },
    })
    signIn(makeUser('General Employee'))
    wrapper = await mountAt('/attendance')

    expect(wrapper.text()).toContain('10 / 10') // days present incl. WFH, out of working days so far
    expect(wrapper.text()).toContain('Great job!')
    expect(wrapper.text()).toContain('100% attendance this month')

    await wrapper.findAll('button').find((b) => b.text().includes('Apply work from home'))!.trigger('click')
    await settle()
    expect(router.currentRoute.value.path).toBe('/self-service')
    expect(router.currentRoute.value.query.tab).toBe('wfh')
    expect(wrapper.text()).toContain('Apply Work From Home')
  })

  const todo = (over: Record<string, unknown> = {}) => ({
    id: '1', title: 'Prepare attendance report', description: '', status: 'To do', priority: 'High', dueDate: '2026-11-01',
    overdue: true, assigneeId: '11', assigneeName: 'Tester', createdById: '1', createdByName: 'Manager One', createdByMe: false,
    createdAt: '2026-11-20T10:00:00Z', canEdit: false, canDelete: false, canChangeStatus: true, ...over,
  })
  const project = (over: Record<string, unknown> = {}) => ({
    id: '7', name: 'Payroll Revamp', code: 'PAYROLL_REVAMP', clientName: 'Agam', description: '', status: 'Active',
    startDate: '2026-11-01', endDate: '2026-12-31', managerId: '12', managerName: 'Ravi Kumar',
    members: [{ employeeId: '11', name: 'Asha Rao', role: 'Developer' }],
    taskCounts: { todo: 1, inProgress: 0, done: 1 }, progress: 50, canManage: false, ...over,
  })

  it('shows My Tasks as one board, filtered by project', async () => {
    const fetchMock = stubBackend({
      'GET /app/projects': [project()],
      'GET /app/todos': [
        todo(),
        todo({ id: '2', title: 'Design payslip PDF', projectId: '7', projectName: 'Payroll Revamp', status: 'In progress', overdue: false }),
      ],
      'PATCH /app/todos/1': todo({ status: 'Done', overdue: false }),
    })
    signIn(makeUser('General Employee'))
    wrapper = await mountAt('/todos')

    const nav = wrapper.find('nav').exists() ? wrapper.find('nav').text() : wrapper.text()
    expect(nav).toContain('My Tasks')
    expect(nav).not.toContain('Projects') // employees reach their projects from My Tasks
    expect(wrapper.text()).not.toContain('Assigned by me')
    expect(wrapper.text()).not.toContain('Personal')

    // Board: a todo in "To do", project task in "In progress"
    expect(wrapper.find('[data-column="To do"]').text()).toContain('Prepare attendance report')
    expect(wrapper.find('[data-column="In progress"]').text()).toContain('Design payslip PDF')
    expect(wrapper.text()).toContain('1 overdue')

    // Filter to the project
    await wrapper.findAll('button').find((b) => b.text().includes('Payroll Revamp') && b.text().includes('mine'))!.trigger('click')
    await settle()
    expect(wrapper.findAll('[data-task]')).toHaveLength(1)
    expect(wrapper.text()).toContain('Open full project board')

    // Back to all, open the first todo and mark it done
    await wrapper.findAll('button').find((b) => b.text().startsWith('All'))!.trigger('click')
    await settle()
    await wrapper.find('[data-task="1"]').trigger('click')
    await settle()
    await wrapper.find('[role="dialog"]').findAll('button').find((b) => b.text() === 'Done')!.trigger('click')
    await settle()
    const call = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith('/app/todos/1') && (init as RequestInit)?.method === 'PATCH')
    expect(JSON.parse(String((call![1] as RequestInit).body))).toEqual({ updates: { status: 'Done' } })
  })

  it('shows approval and task notifications in the bell and opens them', async () => {
    const fetchMock = stubBackend({
      'GET /app/projects': [],
      'GET /app/todos': [],
      'GET /notifications/unread_count': { unread_count: 2 },
      'GET /notifications': [
        { id: 31, category: 'approval_requested', title: 'Approval required: WFH 2–3 Dec', body: 'Asha Rao submitted it for your approval.', data: {}, record_type: 'RemoteWorkRequest', record_id: 4, read: false, read_at: null, created_at: new Date().toISOString() },
        { id: 30, category: 'todo', title: 'New task: Write tests', body: 'From Ravi Kumar', data: { project_id: '7' }, record_type: 'Todo', record_id: 9, read: false, read_at: null, created_at: new Date().toISOString() },
      ],
      'PATCH /notifications/30/read': { id: 30, read: true },
    })
    signIn(makeUser('General Employee'))
    wrapper = await mountAt('/todos')

    expect(wrapper.find('[data-unread]').text()).toBe('2')
    await wrapper.find('button[aria-label="Notifications"]').trigger('click')
    await settle()
    expect(wrapper.text()).toContain('Approval required: WFH 2–3 Dec')
    expect(wrapper.text()).toContain('2 new')

    await wrapper.find('[data-notification="30"]').trigger('click')
    await settle()
    expect(fetchMock.mock.calls.some(([url, init]) => String(url).endsWith('/notifications/30/read') && (init as RequestInit)?.method === 'PATCH')).toBe(true)
    expect(router.currentRoute.value.path).toBe('/todos')
  })

  it('lists projects and adds a task on the project board', async () => {
    const fetchMock = stubBackend({
      'GET /app/projects': [project()],
      'GET /app/projects/7': project(),
      'GET /app/todos': [todo({ id: '5', title: 'Design payslip PDF', projectId: '7', projectName: 'Payroll Revamp', status: 'In progress' })],
      'POST /app/todos': todo({ id: '6', title: 'Write tests', projectId: '7' }),
    })
    signIn(makeUser('General Employee'))
    wrapper = await mountAt('/projects')
    expect(wrapper.text()).toContain('Payroll Revamp')
    expect(wrapper.text()).toContain('1 of 2 tasks done')
    expect(wrapper.text()).not.toContain('New project') // needs Projects & Tasks "Write"

    await router.push('/projects/7')
    await settle()
    expect(wrapper.text()).toContain('Task board')
    expect(wrapper.text()).toContain('Design payslip PDF')
    expect(wrapper.findAll('[data-task]')).toHaveLength(1) // compact cards; details open on click
    await wrapper.find('[data-task="5"]').trigger('click')
    await settle()
    expect(wrapper.find('[role="dialog"]').text()).toContain('Design payslip PDF')
    expect(wrapper.find('[role="dialog"]').text()).toContain('Assigned to')
    await wrapper.find('button[aria-label="Close"]').trigger('click')
    await settle()
    expect(wrapper.text()).not.toContain('Add to project') // only managers manage members

    await wrapper.findAll('button').find((b) => b.text().includes('Add task'))!.trigger('click')
    await settle()
    const form = wrapper.find('form')
    await form.find('input[type="text"]').setValue('Write tests')
    await form.trigger('submit')
    await settle()
    expect(postBody(fetchMock, '/app/todos')).toMatchObject({ title: 'Write tests', projectId: '7', status: 'To do' })
  })

  it('sets a leave policy quota per salary grade', async () => {
    const fetchMock = stubBackend({
      'GET /app/grades': [{ id: '1', name: 'L1 Junior', level: 1 }, { id: '2', name: 'L2 Senior', level: 2 }],
      'GET /app/leave_policies': [{ id: '9', name: 'Sick', totalAllowedPerYear: 10, accrualFrequency: 'Yearly', carryForwardAllowed: false,
                                    maxCarryForwardDays: 0, paid: true, gradeQuotas: [{ gradeId: '1', grade: 'L1 Junior', quota: 12 }] }],
      'PATCH /app/leave_policies/9': { id: '9', name: 'Sick', totalAllowedPerYear: 10 },
    })
    signIn(makeUser('Super Admin'))
    wrapper = await mountAt('/leaves')
    await wrapper.findAll('button').find((b) => b.text().includes('Leave Policies'))!.trigger('click')
    await settle()
    expect(wrapper.text()).toContain('L1 Junior: 12 days')

    const edit = wrapper.findAll('button').find((b) => b.attributes('title')?.includes('Edit') || b.text().trim() === 'Edit')
    await edit!.trigger('click')
    await settle()
    await wrapper.find('input[aria-label="L2 Senior days per year"]').setValue('15')
    await wrapper.findAll('button').find((b) => /save|update/i.test(b.text()) && !b.text().includes('Policies'))!.trigger('click')
    await settle()

    const call = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith('/app/leave_policies/9') && (init as RequestInit)?.method === 'PATCH')
    expect(call).toBeDefined()
    expect(JSON.parse(String((call![1] as RequestInit).body)).updates.gradeQuotas).toEqual([
      { gradeId: '1', quota: 12 }, { gradeId: '2', quota: 15 },
    ])
  })

  it('asks for confirmation before submitting a resignation', async () => {
    const fetchMock = stubBackend({
      'POST /app/resignations': { id: '1', employeeId: '11', employeeName: 'Tester', employeeCode: 'T-1', department: 'Eng', designation: 'Dev', submittedOn: '2026-11-20', proposedLastDay: '2026-12-20', noticeDays: 30, reason: 'Moving cities', status: 'Pending', canWithdraw: true },
    })
    signIn(makeUser('General Employee'))
    wrapper = await mountAt('/self-service')
    await wrapper.findAll('button').find((b) => b.text().includes('Resignation'))!.trigger('click')
    await settle()
    expect(wrapper.text()).toContain('notice period: 30 days')

    const form = wrapper.find('form')
    await form.find('textarea').setValue('Moving cities')
    await form.trigger('submit')
    await settle()
    expect(wrapper.text()).toContain('Type RESIGN to confirm')
    expect(postBody(fetchMock, '/app/resignations')).toBeUndefined()

    await form.find('input[placeholder="RESIGN"]').setValue('resign')
    await form.trigger('submit')
    await settle()
    expect(postBody(fetchMock, '/app/resignations')).toMatchObject({ reason: 'Moving cities' })
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
