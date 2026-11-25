import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query'
import { apiRequest, runQuery } from '@/services/apiClient'
import type { MasterDataItem, MasterDataCategory } from '@/types/mdm'
import type {
  CompanyInfo,
  Branch,
  Department,
  Designation,
  Grade,
  RolePermission,
  ApprovalWorkflow,
  Employee,
  EmployeeDocument,
  OnboardingCandidate,
  Shift,
  AttendanceRecord,
  AttendanceRegister,
  AttendanceCalendar,
  RegularizationRequest,
  RemoteWorkRequest,
  PunchState,
  WorkLocation,
  Resignation,
  LeaveTypePolicy,
  Holiday,
  LeaveRequest,
  LeaveBalance,
  Payslip,
  HRMSDashboardStats,
} from '@/types/hrms'

export const hrmsApi = createApi({
  reducerPath: 'hrmsApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: [
    'Stats',
    'Company',
    'Branches',
    'Departments',
    'Designations',
    'Roles',
    'Employees',
    'Onboarding',
    'Shifts',
    'Attendance',
    'Regularizations',
    'RemoteWork',
    'PunchState',
    'Resignations',
    'Leaves',
    'Payroll',
    'MasterData',
    'Workflows',
  ],
  endpoints: (builder) => ({
    // Dashboard Stats (Release 1)
    getStats: builder.query<HRMSDashboardStats, void>({
      async queryFn() {
        return runQuery(() => apiRequest('/app/stats'))
      },
      providesTags: ['Stats', 'Employees', 'Leaves', 'Attendance', 'Onboarding', 'Payroll'],
    }),

    // ==========================================
    // 1. HR ADMINISTRATION (Release 1)
    // ==========================================
    getCompany: builder.query<CompanyInfo, void>({
      async queryFn() {
        return runQuery(() => apiRequest('/app/company'))
      },
      providesTags: ['Company'],
    }),
    updateCompany: builder.mutation<CompanyInfo, Partial<CompanyInfo>>({
      async queryFn(payload) {
        return runQuery(() => apiRequest('/app/company', { method: 'PATCH', body: payload }))
      },
      invalidatesTags: ['Company'],
    }),
    getBranches: builder.query<Branch[], void>({
      async queryFn() {
        return runQuery(() => apiRequest('/app/branches'))
      },
      providesTags: ['Branches'],
    }),
    addBranch: builder.mutation<Branch, Omit<Branch, 'id'>>({
      async queryFn(payload) {
        return runQuery(() => apiRequest('/app/branches', { method: 'POST', body: payload }))
      },
      invalidatesTags: ['Branches'],
    }),
    getDepartments: builder.query<Department[], void>({
      async queryFn() {
        return runQuery(() => apiRequest('/app/departments'))
      },
      providesTags: ['Departments'],
    }),
    addDepartment: builder.mutation<Department, { name: string; code: string; head: string; budget: number }>({
      async queryFn(payload) {
        return runQuery(() => apiRequest('/app/departments', { method: 'POST', body: payload }))
      },
      invalidatesTags: ['Departments'],
    }),
    getDesignations: builder.query<Designation[], void>({
      async queryFn() {
        return runQuery(() => apiRequest('/app/designations'))
      },
      providesTags: ['Designations'],
    }),
    addDesignation: builder.mutation<Designation, Omit<Designation, 'id'>>({
      async queryFn(payload) {
        return runQuery(() => apiRequest('/app/designations', { method: 'POST', body: payload }))
      },
      invalidatesTags: ['Designations'],
    }),
    getGrades: builder.query<Grade[], void>({
      async queryFn() {
        return runQuery(() => apiRequest('/app/grades'))
      },
      providesTags: ['Designations'],
    }),
    addGrade: builder.mutation<Grade, Omit<Grade, 'id'>>({
      async queryFn(payload) {
        return runQuery(() => apiRequest('/app/grades', { method: 'POST', body: payload }))
      },
      invalidatesTags: ['Designations'],
    }),
    updateGrade: builder.mutation<Grade, { id: string; updates: Partial<Grade> }>({
      async queryFn({ id, updates }) {
        return runQuery(() => apiRequest(`/app/grades/${id}`, { method: 'PATCH', body: { updates } }))
      },
      invalidatesTags: ['Designations'],
    }),
    deleteGrade: builder.mutation<boolean, string>({
      async queryFn(id) {
        return runQuery(() => apiRequest(`/app/grades/${id}`, { method: 'DELETE' }))
      },
      invalidatesTags: ['Designations'],
    }),
    updateDepartment: builder.mutation<Department, { id: string; updates: Partial<Department> }>({
      async queryFn({ id, updates }) {
        return runQuery(() => apiRequest(`/app/departments/${id}`, { method: 'PATCH', body: { updates } }))
      },
      invalidatesTags: ['Departments'],
    }),
    deleteDepartment: builder.mutation<boolean, string>({
      async queryFn(id) {
        return runQuery(() => apiRequest(`/app/departments/${id}`, { method: 'DELETE' }))
      },
      invalidatesTags: ['Departments'],
    }),
    getRoles: builder.query<RolePermission[], void>({
      async queryFn() {
        return runQuery(() => apiRequest('/app/roles'))
      },
      providesTags: ['Roles'],
    }),
    updateRole: builder.mutation<RolePermission, { id: string; updates: Partial<RolePermission> }>({
      async queryFn({ id, updates }) {
        return runQuery(() => apiRequest(`/app/roles/${id}`, { method: 'PATCH', body: { updates } }))
      },
      invalidatesTags: ['Roles'],
    }),
    addRole: builder.mutation<RolePermission, Omit<RolePermission, 'id'>>({
      async queryFn(payload) {
        return runQuery(() => apiRequest('/app/roles', { method: 'POST', body: payload }))
      },
      invalidatesTags: ['Roles'],
    }),
    updateRolePermission: builder.mutation<RolePermission, { roleId: string; moduleName: string; field: 'read' | 'write' | 'delete' | 'approve'; value: boolean }>({
      async queryFn({ roleId, moduleName, field, value }) {
        return runQuery(() => apiRequest(`/app/roles/${roleId}/permission`, { method: 'PATCH', body: { moduleName, field, value } }))
      },
      invalidatesTags: ['Roles'],
    }),
    getWorkflows: builder.query<ApprovalWorkflow[], void>({
      async queryFn() {
        return runQuery(() => apiRequest('/app/workflows'))
      },
      providesTags: ['Workflows'],
    }),
    addWorkflow: builder.mutation<ApprovalWorkflow, Omit<ApprovalWorkflow, 'id'>>({
      async queryFn(payload) {
        return runQuery(() => apiRequest('/app/workflows', { method: 'POST', body: payload }))
      },
      invalidatesTags: ['Workflows'],
    }),
    updateWorkflow: builder.mutation<ApprovalWorkflow, { id: string; updates: Partial<ApprovalWorkflow> }>({
      async queryFn({ id, updates }) {
        return runQuery(() => apiRequest(`/app/workflows/${id}`, { method: 'PATCH', body: { updates } }))
      },
      invalidatesTags: ['Workflows'],
    }),
    deleteWorkflow: builder.mutation<boolean, string>({
      async queryFn(id) {
        return runQuery(() => apiRequest(`/app/workflows/${id}`, { method: 'DELETE' }))
      },
      invalidatesTags: ['Workflows'],
    }),
    addWorkflowLevel: builder.mutation<ApprovalWorkflow, { workflowId: string; level: { approverRole: string; description: string } }>({
      async queryFn({ workflowId, level }) {
        return runQuery(() => apiRequest(`/app/workflows/${workflowId}/levels`, { method: 'POST', body: { level } }))
      },
      invalidatesTags: ['Workflows'],
    }),
    updateWorkflowLevel: builder.mutation<ApprovalWorkflow, { workflowId: string; levelNumber: number; updates: { approverRole?: string; description?: string } }>({
      async queryFn({ workflowId, levelNumber, updates }) {
        return runQuery(() => apiRequest(`/app/workflows/${workflowId}/levels/${levelNumber}`, { method: 'PATCH', body: { updates } }))
      },
      invalidatesTags: ['Workflows'],
    }),
    deleteWorkflowLevel: builder.mutation<ApprovalWorkflow, { workflowId: string; levelNumber: number }>({
      async queryFn({ workflowId, levelNumber }) {
        return runQuery(() => apiRequest(`/app/workflows/${workflowId}/levels/${levelNumber}`, { method: 'DELETE' }))
      },
      invalidatesTags: ['Workflows'],
    }),

    // ==========================================
    // 2. EMPLOYEE MANAGEMENT (Release 1)
    // ==========================================
    getEmployees: builder.query<Employee[], { search?: string; department?: string; status?: string } | void>({
      async queryFn(args) {
        return runQuery(() =>
          apiRequest<Employee[]>('/app/employees', {
            query: args ? { search: args.search, department: args.department, status: args.status } : {},
          }),
        )
      },
      providesTags: ['Employees'],
    }),
    getEmployeeById: builder.query<Employee, string>({
      async queryFn(id) {
        return runQuery(() => apiRequest<Employee>(`/app/employees/${id}`))
      },
      providesTags: ['Employees'],
    }),
    addEmployee: builder.mutation<Employee, Omit<Employee, 'id'>>({
      async queryFn(payload) {
        return runQuery(() => apiRequest('/app/employees', { method: 'POST', body: payload }))
      },
      invalidatesTags: ['Employees', 'Stats'],
    }),
    updateEmployee: builder.mutation<Employee, { id: string; updates: Partial<Employee> }>({
      async queryFn({ id, updates }) {
        return runQuery(() => apiRequest(`/app/employees/${id}`, { method: 'PATCH', body: { updates } }))
      },
      invalidatesTags: ['Employees', 'Stats'],
    }),
    deleteEmployee: builder.mutation<boolean, string>({
      async queryFn(id) {
        return runQuery(() => apiRequest(`/app/employees/${id}`, { method: 'DELETE' }))
      },
      invalidatesTags: ['Employees', 'Stats'],
    }),
    recordTransferPromotion: builder.mutation<Employee, { employeeId: string; payload: { type: 'Promotion' | 'Transfer'; newRole?: string; newDepartment?: string; newSalary?: number } }>({
      async queryFn({ employeeId, payload }) {
        return runQuery(() => apiRequest(`/app/employees/${employeeId}/movements`, { method: 'POST', body: { payload } }))
      },
      invalidatesTags: ['Employees', 'Stats'],
    }),
    addEmployeeDocument: builder.mutation<EmployeeDocument, { employeeId: string; doc: { title: string; category: EmployeeDocument['category']; fileSize: string } }>({
      async queryFn({ employeeId, doc }) {
        return runQuery(() => apiRequest(`/app/employees/${employeeId}/documents`, { method: 'POST', body: { doc } }))
      },
      invalidatesTags: ['Employees'],
    }),
    verifyEmployeeDocument: builder.mutation<EmployeeDocument, { employeeId: string; documentId: string; status: 'Verified' | 'Rejected' }>({
      async queryFn({ employeeId, documentId, status }) {
        return runQuery(() => apiRequest(`/app/employees/${employeeId}/documents/${documentId}`, { method: 'PATCH', body: { status } }))
      },
      invalidatesTags: ['Employees'],
    }),

    // ==========================================
    // 3. ONBOARDING (Release 1)
    // ==========================================
    getOnboardingCandidates: builder.query<OnboardingCandidate[], void>({
      async queryFn() {
        return runQuery(() => apiRequest('/app/onboarding_candidates'))
      },
      providesTags: ['Onboarding'],
    }),
    toggleOnboardingTask: builder.mutation<OnboardingCandidate, { candidateId: string; taskId: string }>({
      async queryFn({ candidateId, taskId }) {
        return runQuery(() => apiRequest(`/app/onboarding_candidates/${candidateId}/toggle_task`, { method: 'POST', body: { taskId } }))
      },
      invalidatesTags: ['Onboarding', 'Stats'],
    }),
    addOnboardingCandidate: builder.mutation<OnboardingCandidate, { candidateName: string; email: string; jobTitle: string; department: string; joiningDate: string; assignedBuddy: string; shiftTiming?: string; assignedRole?: string; reportingManager?: string }>({
      async queryFn(payload) {
        return runQuery(() => apiRequest('/app/onboarding_candidates', { method: 'POST', body: payload }))
      },
      invalidatesTags: ['Onboarding', 'Stats'],
    }),
    convertOnboardingCandidate: builder.mutation<Employee, { candidateId: string; role?: string; grade?: string; approvalWorkflow?: string; salary?: number; shift?: string; reportingManagerName?: string; documents?: EmployeeDocument[] }>({
      async queryFn(payload) {
        return runQuery(() => apiRequest(`/app/onboarding_candidates/${payload.candidateId}/convert`, { method: 'POST', body: payload }))
      },
      invalidatesTags: ['Onboarding', 'Employees', 'Stats'],
    }),
    addOnboardingDocument: builder.mutation<OnboardingCandidate, { candidateId: string; doc: Omit<EmployeeDocument, 'id' | 'uploadDate'> }>({
      async queryFn({ candidateId, doc }) {
        return runQuery(() => apiRequest(`/app/onboarding_candidates/${candidateId}/documents`, { method: 'POST', body: { doc } }))
      },
      invalidatesTags: ['Onboarding'],
    }),

    // ==========================================
    // 4. ATTENDANCE & SHIFTS (Release 1)
    // ==========================================
    getShifts: builder.query<Shift[], void>({
      async queryFn() {
        return runQuery(() => apiRequest('/app/shifts'))
      },
      providesTags: ['Shifts'],
    }),
    addShift: builder.mutation<Shift, Omit<Shift, 'id'>>({
      async queryFn(payload) {
        return runQuery(() => apiRequest('/app/shifts', { method: 'POST', body: payload }))
      },
      invalidatesTags: ['Shifts'],
    }),
    updateShift: builder.mutation<Shift, { id: string; updates: Partial<Shift> }>({
      async queryFn({ id, updates }) {
        return runQuery(() => apiRequest(`/app/shifts/${id}`, { method: 'PATCH', body: { updates } }))
      },
      invalidatesTags: ['Shifts'],
    }),
    deleteShift: builder.mutation<boolean, string>({
      async queryFn(id) {
        return runQuery(() => apiRequest(`/app/shifts/${id}`, { method: 'DELETE' }))
      },
      invalidatesTags: ['Shifts'],
    }),
    getAttendance: builder.query<AttendanceRecord[], void>({
      async queryFn() {
        return runQuery(() => apiRequest('/app/attendance'))
      },
      providesTags: ['Attendance'],
    }),
    getAttendanceRegister: builder.query<AttendanceRegister, { date?: string; department?: string }>({
      async queryFn(args) {
        return runQuery(() => apiRequest('/app/attendance/daily_register', { query: { date: args.date, department: args.department } }))
      },
      providesTags: ['Attendance'],
    }),
    getAttendanceCalendar: builder.query<AttendanceCalendar, { month?: string; employeeId?: string }>({
      async queryFn(args) {
        return runQuery(() => apiRequest('/app/attendance/calendar', { query: { month: args.month, employeeId: args.employeeId } }))
      },
      providesTags: ['Attendance'],
    }),
    // Clock In / Clock Out with a work location (Office by default, or Client location).
    recordAttendance: builder.mutation<PunchState, { employeeId: string; location?: WorkLocation }>({
      async queryFn({ employeeId, location }) {
        return runQuery(() => apiRequest('/app/attendance/punch', { method: 'POST', body: { employeeId, location } }))
      },
      invalidatesTags: ['Attendance', 'Stats', 'PunchState', 'RemoteWork'],
    }),
    /** Today's clock state; returns null for logins without an employee profile. */
    getPunchState: builder.query<PunchState | null, string>({
      async queryFn(employeeId) {
        if (!employeeId) return { data: null }
        return runQuery(() => apiRequest('/app/attendance/today'))
      },
      providesTags: ['PunchState'],
    }),
    /** Optional { from, to } limits the list to that date range (Super Admin / HR / managers). */
    getRegularizations: builder.query<RegularizationRequest[], { from?: string; to?: string } | void>({
      async queryFn(range) {
        return runQuery(() => apiRequest('/app/regularizations', { query: range || {} }))
      },
      providesTags: ['Regularizations'],
    }),
    submitRegularization: builder.mutation<RegularizationRequest, Omit<RegularizationRequest, 'id' | 'status'>>({
      async queryFn(payload) {
        return runQuery(() => apiRequest('/app/regularizations', { method: 'POST', body: payload }))
      },
      invalidatesTags: ['Regularizations'],
    }),
    updateRegularizationStatus: builder.mutation<RegularizationRequest, { id: string; status: 'Approved' | 'Rejected' }>({
      async queryFn({ id, status }) {
        return runQuery(() => apiRequest(`/app/regularizations/${id}`, { method: 'PATCH', body: { status } }))
      },
      invalidatesTags: ['Regularizations', 'Attendance', 'Stats'],
    }),

    // Work-from-home applications (approved days show as WFH in attendance)
    applyWfh: builder.mutation<RemoteWorkRequest, { fromDate: string; toDate: string; reason: string }>({
      async queryFn(body) {
        return runQuery(() => apiRequest('/app/remote_work', { method: 'POST', body }))
      },
      invalidatesTags: ['RemoteWork', 'Attendance', 'PunchState'],
    }),
    getRemoteWork: builder.query<RemoteWorkRequest[], { from?: string; to?: string } | void>({
      async queryFn(range) {
        return runQuery(() => apiRequest('/app/remote_work', { query: range || {} }))
      },
      providesTags: ['RemoteWork'],
    }),
    decideRemoteWork: builder.mutation<RemoteWorkRequest, { id: string; status: 'Approved' | 'Rejected' }>({
      async queryFn({ id, status }) {
        return runQuery(() => apiRequest(`/app/remote_work/${id}`, { method: 'PATCH', body: { status } }))
      },
      invalidatesTags: ['RemoteWork', 'Attendance', 'Stats', 'PunchState'],
    }),
    cancelRemoteWork: builder.mutation<RemoteWorkRequest, string>({
      async queryFn(id) {
        return runQuery(() => apiRequest(`/app/remote_work/${id}/cancel`, { method: 'POST' }))
      },
      invalidatesTags: ['RemoteWork', 'Attendance', 'PunchState'],
    }),

    // Resignation
    getResignations: builder.query<Resignation[], void>({
      async queryFn() {
        return runQuery(() => apiRequest('/app/resignations'))
      },
      providesTags: ['Resignations'],
    }),
    getResignationPolicy: builder.query<{ noticePeriodDays: number }, void>({
      async queryFn() {
        return runQuery(() => apiRequest('/app/resignations/policy'))
      },
    }),
    submitResignation: builder.mutation<Resignation, { reason: string; lastWorkingDay?: string }>({
      async queryFn(body) {
        return runQuery(() => apiRequest('/app/resignations', { method: 'POST', body }))
      },
      invalidatesTags: ['Resignations'],
    }),
    decideResignation: builder.mutation<Resignation, { id: string; status: 'Approved' | 'Rejected'; lastWorkingDay?: string }>({
      async queryFn({ id, ...body }) {
        return runQuery(() => apiRequest(`/app/resignations/${id}`, { method: 'PATCH', body }))
      },
      invalidatesTags: ['Resignations', 'Employees', 'Stats'],
    }),
    withdrawResignation: builder.mutation<Resignation, string>({
      async queryFn(id) {
        return runQuery(() => apiRequest(`/app/resignations/${id}/withdraw`, { method: 'POST' }))
      },
      invalidatesTags: ['Resignations'],
    }),

    // ==========================================
    // 5. LEAVE & HOLIDAYS (Release 1)
    // ==========================================
    getLeaveBalances: builder.query<LeaveBalance[], string | void>({
      async queryFn(employeeId) {
        return runQuery(() => apiRequest('/app/leave_balances', { query: { employeeId: employeeId || undefined } }))
      },
      providesTags: ['Leaves'],
    }),
    getLeavePolicies: builder.query<LeaveTypePolicy[], void>({
      async queryFn() {
        return runQuery(() => apiRequest('/app/leave_policies'))
      },
      providesTags: ['Leaves'],
    }),
    addLeavePolicy: builder.mutation<LeaveTypePolicy, Omit<LeaveTypePolicy, 'id'>>({
      async queryFn(payload) {
        return runQuery(() => apiRequest('/app/leave_policies', { method: 'POST', body: payload }))
      },
      invalidatesTags: ['Leaves'],
    }),
    updateLeavePolicy: builder.mutation<LeaveTypePolicy, { id: string; updates: Partial<LeaveTypePolicy> }>({
      async queryFn({ id, updates }) {
        return runQuery(() => apiRequest(`/app/leave_policies/${id}`, { method: 'PATCH', body: { updates } }))
      },
      invalidatesTags: ['Leaves'],
    }),
    deleteLeavePolicy: builder.mutation<boolean, string>({
      async queryFn(id) {
        return runQuery(() => apiRequest(`/app/leave_policies/${id}`, { method: 'DELETE' }))
      },
      invalidatesTags: ['Leaves'],
    }),
    getHolidays: builder.query<Holiday[], void>({
      async queryFn() {
        return runQuery(() => apiRequest('/app/holidays'))
      },
      providesTags: ['Leaves'],
    }),
    addHoliday: builder.mutation<Holiday, Omit<Holiday, 'id'>>({
      async queryFn(payload) {
        return runQuery(() => apiRequest('/app/holidays', { method: 'POST', body: payload }))
      },
      invalidatesTags: ['Leaves'],
    }),
    updateHoliday: builder.mutation<Holiday, { id: string; updates: Partial<Holiday> }>({
      async queryFn({ id, updates }) {
        return runQuery(() => apiRequest(`/app/holidays/${id}`, { method: 'PATCH', body: { updates } }))
      },
      invalidatesTags: ['Leaves'],
    }),
    deleteHoliday: builder.mutation<boolean, string>({
      async queryFn(id) {
        return runQuery(() => apiRequest(`/app/holidays/${id}`, { method: 'DELETE' }))
      },
      invalidatesTags: ['Leaves'],
    }),
    getLeaveRequests: builder.query<LeaveRequest[], void>({
      async queryFn() {
        return runQuery(() => apiRequest('/app/leave_requests'))
      },
      providesTags: ['Leaves'],
    }),
    applyLeave: builder.mutation<LeaveRequest, Omit<LeaveRequest, 'id' | 'appliedOn' | 'status'>>({
      async queryFn(payload) {
        return runQuery(() => apiRequest('/app/leave_requests', { method: 'POST', body: payload }))
      },
      invalidatesTags: ['Leaves', 'Stats'],
    }),
    updateLeaveStatus: builder.mutation<LeaveRequest, { id: string; status: 'Approved' | 'Rejected' }>({
      async queryFn({ id, status }) {
        return runQuery(() => apiRequest(`/app/leave_requests/${id}`, { method: 'PATCH', body: { status } }))
      },
      invalidatesTags: ['Leaves', 'Employees', 'Stats'],
    }),

    // ==========================================
    // 6. PAYROLL (Release 1)
    // ==========================================
    getPayslips: builder.query<Payslip[], void>({
      async queryFn() {
        return runQuery(() => apiRequest('/app/payslips'))
      },
      providesTags: ['Payroll'],
    }),
    processPayrollRun: builder.mutation<Payslip[], string>({
      async queryFn(monthYear) {
        return runQuery(() => apiRequest('/app/payroll/process', { method: 'POST', body: { monthYear } }))
      },
      invalidatesTags: ['Payroll', 'Stats'],
    }),
    togglePayslipAccess: builder.mutation<Payslip, string>({
      async queryFn(payslipId) {
        return runQuery(() => apiRequest(`/app/payslips/${payslipId}/toggle_access`, { method: 'PATCH' }))
      },
      invalidatesTags: ['Payroll'],
    }),
    addSalaryBreakdown: builder.mutation<Payslip, { employeeId: string; basic: number; hra: number; specialAllowance: number; performanceBonus?: number }>({
      async queryFn(payload) {
        return runQuery(() => apiRequest('/app/payroll/salary_breakdown', { method: 'POST', body: payload }))
      },
      invalidatesTags: ['Payroll', 'Stats'],
    }),

    // ==========================================
    // MASTER DATA MANAGEMENT (MDM - Release 1)
    // ==========================================
    getMasterData: builder.query<MasterDataItem[], { category?: MasterDataCategory } | void>({
      async queryFn(args) {
        return runQuery(() => apiRequest<MasterDataItem[]>('/app/master_data', { query: { category: args?.category } }))
      },
      providesTags: ['MasterData'],
    }),
    addMasterDataItem: builder.mutation<MasterDataItem, Omit<MasterDataItem, 'id' | 'createdAt' | 'updatedAt'>>({
      async queryFn(payload) {
        return runQuery(() => apiRequest('/app/master_data', { method: 'POST', body: payload }))
      },
      invalidatesTags: ['MasterData'],
    }),
    toggleMasterDataItem: builder.mutation<MasterDataItem, string>({
      async queryFn(id) {
        return runQuery(() => apiRequest(`/app/master_data/${id}/toggle`, { method: 'PATCH' }))
      },
      invalidatesTags: ['MasterData'],
    }),
    deleteMasterDataItem: builder.mutation<boolean, string>({
      async queryFn(id) {
        return runQuery(() => apiRequest(`/app/master_data/${id}`, { method: 'DELETE' }))
      },
      invalidatesTags: ['MasterData'],
    }),
  }),
})

export default hrmsApi
