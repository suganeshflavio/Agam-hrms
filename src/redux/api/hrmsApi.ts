import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query'
import { storageService } from '@/services/storageService'
import { mdmService } from '@/services/mdmService'
import { apiRequest, isMockApi, runQuery } from '@/services/apiClient'
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
  RegularizationRequest,
  LeaveTypePolicy,
  Holiday,
  LeaveRequest,
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
    'Leaves',
    'Payroll',
    'MasterData',
    'Workflows',
  ],
  endpoints: (builder) => ({
    // Dashboard Stats (Release 1)
    getStats: builder.query<HRMSDashboardStats, void>({
      async queryFn() {
        return runQuery(() => apiRequest('/app/stats'), () => storageService.getStats())
      },
      providesTags: ['Stats', 'Employees', 'Leaves', 'Attendance', 'Onboarding', 'Payroll'],
    }),

    // ==========================================
    // 1. HR ADMINISTRATION (Release 1)
    // ==========================================
    getCompany: builder.query<CompanyInfo, void>({
      async queryFn() {
        return runQuery(() => apiRequest('/app/company'), () => storageService.getCompany())
      },
      providesTags: ['Company'],
    }),
    updateCompany: builder.mutation<CompanyInfo, Partial<CompanyInfo>>({
      async queryFn(payload) {
        return runQuery(() => apiRequest('/app/company', { method: 'PATCH', body: payload }), () => storageService.updateCompany(payload))
      },
      invalidatesTags: ['Company'],
    }),
    getBranches: builder.query<Branch[], void>({
      async queryFn() {
        return runQuery(() => apiRequest('/app/branches'), () => storageService.getBranches())
      },
      providesTags: ['Branches'],
    }),
    addBranch: builder.mutation<Branch, Omit<Branch, 'id'>>({
      async queryFn(payload) {
        return runQuery(() => apiRequest('/app/branches', { method: 'POST', body: payload }), () => storageService.addBranch(payload))
      },
      invalidatesTags: ['Branches'],
    }),
    getDepartments: builder.query<Department[], void>({
      async queryFn() {
        return runQuery(() => apiRequest('/app/departments'), () => storageService.getDepartments())
      },
      providesTags: ['Departments'],
    }),
    addDepartment: builder.mutation<Department, { name: string; code: string; head: string; budget: number }>({
      async queryFn(payload) {
        return runQuery(() => apiRequest('/app/departments', { method: 'POST', body: payload }), () => storageService.addDepartment(payload))
      },
      invalidatesTags: ['Departments'],
    }),
    getDesignations: builder.query<Designation[], void>({
      async queryFn() {
        return runQuery(() => apiRequest('/app/designations'), () => storageService.getDesignations())
      },
      providesTags: ['Designations'],
    }),
    addDesignation: builder.mutation<Designation, Omit<Designation, 'id'>>({
      async queryFn(payload) {
        return runQuery(() => apiRequest('/app/designations', { method: 'POST', body: payload }), () => storageService.addDesignation(payload))
      },
      invalidatesTags: ['Designations'],
    }),
    getGrades: builder.query<Grade[], void>({
      async queryFn() {
        return runQuery(() => apiRequest('/app/grades'), () => storageService.getGrades())
      },
    }),
    getRoles: builder.query<RolePermission[], void>({
      async queryFn() {
        return runQuery(() => apiRequest('/app/roles'), () => storageService.getRoles())
      },
      providesTags: ['Roles'],
    }),
    updateRole: builder.mutation<RolePermission, { id: string; updates: Partial<RolePermission> }>({
      async queryFn({ id, updates }) {
        return runQuery(() => apiRequest(`/app/roles/${id}`, { method: 'PATCH', body: { updates } }), () => storageService.updateRole(id, updates))
      },
      invalidatesTags: ['Roles'],
    }),
    addRole: builder.mutation<RolePermission, Omit<RolePermission, 'id'>>({
      async queryFn(payload) {
        return runQuery(() => apiRequest('/app/roles', { method: 'POST', body: payload }), () => storageService.addRole(payload))
      },
      invalidatesTags: ['Roles'],
    }),
    updateRolePermission: builder.mutation<RolePermission, { roleId: string; moduleName: string; field: 'read' | 'write' | 'delete' | 'approve'; value: boolean }>({
      async queryFn({ roleId, moduleName, field, value }) {
        return runQuery(() => apiRequest(`/app/roles/${roleId}/permission`, { method: 'PATCH', body: { moduleName, field, value } }), () => storageService.updateRolePermission(roleId, moduleName, field, value))
      },
      invalidatesTags: ['Roles'],
    }),
    getWorkflows: builder.query<ApprovalWorkflow[], void>({
      async queryFn() {
        return runQuery(() => apiRequest('/app/workflows'), () => storageService.getWorkflows())
      },
      providesTags: ['Workflows'],
    }),
    addWorkflow: builder.mutation<ApprovalWorkflow, Omit<ApprovalWorkflow, 'id'>>({
      async queryFn(payload) {
        return runQuery(() => apiRequest('/app/workflows', { method: 'POST', body: payload }), () => storageService.addWorkflow(payload))
      },
      invalidatesTags: ['Workflows'],
    }),
    addWorkflowLevel: builder.mutation<ApprovalWorkflow, { workflowId: string; level: { approverRole: string; description: string } }>({
      async queryFn({ workflowId, level }) {
        return runQuery(() => apiRequest(`/app/workflows/${workflowId}/levels`, { method: 'POST', body: { level } }), () => storageService.addWorkflowLevel(workflowId, level))
      },
      invalidatesTags: ['Workflows'],
    }),
    updateWorkflowLevel: builder.mutation<ApprovalWorkflow, { workflowId: string; levelNumber: number; updates: { approverRole?: string; description?: string } }>({
      async queryFn({ workflowId, levelNumber, updates }) {
        return runQuery(() => apiRequest(`/app/workflows/${workflowId}/levels/${levelNumber}`, { method: 'PATCH', body: { updates } }), () => storageService.updateWorkflowLevel(workflowId, levelNumber, updates))
      },
      invalidatesTags: ['Workflows'],
    }),
    deleteWorkflowLevel: builder.mutation<ApprovalWorkflow, { workflowId: string; levelNumber: number }>({
      async queryFn({ workflowId, levelNumber }) {
        return runQuery(() => apiRequest(`/app/workflows/${workflowId}/levels/${levelNumber}`, { method: 'DELETE' }), () => storageService.deleteWorkflowLevel(workflowId, levelNumber))
      },
      invalidatesTags: ['Workflows'],
    }),

    // ==========================================
    // 2. EMPLOYEE MANAGEMENT (Release 1)
    // ==========================================
    getEmployees: builder.query<Employee[], { search?: string; department?: string; status?: string } | void>({
      async queryFn(args) {
        if (!isMockApi()) {
          return runQuery(
            () => apiRequest<Employee[]>('/app/employees', { query: args ? { search: args.search, department: args.department, status: args.status } : {} }),
            () => [],
          )
        }
        let list = storageService.getEmployees()
        if (args) {
          if (args.search) {
            const q = args.search.toLowerCase()
            list = list.filter(
              (e) =>
                e.firstName.toLowerCase().includes(q) ||
                e.lastName.toLowerCase().includes(q) ||
                e.email.toLowerCase().includes(q) ||
                e.employeeCode.toLowerCase().includes(q),
            )
          }
          if (args.department && args.department !== 'All') {
            list = list.filter((e) => e.department === args.department)
          }
          if (args.status && args.status !== 'All') {
            list = list.filter((e) => e.status === args.status)
          }
        }
        return { data: list }
      },
      providesTags: ['Employees'],
    }),
    getEmployeeById: builder.query<Employee, string>({
      async queryFn(id) {
        if (!isMockApi()) return runQuery(() => apiRequest<Employee>(`/app/employees/${id}`), () => undefined as never)
        const emp = storageService.getEmployeeById(id)
        if (!emp) return { error: { status: 404, data: 'Not found' } }
        return { data: emp }
      },
      providesTags: ['Employees'],
    }),
    addEmployee: builder.mutation<Employee, Omit<Employee, 'id'>>({
      async queryFn(payload) {
        return runQuery(() => apiRequest('/app/employees', { method: 'POST', body: payload }), () => storageService.addEmployee(payload))
      },
      invalidatesTags: ['Employees', 'Stats'],
    }),
    updateEmployee: builder.mutation<Employee, { id: string; updates: Partial<Employee> }>({
      async queryFn({ id, updates }) {
        return runQuery(() => apiRequest(`/app/employees/${id}`, { method: 'PATCH', body: { updates } }), () => storageService.updateEmployee(id, updates))
      },
      invalidatesTags: ['Employees', 'Stats'],
    }),
    deleteEmployee: builder.mutation<boolean, string>({
      async queryFn(id) {
        return runQuery(() => apiRequest(`/app/employees/${id}`, { method: 'DELETE' }), () => storageService.deleteEmployee(id))
      },
      invalidatesTags: ['Employees', 'Stats'],
    }),
    recordTransferPromotion: builder.mutation<Employee, { employeeId: string; payload: { type: 'Promotion' | 'Transfer'; newRole?: string; newDepartment?: string; newSalary?: number } }>({
      async queryFn({ employeeId, payload }) {
        return runQuery(() => apiRequest(`/app/employees/${employeeId}/movements`, { method: 'POST', body: { payload } }), () => storageService.recordTransferPromotion(employeeId, payload))
      },
      invalidatesTags: ['Employees', 'Stats'],
    }),
    addEmployeeDocument: builder.mutation<EmployeeDocument, { employeeId: string; doc: { title: string; category: EmployeeDocument['category']; fileSize: string } }>({
      async queryFn({ employeeId, doc }) {
        return runQuery(() => apiRequest(`/app/employees/${employeeId}/documents`, { method: 'POST', body: { doc } }), () => storageService.addEmployeeDocument(employeeId, doc))
      },
      invalidatesTags: ['Employees'],
    }),
    verifyEmployeeDocument: builder.mutation<EmployeeDocument, { employeeId: string; documentId: string; status: 'Verified' | 'Rejected' }>({
      async queryFn({ employeeId, documentId, status }) {
        return runQuery(() => apiRequest(`/app/employees/${employeeId}/documents/${documentId}`, { method: 'PATCH', body: { status } }), () => storageService.verifyEmployeeDocument(employeeId, documentId, status))
      },
      invalidatesTags: ['Employees'],
    }),

    // ==========================================
    // 3. ONBOARDING (Release 1)
    // ==========================================
    getOnboardingCandidates: builder.query<OnboardingCandidate[], void>({
      async queryFn() {
        return runQuery(() => apiRequest('/app/onboarding_candidates'), () => storageService.getOnboardingCandidates())
      },
      providesTags: ['Onboarding'],
    }),
    toggleOnboardingTask: builder.mutation<OnboardingCandidate, { candidateId: string; taskId: string }>({
      async queryFn({ candidateId, taskId }) {
        return runQuery(() => apiRequest(`/app/onboarding_candidates/${candidateId}/toggle_task`, { method: 'POST', body: { taskId } }), () => storageService.toggleOnboardingTask(candidateId, taskId))
      },
      invalidatesTags: ['Onboarding', 'Stats'],
    }),
    addOnboardingCandidate: builder.mutation<OnboardingCandidate, { candidateName: string; email: string; jobTitle: string; department: string; joiningDate: string; assignedBuddy: string; shiftTiming?: string; assignedRole?: string; reportingManager?: string }>({
      async queryFn(payload) {
        return runQuery(() => apiRequest('/app/onboarding_candidates', { method: 'POST', body: payload }), () => storageService.addOnboardingCandidate(payload))
      },
      invalidatesTags: ['Onboarding', 'Stats'],
    }),
    convertOnboardingCandidate: builder.mutation<Employee, { candidateId: string; role?: string; grade?: string; approvalWorkflow?: string; salary?: number; shift?: string; reportingManagerName?: string; documents?: EmployeeDocument[] }>({
      async queryFn(payload) {
        return runQuery(() => apiRequest(`/app/onboarding_candidates/${payload.candidateId}/convert`, { method: 'POST', body: payload }), () => storageService.convertOnboardingCandidateToEmployee(payload))
      },
      invalidatesTags: ['Onboarding', 'Employees', 'Stats'],
    }),
    addOnboardingDocument: builder.mutation<OnboardingCandidate, { candidateId: string; doc: Omit<EmployeeDocument, 'id' | 'uploadDate'> }>({
      async queryFn({ candidateId, doc }) {
        return runQuery(() => apiRequest(`/app/onboarding_candidates/${candidateId}/documents`, { method: 'POST', body: { doc } }), () => storageService.addOnboardingDocument(candidateId, doc))
      },
      invalidatesTags: ['Onboarding'],
    }),

    // ==========================================
    // 4. ATTENDANCE & SHIFTS (Release 1)
    // ==========================================
    getShifts: builder.query<Shift[], void>({
      async queryFn() {
        return runQuery(() => apiRequest('/app/shifts'), () => storageService.getShifts())
      },
      providesTags: ['Shifts'],
    }),
    addShift: builder.mutation<Shift, Omit<Shift, 'id'>>({
      async queryFn(payload) {
        return runQuery(() => apiRequest('/app/shifts', { method: 'POST', body: payload }), () => storageService.addShift(payload))
      },
      invalidatesTags: ['Shifts'],
    }),
    updateShift: builder.mutation<Shift, { id: string; updates: Partial<Shift> }>({
      async queryFn({ id, updates }) {
        return runQuery(() => apiRequest(`/app/shifts/${id}`, { method: 'PATCH', body: { updates } }), () => storageService.updateShift(id, updates))
      },
      invalidatesTags: ['Shifts'],
    }),
    deleteShift: builder.mutation<boolean, string>({
      async queryFn(id) {
        return runQuery(() => apiRequest(`/app/shifts/${id}`, { method: 'DELETE' }), () => storageService.deleteShift(id))
      },
      invalidatesTags: ['Shifts'],
    }),
    getAttendance: builder.query<AttendanceRecord[], void>({
      async queryFn() {
        return runQuery(() => apiRequest('/app/attendance'), () => storageService.getAttendance())
      },
      providesTags: ['Attendance'],
    }),
    recordAttendance: builder.mutation<AttendanceRecord, { employeeId: string; employeeName: string }>({
      async queryFn({ employeeId, employeeName }) {
        return runQuery(() => apiRequest('/app/attendance/punch', { method: 'POST', body: { employeeId } }), () => storageService.recordAttendance(employeeId, employeeName))
      },
      invalidatesTags: ['Attendance', 'Stats'],
    }),
    getRegularizations: builder.query<RegularizationRequest[], void>({
      async queryFn() {
        return runQuery(() => apiRequest('/app/regularizations'), () => storageService.getRegularizations())
      },
      providesTags: ['Regularizations'],
    }),
    submitRegularization: builder.mutation<RegularizationRequest, Omit<RegularizationRequest, 'id' | 'status'>>({
      async queryFn(payload) {
        return runQuery(() => apiRequest('/app/regularizations', { method: 'POST', body: payload }), () => storageService.submitRegularization(payload))
      },
      invalidatesTags: ['Regularizations'],
    }),
    updateRegularizationStatus: builder.mutation<RegularizationRequest, { id: string; status: 'Approved' | 'Rejected' }>({
      async queryFn({ id, status }) {
        return runQuery(() => apiRequest(`/app/regularizations/${id}`, { method: 'PATCH', body: { status } }), () => storageService.updateRegularizationStatus(id, status))
      },
      invalidatesTags: ['Regularizations', 'Attendance', 'Stats'],
    }),

    // ==========================================
    // 5. LEAVE & HOLIDAYS (Release 1)
    // ==========================================
    getLeavePolicies: builder.query<LeaveTypePolicy[], void>({
      async queryFn() {
        return runQuery(() => apiRequest('/app/leave_policies'), () => storageService.getLeavePolicies())
      },
      providesTags: ['Leaves'],
    }),
    addLeavePolicy: builder.mutation<LeaveTypePolicy, Omit<LeaveTypePolicy, 'id'>>({
      async queryFn(payload) {
        return runQuery(() => apiRequest('/app/leave_policies', { method: 'POST', body: payload }), () => storageService.addLeavePolicy(payload))
      },
      invalidatesTags: ['Leaves'],
    }),
    updateLeavePolicy: builder.mutation<LeaveTypePolicy, { id: string; updates: Partial<LeaveTypePolicy> }>({
      async queryFn({ id, updates }) {
        return runQuery(() => apiRequest(`/app/leave_policies/${id}`, { method: 'PATCH', body: { updates } }), () => storageService.updateLeavePolicy(id, updates))
      },
      invalidatesTags: ['Leaves'],
    }),
    deleteLeavePolicy: builder.mutation<boolean, string>({
      async queryFn(id) {
        return runQuery(() => apiRequest(`/app/leave_policies/${id}`, { method: 'DELETE' }), () => storageService.deleteLeavePolicy(id))
      },
      invalidatesTags: ['Leaves'],
    }),
    getHolidays: builder.query<Holiday[], void>({
      async queryFn() {
        return runQuery(() => apiRequest('/app/holidays'), () => storageService.getHolidays())
      },
      providesTags: ['Leaves'],
    }),
    addHoliday: builder.mutation<Holiday, Omit<Holiday, 'id'>>({
      async queryFn(payload) {
        return runQuery(() => apiRequest('/app/holidays', { method: 'POST', body: payload }), () => storageService.addHoliday(payload))
      },
      invalidatesTags: ['Leaves'],
    }),
    updateHoliday: builder.mutation<Holiday, { id: string; updates: Partial<Holiday> }>({
      async queryFn({ id, updates }) {
        return runQuery(() => apiRequest(`/app/holidays/${id}`, { method: 'PATCH', body: { updates } }), () => storageService.updateHoliday(id, updates))
      },
      invalidatesTags: ['Leaves'],
    }),
    deleteHoliday: builder.mutation<boolean, string>({
      async queryFn(id) {
        return runQuery(() => apiRequest(`/app/holidays/${id}`, { method: 'DELETE' }), () => storageService.deleteHoliday(id))
      },
      invalidatesTags: ['Leaves'],
    }),
    getLeaveRequests: builder.query<LeaveRequest[], void>({
      async queryFn() {
        return runQuery(() => apiRequest('/app/leave_requests'), () => storageService.getLeaveRequests())
      },
      providesTags: ['Leaves'],
    }),
    applyLeave: builder.mutation<LeaveRequest, Omit<LeaveRequest, 'id' | 'appliedOn' | 'status'>>({
      async queryFn(payload) {
        return runQuery(() => apiRequest('/app/leave_requests', { method: 'POST', body: payload }), () => storageService.addLeaveRequest(payload))
      },
      invalidatesTags: ['Leaves', 'Stats'],
    }),
    updateLeaveStatus: builder.mutation<LeaveRequest, { id: string; status: 'Approved' | 'Rejected' }>({
      async queryFn({ id, status }) {
        return runQuery(() => apiRequest(`/app/leave_requests/${id}`, { method: 'PATCH', body: { status } }), () => storageService.updateLeaveStatus(id, status))
      },
      invalidatesTags: ['Leaves', 'Employees', 'Stats'],
    }),

    // ==========================================
    // 6. PAYROLL (Release 1)
    // ==========================================
    getPayslips: builder.query<Payslip[], void>({
      async queryFn() {
        return runQuery(() => apiRequest('/app/payslips'), () => storageService.getPayslips())
      },
      providesTags: ['Payroll'],
    }),
    processPayrollRun: builder.mutation<Payslip[], string>({
      async queryFn(monthYear) {
        return runQuery(() => apiRequest('/app/payroll/process', { method: 'POST', body: { monthYear } }), () => storageService.processPayrollRun(monthYear))
      },
      invalidatesTags: ['Payroll', 'Stats'],
    }),
    togglePayslipAccess: builder.mutation<Payslip, string>({
      async queryFn(payslipId) {
        return runQuery(() => apiRequest(`/app/payslips/${payslipId}/toggle_access`, { method: 'PATCH' }), () => storageService.togglePayslipAccess(payslipId))
      },
      invalidatesTags: ['Payroll'],
    }),
    addSalaryBreakdown: builder.mutation<Payslip, { employeeId: string; basic: number; hra: number; specialAllowance: number; performanceBonus?: number }>({
      async queryFn(payload) {
        return runQuery(() => apiRequest('/app/payroll/salary_breakdown', { method: 'POST', body: payload }), () => storageService.addSalaryBreakdown(payload))
      },
      invalidatesTags: ['Payroll', 'Stats'],
    }),

    // ==========================================
    // MASTER DATA MANAGEMENT (MDM - Release 1)
    // ==========================================
    getMasterData: builder.query<MasterDataItem[], { category?: MasterDataCategory } | void>({
      async queryFn(args) {
        if (!isMockApi()) {
          return runQuery(() => apiRequest<MasterDataItem[]>('/app/master_data', { query: { category: args?.category } }), () => [])
        }
        if (args && args.category) {
          return { data: mdmService.getByCategory(args.category) }
        }
        return { data: mdmService.getAll() }
      },
      providesTags: ['MasterData'],
    }),
    addMasterDataItem: builder.mutation<MasterDataItem, Omit<MasterDataItem, 'id' | 'createdAt' | 'updatedAt'>>({
      async queryFn(payload) {
        return runQuery(() => apiRequest('/app/master_data', { method: 'POST', body: payload }), () => mdmService.addItem(payload))
      },
      invalidatesTags: ['MasterData'],
    }),
    toggleMasterDataItem: builder.mutation<MasterDataItem, string>({
      async queryFn(id) {
        return runQuery(() => apiRequest(`/app/master_data/${id}/toggle`, { method: 'PATCH' }), () => mdmService.toggleItemStatus(id))
      },
      invalidatesTags: ['MasterData'],
    }),
    deleteMasterDataItem: builder.mutation<boolean, string>({
      async queryFn(id) {
        return runQuery(() => apiRequest(`/app/master_data/${id}`, { method: 'DELETE' }), () => mdmService.deleteItem(id))
      },
      invalidatesTags: ['MasterData'],
    }),
  }),
})

export default hrmsApi
