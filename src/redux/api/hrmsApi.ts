import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query'
import { storageService } from '@/services/storageService'
import { mdmService } from '@/services/mdmService'
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

const delay = (ms = 0) => (ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve())

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
        await delay()
        return { data: storageService.getStats() }
      },
      providesTags: ['Stats', 'Employees', 'Leaves', 'Attendance', 'Onboarding', 'Payroll'],
    }),

    // ==========================================
    // 1. HR ADMINISTRATION (Release 1)
    // ==========================================
    getCompany: builder.query<CompanyInfo, void>({
      async queryFn() {
        await delay()
        return { data: storageService.getCompany() }
      },
      providesTags: ['Company'],
    }),
    updateCompany: builder.mutation<CompanyInfo, Partial<CompanyInfo>>({
      async queryFn(payload) {
        await delay()
        return { data: storageService.updateCompany(payload) }
      },
      invalidatesTags: ['Company'],
    }),
    getBranches: builder.query<Branch[], void>({
      async queryFn() {
        await delay()
        return { data: storageService.getBranches() }
      },
      providesTags: ['Branches'],
    }),
    addBranch: builder.mutation<Branch, Omit<Branch, 'id'>>({
      async queryFn(payload) {
        await delay()
        return { data: storageService.addBranch(payload) }
      },
      invalidatesTags: ['Branches'],
    }),
    getDepartments: builder.query<Department[], void>({
      async queryFn() {
        await delay()
        return { data: storageService.getDepartments() }
      },
      providesTags: ['Departments'],
    }),
    addDepartment: builder.mutation<Department, { name: string; code: string; head: string; budget: number }>({
      async queryFn(payload) {
        await delay()
        return { data: storageService.addDepartment(payload) }
      },
      invalidatesTags: ['Departments'],
    }),
    getDesignations: builder.query<Designation[], void>({
      async queryFn() {
        await delay()
        return { data: storageService.getDesignations() }
      },
      providesTags: ['Designations'],
    }),
    addDesignation: builder.mutation<Designation, Omit<Designation, 'id'>>({
      async queryFn(payload) {
        await delay()
        return { data: storageService.addDesignation(payload) }
      },
      invalidatesTags: ['Designations'],
    }),
    getGrades: builder.query<Grade[], void>({
      async queryFn() {
        await delay()
        return { data: storageService.getGrades() }
      },
    }),
    getRoles: builder.query<RolePermission[], void>({
      async queryFn() {
        await delay()
        return { data: storageService.getRoles() }
      },
      providesTags: ['Roles'],
    }),
    updateRole: builder.mutation<RolePermission, { id: string; updates: Partial<RolePermission> }>({
      async queryFn({ id, updates }) {
        await delay()
        return { data: storageService.updateRole(id, updates) }
      },
      invalidatesTags: ['Roles'],
    }),
    addRole: builder.mutation<RolePermission, Omit<RolePermission, 'id'>>({
      async queryFn(payload) {
        await delay()
        return { data: storageService.addRole(payload) }
      },
      invalidatesTags: ['Roles'],
    }),
    updateRolePermission: builder.mutation<RolePermission, { roleId: string; moduleName: string; field: 'read' | 'write' | 'delete' | 'approve'; value: boolean }>({
      async queryFn({ roleId, moduleName, field, value }) {
        await delay()
        return { data: storageService.updateRolePermission(roleId, moduleName, field, value) }
      },
      invalidatesTags: ['Roles'],
    }),
    getWorkflows: builder.query<ApprovalWorkflow[], void>({
      async queryFn() {
        await delay()
        return { data: storageService.getWorkflows() }
      },
      providesTags: ['Workflows'],
    }),
    addWorkflow: builder.mutation<ApprovalWorkflow, Omit<ApprovalWorkflow, 'id'>>({
      async queryFn(payload) {
        await delay()
        return { data: storageService.addWorkflow(payload) }
      },
      invalidatesTags: ['Workflows'],
    }),
    addWorkflowLevel: builder.mutation<ApprovalWorkflow, { workflowId: string; level: { approverRole: string; description: string } }>({
      async queryFn({ workflowId, level }) {
        await delay()
        return { data: storageService.addWorkflowLevel(workflowId, level) }
      },
      invalidatesTags: ['Workflows'],
    }),
    updateWorkflowLevel: builder.mutation<ApprovalWorkflow, { workflowId: string; levelNumber: number; updates: { approverRole?: string; description?: string } }>({
      async queryFn({ workflowId, levelNumber, updates }) {
        await delay()
        return { data: storageService.updateWorkflowLevel(workflowId, levelNumber, updates) }
      },
      invalidatesTags: ['Workflows'],
    }),
    deleteWorkflowLevel: builder.mutation<ApprovalWorkflow, { workflowId: string; levelNumber: number }>({
      async queryFn({ workflowId, levelNumber }) {
        await delay()
        return { data: storageService.deleteWorkflowLevel(workflowId, levelNumber) }
      },
      invalidatesTags: ['Workflows'],
    }),

    // ==========================================
    // 2. EMPLOYEE MANAGEMENT (Release 1)
    // ==========================================
    getEmployees: builder.query<Employee[], { search?: string; department?: string; status?: string } | void>({
      async queryFn(args) {
        await delay()
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
        await delay()
        const emp = storageService.getEmployeeById(id)
        if (!emp) return { error: { status: 404, data: 'Not found' } }
        return { data: emp }
      },
      providesTags: ['Employees'],
    }),
    addEmployee: builder.mutation<Employee, Omit<Employee, 'id'>>({
      async queryFn(payload) {
        await delay()
        return { data: storageService.addEmployee(payload) }
      },
      invalidatesTags: ['Employees', 'Stats'],
    }),
    updateEmployee: builder.mutation<Employee, { id: string; updates: Partial<Employee> }>({
      async queryFn({ id, updates }) {
        await delay()
        return { data: storageService.updateEmployee(id, updates) }
      },
      invalidatesTags: ['Employees', 'Stats'],
    }),
    deleteEmployee: builder.mutation<boolean, string>({
      async queryFn(id) {
        await delay()
        return { data: storageService.deleteEmployee(id) }
      },
      invalidatesTags: ['Employees', 'Stats'],
    }),
    recordTransferPromotion: builder.mutation<Employee, { employeeId: string; payload: { type: 'Promotion' | 'Transfer'; newRole?: string; newDepartment?: string; newSalary?: number } }>({
      async queryFn({ employeeId, payload }) {
        await delay()
        return { data: storageService.recordTransferPromotion(employeeId, payload) }
      },
      invalidatesTags: ['Employees', 'Stats'],
    }),
    addEmployeeDocument: builder.mutation<EmployeeDocument, { employeeId: string; doc: { title: string; category: EmployeeDocument['category']; fileSize: string } }>({
      async queryFn({ employeeId, doc }) {
        await delay()
        return { data: storageService.addEmployeeDocument(employeeId, doc) }
      },
      invalidatesTags: ['Employees'],
    }),
    verifyEmployeeDocument: builder.mutation<EmployeeDocument, { employeeId: string; documentId: string; status: 'Verified' | 'Rejected' }>({
      async queryFn({ employeeId, documentId, status }) {
        await delay()
        return { data: storageService.verifyEmployeeDocument(employeeId, documentId, status) }
      },
      invalidatesTags: ['Employees'],
    }),

    // ==========================================
    // 3. ONBOARDING (Release 1)
    // ==========================================
    getOnboardingCandidates: builder.query<OnboardingCandidate[], void>({
      async queryFn() {
        await delay()
        return { data: storageService.getOnboardingCandidates() }
      },
      providesTags: ['Onboarding'],
    }),
    toggleOnboardingTask: builder.mutation<OnboardingCandidate, { candidateId: string; taskId: string }>({
      async queryFn({ candidateId, taskId }) {
        await delay()
        return { data: storageService.toggleOnboardingTask(candidateId, taskId) }
      },
      invalidatesTags: ['Onboarding', 'Stats'],
    }),
    addOnboardingCandidate: builder.mutation<OnboardingCandidate, { candidateName: string; email: string; jobTitle: string; department: string; joiningDate: string; assignedBuddy: string; shiftTiming?: string; assignedRole?: string; reportingManager?: string }>({
      async queryFn(payload) {
        await delay()
        return { data: storageService.addOnboardingCandidate(payload) }
      },
      invalidatesTags: ['Onboarding', 'Stats'],
    }),
    convertOnboardingCandidate: builder.mutation<Employee, { candidateId: string; role?: string; grade?: string; approvalWorkflow?: string; salary?: number; shift?: string; reportingManagerName?: string; documents?: EmployeeDocument[] }>({
      async queryFn(payload) {
        await delay()
        return { data: storageService.convertOnboardingCandidateToEmployee(payload) }
      },
      invalidatesTags: ['Onboarding', 'Employees', 'Stats'],
    }),
    addOnboardingDocument: builder.mutation<OnboardingCandidate, { candidateId: string; doc: Omit<EmployeeDocument, 'id' | 'uploadDate'> }>({
      async queryFn({ candidateId, doc }) {
        await delay()
        return { data: storageService.addOnboardingDocument(candidateId, doc) }
      },
      invalidatesTags: ['Onboarding'],
    }),

    // ==========================================
    // 4. ATTENDANCE & SHIFTS (Release 1)
    // ==========================================
    getShifts: builder.query<Shift[], void>({
      async queryFn() {
        await delay()
        return { data: storageService.getShifts() }
      },
      providesTags: ['Shifts'],
    }),
    addShift: builder.mutation<Shift, Omit<Shift, 'id'>>({
      async queryFn(payload) {
        await delay()
        return { data: storageService.addShift(payload) }
      },
      invalidatesTags: ['Shifts'],
    }),
    updateShift: builder.mutation<Shift, { id: string; updates: Partial<Shift> }>({
      async queryFn({ id, updates }) {
        await delay()
        return { data: storageService.updateShift(id, updates) }
      },
      invalidatesTags: ['Shifts'],
    }),
    deleteShift: builder.mutation<boolean, string>({
      async queryFn(id) {
        await delay()
        return { data: storageService.deleteShift(id) }
      },
      invalidatesTags: ['Shifts'],
    }),
    getAttendance: builder.query<AttendanceRecord[], void>({
      async queryFn() {
        await delay()
        return { data: storageService.getAttendance() }
      },
      providesTags: ['Attendance'],
    }),
    recordAttendance: builder.mutation<AttendanceRecord, { employeeId: string; employeeName: string }>({
      async queryFn({ employeeId, employeeName }) {
        await delay()
        return { data: storageService.recordAttendance(employeeId, employeeName) }
      },
      invalidatesTags: ['Attendance', 'Stats'],
    }),
    getRegularizations: builder.query<RegularizationRequest[], void>({
      async queryFn() {
        await delay()
        return { data: storageService.getRegularizations() }
      },
      providesTags: ['Regularizations'],
    }),
    submitRegularization: builder.mutation<RegularizationRequest, Omit<RegularizationRequest, 'id' | 'status'>>({
      async queryFn(payload) {
        await delay()
        return { data: storageService.submitRegularization(payload) }
      },
      invalidatesTags: ['Regularizations'],
    }),
    updateRegularizationStatus: builder.mutation<RegularizationRequest, { id: string; status: 'Approved' | 'Rejected' }>({
      async queryFn({ id, status }) {
        await delay()
        return { data: storageService.updateRegularizationStatus(id, status) }
      },
      invalidatesTags: ['Regularizations', 'Attendance', 'Stats'],
    }),

    // ==========================================
    // 5. LEAVE & HOLIDAYS (Release 1)
    // ==========================================
    getLeavePolicies: builder.query<LeaveTypePolicy[], void>({
      async queryFn() {
        await delay()
        return { data: storageService.getLeavePolicies() }
      },
      providesTags: ['Leaves'],
    }),
    addLeavePolicy: builder.mutation<LeaveTypePolicy, Omit<LeaveTypePolicy, 'id'>>({
      async queryFn(payload) {
        await delay()
        return { data: storageService.addLeavePolicy(payload) }
      },
      invalidatesTags: ['Leaves'],
    }),
    updateLeavePolicy: builder.mutation<LeaveTypePolicy, { id: string; updates: Partial<LeaveTypePolicy> }>({
      async queryFn({ id, updates }) {
        await delay()
        return { data: storageService.updateLeavePolicy(id, updates) }
      },
      invalidatesTags: ['Leaves'],
    }),
    deleteLeavePolicy: builder.mutation<boolean, string>({
      async queryFn(id) {
        await delay()
        return { data: storageService.deleteLeavePolicy(id) }
      },
      invalidatesTags: ['Leaves'],
    }),
    getHolidays: builder.query<Holiday[], void>({
      async queryFn() {
        await delay()
        return { data: storageService.getHolidays() }
      },
      providesTags: ['Leaves'],
    }),
    addHoliday: builder.mutation<Holiday, Omit<Holiday, 'id'>>({
      async queryFn(payload) {
        await delay()
        return { data: storageService.addHoliday(payload) }
      },
      invalidatesTags: ['Leaves'],
    }),
    updateHoliday: builder.mutation<Holiday, { id: string; updates: Partial<Holiday> }>({
      async queryFn({ id, updates }) {
        await delay()
        return { data: storageService.updateHoliday(id, updates) }
      },
      invalidatesTags: ['Leaves'],
    }),
    deleteHoliday: builder.mutation<boolean, string>({
      async queryFn(id) {
        await delay()
        return { data: storageService.deleteHoliday(id) }
      },
      invalidatesTags: ['Leaves'],
    }),
    getLeaveRequests: builder.query<LeaveRequest[], void>({
      async queryFn() {
        await delay()
        return { data: storageService.getLeaveRequests() }
      },
      providesTags: ['Leaves'],
    }),
    applyLeave: builder.mutation<LeaveRequest, Omit<LeaveRequest, 'id' | 'appliedOn' | 'status'>>({
      async queryFn(payload) {
        await delay()
        return { data: storageService.addLeaveRequest(payload) }
      },
      invalidatesTags: ['Leaves', 'Stats'],
    }),
    updateLeaveStatus: builder.mutation<LeaveRequest, { id: string; status: 'Approved' | 'Rejected' }>({
      async queryFn({ id, status }) {
        await delay()
        return { data: storageService.updateLeaveStatus(id, status) }
      },
      invalidatesTags: ['Leaves', 'Employees', 'Stats'],
    }),

    // ==========================================
    // 6. PAYROLL (Release 1)
    // ==========================================
    getPayslips: builder.query<Payslip[], void>({
      async queryFn() {
        await delay()
        return { data: storageService.getPayslips() }
      },
      providesTags: ['Payroll'],
    }),
    processPayrollRun: builder.mutation<Payslip[], string>({
      async queryFn(monthYear) {
        await delay()
        return { data: storageService.processPayrollRun(monthYear) }
      },
      invalidatesTags: ['Payroll', 'Stats'],
    }),
    togglePayslipAccess: builder.mutation<Payslip, string>({
      async queryFn(payslipId) {
        await delay()
        return { data: storageService.togglePayslipAccess(payslipId) }
      },
      invalidatesTags: ['Payroll'],
    }),
    addSalaryBreakdown: builder.mutation<Payslip, { employeeId: string; basic: number; hra: number; specialAllowance: number; performanceBonus?: number }>({
      async queryFn(payload) {
        await delay()
        return { data: storageService.addSalaryBreakdown(payload) }
      },
      invalidatesTags: ['Payroll', 'Stats'],
    }),

    // ==========================================
    // MASTER DATA MANAGEMENT (MDM - Release 1)
    // ==========================================
    getMasterData: builder.query<MasterDataItem[], { category?: MasterDataCategory } | void>({
      async queryFn(args) {
        await delay()
        if (args && args.category) {
          return { data: mdmService.getByCategory(args.category) }
        }
        return { data: mdmService.getAll() }
      },
      providesTags: ['MasterData'],
    }),
    addMasterDataItem: builder.mutation<MasterDataItem, Omit<MasterDataItem, 'id' | 'createdAt' | 'updatedAt'>>({
      async queryFn(payload) {
        await delay()
        return { data: mdmService.addItem(payload) }
      },
      invalidatesTags: ['MasterData'],
    }),
    toggleMasterDataItem: builder.mutation<MasterDataItem, string>({
      async queryFn(id) {
        await delay()
        return { data: mdmService.toggleItemStatus(id) }
      },
      invalidatesTags: ['MasterData'],
    }),
    deleteMasterDataItem: builder.mutation<boolean, string>({
      async queryFn(id) {
        await delay()
        return { data: mdmService.deleteItem(id) }
      },
      invalidatesTags: ['MasterData'],
    }),
  }),
})

export default hrmsApi
