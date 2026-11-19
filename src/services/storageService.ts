import {
  initialCompany,
  initialBranches,
  initialDepartments,
  initialGrades,
  initialDesignations,
  initialRoles,
  initialWorkflows,
  initialEmployees,
  initialOnboardingCandidates,
  initialShifts,
  initialAttendance,
  initialRegularizations,
  initialLeavePolicies,
  initialHolidays,
  initialLeaveRequests,
  initialPayslips,
  type CompanyInfo,
  type Branch,
  type Department,
  type Designation,
  type Grade,
  type RolePermission,
  type ApprovalWorkflow,
  type Employee,
  type EmployeeDocument,
  type OnboardingCandidate,
  type Shift,
  type AttendanceRecord,
  type RegularizationRequest,
  type LeaveTypePolicy,
  type Holiday,
  type LeaveRequest,
  type Payslip,
  type HRMSDashboardStats,
} from './mockData'

function getStored<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw || raw === 'null' || raw === 'undefined') {
      localStorage.setItem(key, JSON.stringify(defaultValue))
      return defaultValue
    }
    const parsed = JSON.parse(raw) as T
    // If defaultValue is a non-empty array but stored is empty or invalid, re-seed it safely
    if (Array.isArray(defaultValue) && defaultValue.length > 0) {
      if (!Array.isArray(parsed) || parsed.length === 0) {
        localStorage.setItem(key, JSON.stringify(defaultValue))
        return defaultValue
      }
    }
    return parsed
  } catch {
    return defaultValue
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error('Failed to save to localStorage:', e)
  }
}

export const storageService = {
  // ==========================================
  // 1. HR ADMINISTRATION (Release 1)
  // ==========================================
  getCompany(): CompanyInfo {
    return getStored<CompanyInfo>('agam_company', initialCompany)
  },
  updateCompany(updates: Partial<CompanyInfo>): CompanyInfo {
    const curr = this.getCompany()
    const updated = { ...curr, ...updates }
    setStored('agam_company', updated)
    return updated
  },

  getBranches(): Branch[] {
    return getStored<Branch[]>('agam_branches', initialBranches)
  },
  addBranch(branch: Omit<Branch, 'id'>): Branch {
    const list = this.getBranches()
    const item: Branch = { ...branch, id: `br-${Date.now()}` }
    list.push(item)
    setStored('agam_branches', list)
    return item
  },

  getDepartments(): Department[] {
    return getStored<Department[]>('agam_departments', initialDepartments)
  },
  addDepartment(dept: { name: string; code: string; head: string; budget: number }): Department {
    const list = this.getDepartments()
    const item: Department = {
      ...dept,
      id: `dept-${Date.now()}`,
      totalEmployees: 0,
    }
    list.push(item)
    setStored('agam_departments', list)
    return item
  },

  getDesignations(): Designation[] {
    return getStored<Designation[]>('agam_designations', initialDesignations)
  },
  addDesignation(desig: Omit<Designation, 'id'>): Designation {
    const list = this.getDesignations()
    const item: Designation = {
      ...desig,
      id: `des-${Date.now()}`,
    }
    list.push(item)
    setStored('agam_designations', list)
    return item
  },

  getGrades(): Grade[] {
    return getStored<Grade[]>('agam_grades', initialGrades)
  },

  getRoles(): RolePermission[] {
    const list = getStored<RolePermission[]>('agam_roles', initialRoles)
    // Ensure Department Manager has HR Administration read set to false
    const dm = list.find((r) => r.roleName.toLowerCase().includes('department manager'))
    if (dm) {
      const hrAdminPerm = dm.permissions.find((p) => p.module.toLowerCase() === 'hr administration')
      if (hrAdminPerm && hrAdminPerm.read === true) {
        hrAdminPerm.read = false
        setStored('agam_roles', list)
      }
    }
    // Ensure General Employee has Leave Management & Attendance
    const emp = list.find((r) => r.roleName.toLowerCase().includes('employee'))
    if (emp) {
      let modified = false
      if (!emp.permissions.some((p) => p.module === 'Leave Management')) {
        emp.permissions.push({ module: 'Leave Management', read: true, write: true, delete: false, approve: false })
        modified = true
      }
      if (!emp.permissions.some((p) => p.module === 'Attendance')) {
        emp.permissions.push({ module: 'Attendance', read: true, write: true, delete: false, approve: false })
        modified = true
      }
      if (modified) {
        setStored('agam_roles', list)
      }
    }
    return list
  },

  updateRole(id: string, updated: Partial<RolePermission>): RolePermission {
    const list = this.getRoles()
    const index = list.findIndex((r) => r.id === id)
    const existing = list[index]
    if (index === -1 || !existing) throw new Error('Role not found')
    const updatedRole: RolePermission = {
      ...existing,
      ...updated,
      id: existing.id,
      roleName: updated.roleName ?? existing.roleName,
      description: updated.description ?? existing.description,
      usersCount: updated.usersCount ?? existing.usersCount,
      permissions: updated.permissions ?? existing.permissions,
    }
    list[index] = updatedRole
    setStored('agam_roles', list)
    return updatedRole
  },

  addRole(role: Omit<RolePermission, 'id'>): RolePermission {
    const list = this.getRoles()
    const newRole: RolePermission = {
      ...role,
      id: `role-${Date.now()}`,
      usersCount: role.usersCount || 0,
    }
    list.push(newRole)
    setStored('agam_roles', list)
    return newRole
  },

  updateRolePermission(roleId: string, moduleName: string, field: 'read' | 'write' | 'delete' | 'approve', value: boolean): RolePermission {
    const list = this.getRoles()
    const role = list.find((r) => r.id === roleId)
    if (!role) throw new Error('Role not found')
    const perm = role.permissions.find((p) => p.module === moduleName)
    if (perm) {
      perm[field] = value
    } else {
      role.permissions.push({
        module: moduleName,
        read: field === 'read' ? value : false,
        write: field === 'write' ? value : false,
        delete: field === 'delete' ? value : false,
        approve: field === 'approve' ? value : false,
      })
    }
    setStored('agam_roles', list)
    return role
  },

  getWorkflows(): ApprovalWorkflow[] {
    return getStored<ApprovalWorkflow[]>('agam_workflows', initialWorkflows)
  },
  addWorkflow(wf: Omit<ApprovalWorkflow, 'id'>): ApprovalWorkflow {
    const list = this.getWorkflows()
    const item: ApprovalWorkflow = {
      ...wf,
      id: `wf-${Date.now()}`,
    }
    list.push(item)
    setStored('agam_workflows', list)
    return item
  },
  addWorkflowLevel(workflowId: string, level: { approverRole: string; description: string }): ApprovalWorkflow {
    const list = this.getWorkflows()
    const wf = list.find((w) => w.id === workflowId)
    if (!wf) throw new Error('Workflow not found')
    const nextLevelNumber = (wf.levels.length > 0 ? Math.max(...wf.levels.map((l) => l.level)) : 0) + 1
    wf.levels.push({
      level: nextLevelNumber,
      approverRole: level.approverRole,
      description: level.description,
    })
    setStored('agam_workflows', list)
    return wf
  },
  updateWorkflowLevel(workflowId: string, levelNumber: number, updates: { approverRole?: string; description?: string }): ApprovalWorkflow {
    const list = this.getWorkflows()
    const wf = list.find((w) => w.id === workflowId)
    if (!wf) throw new Error('Workflow not found')
    const lvl = wf.levels.find((l) => l.level === levelNumber)
    if (!lvl) throw new Error('Level not found')
    if (updates.approverRole !== undefined) lvl.approverRole = updates.approverRole
    if (updates.description !== undefined) lvl.description = updates.description
    setStored('agam_workflows', list)
    return wf
  },
  deleteWorkflowLevel(workflowId: string, levelNumber: number): ApprovalWorkflow {
    const list = this.getWorkflows()
    const wf = list.find((w) => w.id === workflowId)
    if (!wf) throw new Error('Workflow not found')
    wf.levels = wf.levels.filter((l) => l.level !== levelNumber)
    wf.levels.forEach((l, idx) => {
      l.level = idx + 1
    })
    setStored('agam_workflows', list)
    return wf
  },

  // ==========================================
  // 2. EMPLOYEE MANAGEMENT (Release 1)
  // ==========================================
  getEmployees(): Employee[] {
    const list = getStored<Employee[]>('agam_employees', initialEmployees)
    if (!Array.isArray(list) || list.length === 0) {
      setStored('agam_employees', initialEmployees)
      return initialEmployees
    }
    const valid = list.filter((e): e is Employee => Boolean(e && typeof e === 'object' && e.id))
    if (valid.length === 0) {
      setStored('agam_employees', initialEmployees)
      return initialEmployees
    }
    return valid.map((e): Employee => ({
      ...e,
      firstName: e.firstName || 'Employee',
      lastName: e.lastName || '',
      email: e.email || `${(e.firstName || 'employee').toLowerCase()}@agam.internal`,
      phone: e.phone || '+1 (555) 000-0000',
      department: e.department || 'Engineering',
      designation: e.designation || 'Specialist',
      grade: e.grade || 'Professional / Lead (P1-P3)',
      branch: e.branch || 'San Francisco HQ',
      employmentType: (e.employmentType as Employee['employmentType']) || 'Full-time',
      status: (e.status as Employee['status']) || 'Active',
      joiningDate: e.joiningDate || (new Date().toISOString().split('T')[0] as string),
      salary: typeof e.salary === 'number' ? e.salary : 85000,
      employeeCode: e.employeeCode || `AGM-${Math.floor(1000 + Math.random() * 9000)}`,
    }))
  },
  getEmployeeById(id: string): Employee | undefined {
    return this.getEmployees().find((e) => e.id === id)
  },
  addEmployee(payload: Omit<Employee, 'id'>): Employee {
    const list = this.getEmployees()
    const newEmployee: Employee = {
      ...payload,
      id: `emp-${Date.now()}`,
    }
    list.unshift(newEmployee)
    setStored('agam_employees', list)
    return newEmployee
  },
  updateEmployee(id: string, updates: Partial<Employee>): Employee {
    const list = this.getEmployees()
    const index = list.findIndex((e) => e.id === id)
    const existing = list[index]
    if (index === -1 || !existing) throw new Error(`Employee ${id} not found`)
    const updated: Employee = { ...existing, ...updates }
    list[index] = updated
    setStored('agam_employees', list)
    return updated
  },
  deleteEmployee(id: string): boolean {
    const list = this.getEmployees()
    const filtered = list.filter((e) => e.id !== id)
    setStored('agam_employees', filtered)
    return true
  },
  recordTransferPromotion(employeeId: string, payload: { type: 'Promotion' | 'Transfer'; newRole?: string; newDepartment?: string; newSalary?: number }): Employee {
    const list = this.getEmployees()
    const index = list.findIndex((e) => e.id === employeeId)
    const emp = list[index]
    if (!emp) throw new Error('Employee not found')

    const historyRecord = {
      id: `hist-${Date.now()}`,
      employeeId,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      type: payload.type,
      effectiveDate: new Date().toISOString().split('T')[0] ?? '',
      previousRole: emp.designation,
      newRole: payload.newRole || emp.designation,
      previousDepartment: emp.department,
      newDepartment: payload.newDepartment || emp.department,
      previousSalary: emp.salary,
      newSalary: payload.newSalary || emp.salary,
      approvedBy: 'HR Administration',
    }

    emp.history = emp.history || []
    emp.history.unshift(historyRecord)
    if (payload.newRole) emp.designation = payload.newRole
    if (payload.newDepartment) emp.department = payload.newDepartment
    if (payload.newSalary) emp.salary = payload.newSalary

    setStored('agam_employees', list)
    return emp
  },
  addEmployeeDocument(employeeId: string, doc: { title: string; category: EmployeeDocument['category']; fileSize: string }): EmployeeDocument {
    const list = this.getEmployees()
    const emp = list.find((e) => e.id === employeeId)
    if (!emp) throw new Error('Employee not found')
    const item: EmployeeDocument = {
      id: `doc-${Date.now()}`,
      title: doc.title,
      category: doc.category,
      fileSize: doc.fileSize,
      uploadDate: new Date().toISOString().split('T')[0] ?? '',
      status: 'Pending',
    }
    emp.documents = emp.documents || []
    emp.documents.push(item)
    setStored('agam_employees', list)
    return item
  },
  verifyEmployeeDocument(employeeId: string, documentId: string, status: 'Verified' | 'Rejected'): EmployeeDocument {
    const list = this.getEmployees()
    const emp = list.find((e) => e.id === employeeId)
    if (!emp) throw new Error('Employee not found')
    emp.documents = emp.documents || []
    const doc = emp.documents.find((d) => d.id === documentId)
    if (!doc) throw new Error('Document not found')
    doc.status = status
    setStored('agam_employees', list)
    return doc
  },

  // ==========================================
  // 3. ONBOARDING (Release 1)
  // ==========================================
  getOnboardingCandidates(): OnboardingCandidate[] {
    return getStored<OnboardingCandidate[]>('agam_onboarding', initialOnboardingCandidates)
  },
  addOnboardingCandidate(payload: { candidateName: string; email: string; jobTitle: string; department: string; joiningDate: string; assignedBuddy: string; shiftTiming?: string; assignedRole?: string; reportingManager?: string }): OnboardingCandidate {
    const list = this.getOnboardingCandidates()
    const item: OnboardingCandidate = {
      id: `onb-${Date.now()}`,
      ...payload,
      assignedRole: payload.assignedRole || 'General Employee',
      shiftTiming: payload.shiftTiming || 'General Day Shift',
      reportingManager: payload.reportingManager || payload.assignedBuddy,
      status: 'In Progress',
      progressPercentage: 0,
      tasks: [
        { id: `t-1-${Date.now()}`, taskName: 'Sign Offer & Non-Disclosure Agreement', category: 'HR Documentation', assignedTo: 'Candidate', completed: false, dueDate: payload.joiningDate },
        { id: `t-2-${Date.now()}`, taskName: 'Upload Identification Documents & Bank Details', category: 'HR Documentation', assignedTo: 'Candidate', completed: false, dueDate: payload.joiningDate },
        { id: `t-3-${Date.now()}`, taskName: 'Provision Laptop & Corporate Systems Access', category: 'IT Setup', assignedTo: 'IT Ops', completed: false, dueDate: payload.joiningDate },
        { id: `t-4-${Date.now()}`, taskName: 'Assign Employee Code & Identity Badge', category: 'Orientation', assignedTo: 'HR Team', completed: false, dueDate: payload.joiningDate },
        { id: `t-5-${Date.now()}`, taskName: 'First Day Orientation & Team Intro Session', category: 'Orientation', assignedTo: payload.assignedBuddy, completed: false, dueDate: payload.joiningDate },
      ],
    }
    list.unshift(item)
    setStored('agam_onboarding', list)
    return item
  },
  toggleOnboardingTask(candidateId: string, taskId: string): OnboardingCandidate {
    const list = this.getOnboardingCandidates()
    const c = list.find((cand) => cand.id === candidateId)
    if (!c) throw new Error('Candidate not found')
    const t = c.tasks.find((task) => task.id === taskId)
    if (t) {
      t.completed = !t.completed
      const completedCount = c.tasks.filter((task) => task.completed).length
      c.progressPercentage = Math.round((completedCount / c.tasks.length) * 100)
      if (c.progressPercentage === 100) c.status = 'Completed'
      setStored('agam_onboarding', list)
    }
    return c
  },
  convertOnboardingCandidateToEmployee(
    param1: string | { candidateId: string; role?: string; assignedRole?: string; grade?: string; salaryGrade?: string; approvalWorkflow?: string; salary?: number; shift?: string; reportingManagerName?: string; manager?: string; documents?: EmployeeDocument[] },
    param2?: number | { role?: string; assignedRole?: string; grade?: string; salaryGrade?: string; approvalWorkflow?: string; salary?: number; shift?: string; reportingManagerName?: string; manager?: string; documents?: EmployeeDocument[] }
  ): Employee {
    let options: {
      candidateId: string
      role?: string
      grade?: string
      approvalWorkflow?: string
      salary?: number
      shift?: string
      reportingManagerName?: string
      documents?: EmployeeDocument[]
    }

    if (typeof param1 === 'string') {
      if (typeof param2 === 'object' && param2 !== null) {
        options = {
          candidateId: param1,
          role: param2.role || param2.assignedRole || 'General Employee',
          grade: param2.grade || param2.salaryGrade || 'Professional / Lead (P1-P3)',
          approvalWorkflow: param2.approvalWorkflow || 'Standard 2-Tier Leave & Expense Approval',
          salary: param2.salary || 95000,
          shift: param2.shift || 'General Day Shift',
          reportingManagerName: param2.reportingManagerName || param2.manager || 'Sarah Connor',
          documents: param2.documents || [],
        }
      } else {
        options = {
          candidateId: param1,
          salary: typeof param2 === 'number' ? param2 : 95000,
          role: 'General Employee',
          grade: 'Professional / Lead (P1-P3)',
          approvalWorkflow: 'Standard 2-Tier Leave & Expense Approval',
          shift: 'General Day Shift',
          reportingManagerName: 'Sarah Connor',
          documents: [],
        }
      }
    } else {
      options = {
        candidateId: param1.candidateId,
        role: param1.role || param1.assignedRole || 'General Employee',
        grade: param1.grade || param1.salaryGrade || 'Professional / Lead (P1-P3)',
        approvalWorkflow: param1.approvalWorkflow || 'Standard 2-Tier Leave & Expense Approval',
        salary: param1.salary || 95000,
        shift: param1.shift || 'General Day Shift',
        reportingManagerName: param1.reportingManagerName || param1.manager || 'Sarah Connor',
        documents: param1.documents || [],
      }
    }

    const list = this.getOnboardingCandidates()
    const c = list.find((cand) => cand.id === options.candidateId)
    if (!c) throw new Error('Candidate not found')

    const nameParts = c.candidateName.split(' ')
    const firstName = nameParts[0] || 'Employee'
    const lastName = nameParts.slice(1).join(' ') || 'Team Member'
    const employeeCode = `AGM-${Math.floor(1000 + Math.random() * 9000)}`

    const initialDocs: EmployeeDocument[] = (options.documents && options.documents.length > 0)
      ? options.documents
      : (c.uploadedDocuments && c.uploadedDocuments.length > 0)
        ? c.uploadedDocuments
        : [
            { id: `doc-${Date.now()}-1`, title: 'Offer_Letter_Signed.pdf', category: 'Contract', uploadDate: c.joiningDate, fileSize: '1.5 MB', status: 'Verified' },
            { id: `doc-${Date.now()}-2`, title: 'Government_ID_Verified.pdf', category: 'ID Proof', uploadDate: c.joiningDate, fileSize: '2.0 MB', status: 'Verified' },
          ]

    const newEmp = this.addEmployee({
      employeeCode,
      firstName,
      lastName,
      email: c.email,
      phone: '+1 (555) 000-0000',
      role: options.role || c.assignedRole || 'General Employee',
      department: c.department,
      designation: c.jobTitle,
      grade: options.grade || c.salaryGrade || 'Professional / Lead (P1-P3)',
      branch: 'San Francisco HQ',
      reportingManagerName: options.reportingManagerName || c.reportingManager || c.assignedBuddy || 'Sarah Connor',
      shift: options.shift || c.shiftTiming || 'General Day Shift',
      employmentType: 'Full-time',
      status: 'Active',
      joiningDate: c.joiningDate,
      salary: options.salary || c.salary || 95000,
      approvalWorkflow: options.approvalWorkflow || c.approvalWorkflow,
      documents: initialDocs,
    })

    c.status = 'Completed'
    c.progressPercentage = 100
    c.tasks.forEach((t) => (t.completed = true))
    if (options.role) c.assignedRole = options.role
    if (options.grade) c.salaryGrade = options.grade
    if (options.approvalWorkflow) c.approvalWorkflow = options.approvalWorkflow
    if (options.shift) c.shiftTiming = options.shift
    if (options.reportingManagerName) c.reportingManager = options.reportingManagerName
    setStored('agam_onboarding', list)

    return newEmp
  },

  addOnboardingDocument(candidateId: string, doc: Omit<EmployeeDocument, 'id' | 'uploadDate'>): OnboardingCandidate {
    const list = this.getOnboardingCandidates()
    const c = list.find((cand) => cand.id === candidateId)
    if (!c) throw new Error('Candidate not found')
    if (!c.uploadedDocuments) c.uploadedDocuments = []
    c.uploadedDocuments.push({
      ...doc,
      id: `onb-doc-${Date.now()}`,
      uploadDate: new Date().toISOString().split('T')[0] ?? '',
    })
    setStored('agam_onboarding', list)
    return c
  },

  // ==========================================
  // 4. ATTENDANCE & SHIFTS (Release 1)
  // ==========================================
  getShifts(): Shift[] {
    return getStored<Shift[]>('agam_shifts', initialShifts)
  },
  addShift(shift: Omit<Shift, 'id'>): Shift {
    const list = this.getShifts()
    const item: Shift = {
      ...shift,
      id: `sh-${Date.now()}`,
    }
    list.push(item)
    setStored('agam_shifts', list)
    return item
  },
  updateShift(id: string, updates: Partial<Shift>): Shift {
    const list = this.getShifts()
    const index = list.findIndex((s) => s.id === id)
    if (index === -1) throw new Error('Shift not found')
    const updated: Shift = {
      ...list[index]!,
      ...updates,
      id,
    }
    list[index] = updated
    setStored('agam_shifts', list)
    return updated
  },
  deleteShift(id: string): boolean {
    const list = this.getShifts()
    const filtered = list.filter((s) => s.id !== id)
    setStored('agam_shifts', filtered)
    return true
  },
  getAttendance(): AttendanceRecord[] {
    const list = getStored<AttendanceRecord[]>('agam_attendance', initialAttendance)
    if (!Array.isArray(list) || list.length === 0) {
      setStored('agam_attendance', initialAttendance)
      return initialAttendance
    }
    return list.filter((a): a is AttendanceRecord => Boolean(a && typeof a === 'object' && a.id))
  },
  recordAttendance(employeeId: string, employeeName: string): AttendanceRecord {
    const list = this.getAttendance()
    const today = new Date().toISOString().split('T')[0] ?? ''
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const existingIndex = list.findIndex((a) => a.employeeId === employeeId && a.date === today)

    if (existingIndex !== -1) {
      const record = list[existingIndex]!
      record.checkOut = currentTime
      record.workHours = 8.5
      setStored('agam_attendance', list)
      return record
    } else {
      const newRecord: AttendanceRecord = {
        id: `att-${Date.now()}`,
        employeeId,
        employeeName,
        date: today,
        checkIn: currentTime,
        shift: 'General Day Shift',
        status: 'Present',
        source: 'Web Punch',
      }
      list.unshift(newRecord)
      setStored('agam_attendance', list)
      return newRecord
    }
  },
  getRegularizations(): RegularizationRequest[] {
    return getStored<RegularizationRequest[]>('agam_regularizations', initialRegularizations)
  },
  submitRegularization(payload: Omit<RegularizationRequest, 'id' | 'status'>): RegularizationRequest {
    const list = this.getRegularizations()
    const item: RegularizationRequest = {
      ...payload,
      id: `reg-${Date.now()}`,
      status: 'Pending',
    }
    list.unshift(item)
    setStored('agam_regularizations', list)
    return item
  },
  updateRegularizationStatus(id: string, status: 'Approved' | 'Rejected'): RegularizationRequest {
    const list = this.getRegularizations()
    const item = list.find((r) => r.id === id)
    if (!item) throw new Error('Not found')
    item.status = status
    setStored('agam_regularizations', list)
    return item
  },

  // ==========================================
  // 5. LEAVE & HOLIDAYS (Release 1)
  // ==========================================
  getLeavePolicies(): LeaveTypePolicy[] {
    return getStored<LeaveTypePolicy[]>('agam_leave_policies', initialLeavePolicies)
  },
  addLeavePolicy(payload: Omit<LeaveTypePolicy, 'id'>): LeaveTypePolicy {
    const list = this.getLeavePolicies()
    const item: LeaveTypePolicy = {
      ...payload,
      id: `pol-${Date.now()}`,
    }
    list.push(item)
    setStored('agam_leave_policies', list)
    return item
  },
  updateLeavePolicy(id: string, updates: Partial<LeaveTypePolicy>): LeaveTypePolicy {
    const list = this.getLeavePolicies()
    const item = list.find((p) => p.id === id)
    if (!item) throw new Error('Policy not found')
    Object.assign(item, updates)
    setStored('agam_leave_policies', list)
    return item
  },
  deleteLeavePolicy(id: string): boolean {
    const list = this.getLeavePolicies()
    const filtered = list.filter((p) => p.id !== id)
    setStored('agam_leave_policies', filtered)
    return true
  },

  getHolidays(): Holiday[] {
    return getStored<Holiday[]>('agam_holidays', initialHolidays)
  },
  addHoliday(payload: Omit<Holiday, 'id'>): Holiday {
    const list = this.getHolidays()
    const dayOfWeek = payload.dayOfWeek || (payload.date ? new Date(payload.date).toLocaleDateString('en-US', { weekday: 'long' }) : undefined)
    const item: Holiday = {
      ...payload,
      dayOfWeek,
      id: `hol-${Date.now()}`,
    }
    list.push(item)
    list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    setStored('agam_holidays', list)
    return item
  },
  updateHoliday(id: string, updates: Partial<Holiday>): Holiday {
    const list = this.getHolidays()
    const item = list.find((h) => h.id === id)
    if (!item) throw new Error('Holiday not found')
    Object.assign(item, updates)
    if (updates.date) {
      item.dayOfWeek = new Date(updates.date).toLocaleDateString('en-US', { weekday: 'long' })
    }
    list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    setStored('agam_holidays', list)
    return item
  },
  deleteHoliday(id: string): boolean {
    const list = this.getHolidays()
    const filtered = list.filter((h) => h.id !== id)
    setStored('agam_holidays', filtered)
    return true
  },
  getLeaveRequests(): LeaveRequest[] {
    const list = getStored<LeaveRequest[]>('agam_leaves', initialLeaveRequests)
    if (!Array.isArray(list) || list.length === 0) {
      setStored('agam_leaves', initialLeaveRequests)
      return initialLeaveRequests
    }
    return list.filter((l): l is LeaveRequest => Boolean(l && typeof l === 'object' && l.id))
  },
  addLeaveRequest(payload: Omit<LeaveRequest, 'id' | 'appliedOn' | 'status'>): LeaveRequest {
    const list = this.getLeaveRequests()
    const newLeave: LeaveRequest = {
      ...payload,
      id: `leave-${Date.now()}`,
      status: 'Pending',
      appliedOn: new Date().toISOString().split('T')[0] ?? '',
    }
    list.unshift(newLeave)
    setStored('agam_leaves', list)
    return newLeave
  },
  updateLeaveStatus(id: string, status: 'Approved' | 'Rejected'): LeaveRequest {
    const list = this.getLeaveRequests()
    const target = list.find((l) => l.id === id)
    if (!target) throw new Error(`Leave request ${id} not found`)
    target.status = status
    setStored('agam_leaves', list)

    if (status === 'Approved') {
      const employees = this.getEmployees()
      const emp = employees.find((e) => e.id === target.employeeId)
      if (emp) {
        emp.status = 'On Leave'
        setStored('agam_employees', employees)
      }
    }
    return target
  },

  // ==========================================
  // 6. PAYROLL (Release 1)
  // ==========================================
  getPayslips(): Payslip[] {
    return getStored<Payslip[]>('agam_payslips', initialPayslips)
  },
  processPayrollRun(monthYear: string): Payslip[] {
    const employees = this.getEmployees().filter((e) => e.status !== 'Terminated')
    const list = this.getPayslips()

    employees.forEach((emp) => {
      const existing = list.find((p) => p.employeeId === emp.id && p.monthYear === monthYear)
      if (!existing) {
        const monthlyGross = Math.round(emp.salary / 12)
        const basic = Math.round(monthlyGross * 0.5)
        const hra = Math.round(monthlyGross * 0.25)
        const specialAllowance = Math.round(monthlyGross * 0.2)
        const conveyance = monthlyGross - (basic + hra + specialAllowance)

        const pf = Math.round(basic * 0.12)
        const pt = 50
        const tds = Math.round(monthlyGross * 0.15)
        const medical = 120
        const totalDeductions = pf + pt + tds + medical
        const netPay = monthlyGross - totalDeductions

        const newSlip: Payslip = {
          id: `ps-${Date.now()}-${emp.id}`,
          payslipNumber: `PAY-${monthYear.replace(' ', '-')}-${emp.employeeCode}`,
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          employeeCode: emp.employeeCode,
          department: emp.department,
          designation: emp.designation,
          bankAccount: 'Direct Deposit Account',
          monthYear,
          paidDays: 30,
          lossOfPayDays: 0,
          paymentStatus: 'Paid',
          paymentDate: new Date().toISOString().split('T')[0] ?? '',
          breakdown: {
            basic,
            hra,
            specialAllowance,
            conveyance,
            providentFund: pf,
            professionalTax: pt,
            incomeTaxTds: tds,
            medicalInsurance: medical,
            grossEarnings: monthlyGross,
            totalDeductions,
            netPay,
          },
        }
        list.unshift(newSlip)
      }
    })

    setStored('agam_payslips', list)
    return list
  },

  togglePayslipAccess(payslipId: string): Payslip {
    const list = this.getPayslips()
    const p = list.find((slip) => slip.id === payslipId)
    if (!p) throw new Error('Payslip not found')
    p.downloadAccessGranted = !p.downloadAccessGranted
    setStored('agam_payslips', list)
    return p
  },

  addSalaryBreakdown(payload: { employeeId: string; basic: number; hra: number; specialAllowance: number; performanceBonus?: number }): Payslip {
    const employees = this.getEmployees()
    const emp = employees.find((e) => e.id === payload.employeeId)
    if (!emp) throw new Error('Employee not found')

    const list = this.getPayslips()
    const monthYear = 'November 2026'
    const basic = payload.basic
    const hra = payload.hra
    const specialAllowance = payload.specialAllowance
    const conveyance = 200
    const grossEarnings = basic + hra + specialAllowance + conveyance + (payload.performanceBonus || 0)

    const pf = Math.round(basic * 0.12)
    const pt = 50
    const tds = Math.round(grossEarnings * 0.15)
    const medical = 120
    const totalDeductions = pf + pt + tds + medical
    const netPay = grossEarnings - totalDeductions

    const newSlip: Payslip = {
      id: `ps-${Date.now()}-${emp.id}`,
      payslipNumber: `PAY-MANUAL-${emp.employeeCode}-${Date.now().toString().slice(-4)}`,
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      employeeCode: emp.employeeCode,
      department: emp.department,
      designation: emp.designation,
      bankAccount: 'Direct Deposit Account',
      monthYear,
      paidDays: 30,
      lossOfPayDays: 0,
      paymentStatus: 'Paid',
      paymentDate: new Date().toISOString().split('T')[0] ?? '',
      downloadAccessGranted: true,
      breakdown: {
        basic,
        hra,
        specialAllowance,
        conveyance,
        providentFund: pf,
        professionalTax: pt,
        incomeTaxTds: tds,
        medicalInsurance: medical,
        grossEarnings,
        totalDeductions,
        netPay,
      },
    }

    list.unshift(newSlip)
    setStored('agam_payslips', list)
    return newSlip
  },

  // ==========================================
  // 7. DASHBOARD STATS (Release 1)
  // ==========================================
  getStats(): HRMSDashboardStats {
    const employees = this.getEmployees()
    const leaves = this.getLeaveRequests()
    const attendance = this.getAttendance()
    const onboarding = this.getOnboardingCandidates()
    const payslips = this.getPayslips()
    const today = new Date().toISOString().split('T')[0] ?? ''

    return {
      totalEmployees: employees.length,
      activeEmployees: employees.filter((e) => e.status === 'Active').length,
      presentToday: attendance.filter((a) => a.date === today).length,
      onLeaveToday: employees.filter((e) => e.status === 'On Leave').length,
      pendingLeaveRequests: leaves.filter((l) => l.status === 'Pending').length,
      onboardingInProgress: onboarding.filter((o) => o.status === 'In Progress').length,
      payrollProcessedThisMonth: payslips.length,
    }
  },
}
