// ==========================================
// 1. HR ADMINISTRATION
// ==========================================
export interface CompanyInfo {
  id: string
  name: string
  legalName: string
  registrationNumber: string
  taxId: string
  website: string
  industry: string
  headquarters: string
  currency: string
  fiscalYearStart: string
}

export interface Branch {
  id: string
  name: string
  code: string
  address: string
  city: string
  country: string
  isHeadquarters: boolean
  timezone: string
  activeEmployees: number
}

export interface Department {
  id: string
  name: string
  code: string
  head: string
  totalEmployees: number
  budget: number
}

export interface Designation {
  id: string
  title: string
  code: string
  departmentId: string
  departmentName: string
  grade: string
  description?: string
}

export interface Grade {
  id: string
  name: string
  level: number
  minSalary: number
  maxSalary: number
  benefits: string[]
}

export interface RolePermission {
  id: string
  roleName: string
  description: string
  usersCount: number
  permissions: {
    module: string
    read: boolean
    write: boolean
    delete: boolean
    approve: boolean
  }[]
}

export interface ApprovalWorkflow {
  id: string
  workflowName: string
  module: 'Leave' | 'WFH' | 'Expense' | 'Promotion' | 'Resignation' | 'Requisition'
  levels: {
    level: number
    approverRole: string
    description: string
  }[]
  status: 'Active' | 'Draft'
}

// ==========================================
// 2. EMPLOYEE MANAGEMENT
// ==========================================
export interface EmployeeDocument {
  id: string
  title: string
  category: 'ID Proof' | 'Educational' | 'Contract' | 'Tax' | 'Certification'
  uploadDate: string
  fileSize: string
  status: 'Verified' | 'Pending' | 'Rejected'
  /** False for metadata-only records with no uploaded file. */
  hasFile?: boolean
}

export interface TransferPromotionRecord {
  id: string
  employeeId: string
  employeeName: string
  type: 'Promotion' | 'Transfer' | 'Designation Change'
  effectiveDate: string
  previousRole: string
  newRole: string
  previousDepartment: string
  newDepartment: string
  previousSalary?: number
  newSalary?: number
  approvedBy: string
}

export type EmployeeStatus =
  | 'Active' | 'Confirmed' | 'On Leave' | 'Probation' | 'Notice Period'
  | 'Offer Released' | 'Pre-Joining'
  | 'Resigned' | 'Relieved' | 'Terminated' | 'Retired' | 'Inactive'

export interface EducationRecord {
  degree: string
  institution?: string
  fieldOfStudy?: string
  startYear?: string
  endYear?: string
  score?: string
}

export interface EmploymentRecord {
  company: string
  designation?: string
  fromDate?: string
  toDate?: string
  lastCtc?: string
  reasonForLeaving?: string
}

export interface ProbationReview {
  id: string
  outcome: 'Feedback' | 'Confirmed' | 'Extended'
  reviewerName: string
  rating?: number
  recommendation?: 'Confirm' | 'Extend'
  feedback?: string
  newEndDate?: string
  createdAt: string
}

export interface ProbationRecord {
  employeeId: string
  employeeName: string
  employeeCode: string
  department: string
  designation: string
  joiningDate: string
  probationEndDate?: string
  daysLeft?: number
  reportingManagerName?: string
  canDecide: boolean
  canReview: boolean
  reviews: ProbationReview[]
}

export interface Employee {
  id: string
  employeeCode: string
  firstName: string
  lastName: string
  email: string
  phone: string
  avatarUrl?: string
  dateOfBirth?: string
  gender?: 'Male' | 'Female' | 'Non-binary' | 'Other' | 'Prefer not to say'
  address?: string
  emergencyContact?: string | {
    name: string
    relation: string
    phone: string
  }
  
  // Employment Details
  role?: string
  /** Ids of the roles (from Roles & Permissions) held by this employee's login. */
  roleIds?: string[]
  department: string
  designation: string
  grade: string
  branch: string
  reportingManagerId?: string
  reportingManagerName?: string
  shift?: string
  approvalWorkflow?: string
  employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'Intern'
  status: EmployeeStatus
  joiningDate: string
  salary: number

  // Documents & Records
  documents?: EmployeeDocument[]
  history?: TransferPromotionRecord[]
  bankDetails?: {
    bankName: string
    accountNumber: string
    routingCode: string
    accountType: 'Checking' | 'Savings' | 'Current'
    accountName?: string
  }

  // Captured by the Add Employee wizard (backend: core_hrms)
  middleName?: string
  personalEmail?: string
  nationality?: string
  maritalStatus?: string
  addressDetails?: { line?: string; city?: string; state?: string; postalCode?: string; country?: string }
  probationEndDate?: string
  confirmationDate?: string
  leavingDate?: string
  noticePeriodDays?: number
  permanentAddress?: { line?: string; city?: string; state?: string; postalCode?: string; country?: string }
  education?: EducationRecord[]
  previousEmployment?: EmploymentRecord[]
  /** Currently employed (active, confirmed, probation, notice period). */
  isCurrent?: boolean
  teamLeadId?: string
  teamLeadName?: string
  panNumber?: string
  uanNumber?: string
  esiNumber?: string
  hasLogin?: boolean
  loginPending?: boolean
  account?: { created: boolean; linked?: boolean; email: string; emailSent: boolean; temporaryPassword?: string } | null
}

// ==========================================
// 3. RECRUITMENT
// ==========================================
export interface JobRequisition {
  id: string
  title: string
  department: string
  branch: string
  openings: number
  experienceRequired: string
  employmentType: 'Full-time' | 'Part-time' | 'Contract'
  minSalary: number
  maxSalary: number
  hiringManager: string
  status: 'Draft' | 'Approved' | 'Published' | 'Closed'
  createdAt: string
}

export interface Candidate {
  id: string
  requisitionId: string
  jobTitle: string
  name: string
  email: string
  phone: string
  experienceYears: number
  currentCompany?: string
  stage: 'Applied' | 'Screening' | 'Technical Round' | 'HR Round' | 'Offer Sent' | 'Hired' | 'Rejected'
  rating: number // 1 to 5
  interviewDate?: string
  interviewer?: string
  feedback?: string
  resumeUrl?: string
}

// ==========================================
// 4. ONBOARDING
// ==========================================
export interface OnboardingItem {
  id: string
  taskName: string
  category: 'IT Setup' | 'HR Documentation' | 'Compliance' | 'Orientation'
  assignedTo: string
  completed: boolean
  dueDate: string
}

export interface OnboardingCandidate {
  id: string
  candidateName: string
  email: string
  jobTitle: string
  department: string
  joiningDate: string
  assignedBuddy: string
  status: 'Pre-boarding' | 'In Progress' | 'Completed'
  progressPercentage: number
  tasks: OnboardingItem[]
  assignedRole?: string
  salaryGrade?: string
  approvalWorkflow?: string
  salary?: number
  shiftTiming?: string
  reportingManager?: string
  uploadedDocuments?: EmployeeDocument[]
}

// ==========================================
// 5. ATTENDANCE & SHIFTS
// ==========================================
export interface Shift {
  id: string
  name: string
  startTime: string
  endTime: string
  graceMinutes: number
  activeDays: string[]
}

export interface AttendanceRecord {
  id: string
  employeeId: string
  employeeName: string
  date: string
  checkIn: string
  checkOut?: string
  shift: string
  workHours?: number
  overtimeHours?: number
  status: 'Present' | 'Late' | 'Half Day' | 'Absent'
  source: 'Web Punch' | 'Biometric' | 'Mobile GPS'
}

export type AttendanceDayStatus =
  | 'present' | 'late' | 'half_day' | 'absent' | 'wfh' | 'on_duty' | 'on_leave' | 'holiday' | 'weekly_off' | 'not_marked' | 'upcoming'

export interface AttendanceRegisterRow {
  employeeId: string
  employeeCode: string
  employeeName: string
  designation: string
  department: string
  status: AttendanceDayStatus
  leaveType?: string
  checkIn?: string
  checkOut?: string
  workHours?: number
  shift?: string
}

export interface AttendanceRegister {
  date: string
  departments: {
    department: string
    total: number
    present: number
    counts: Partial<Record<AttendanceDayStatus, number>>
    employees: AttendanceRegisterRow[]
  }[]
}

export interface AttendanceCalendar {
  month: string
  employeeId: string
  days: { date: string; status: AttendanceDayStatus; leaveType?: string; checkIn?: string; checkOut?: string; workHours?: number; wfhPending?: boolean; location?: WorkLocation | 'WFH' }[]
  summary: Partial<Record<AttendanceDayStatus, number>>
}

export interface RegularizationRequest {
  id: string
  employeeId: string
  employeeName: string
  date: string
  actualCheckIn: string
  actualCheckOut: string
  correctedCheckIn?: string
  correctedCheckOut?: string
  reason: string
  status: 'Pending' | 'Approved' | 'Rejected'
  canAct?: boolean
}

// ==========================================
// 6. LEAVE & HOLIDAYS
// ==========================================
export interface LeaveTypePolicy {
  id: string
  name: 'Annual' | 'Sick' | 'Casual' | 'Maternity/Paternity' | 'Compensatory' | 'Unpaid' | string
  leaveType?: string
  totalAllowedPerYear: number
  annualQuota?: number
  accrualFrequency: 'Monthly' | 'Quarterly' | 'Yearly'
  carryForwardAllowed: boolean
  maxCarryForwardDays: number
  carryForwardMax?: number
  paid?: boolean
  description?: string
  /** Yearly quota per salary grade; employees without one get totalAllowedPerYear. */
  gradeQuotas?: { gradeId: string; grade?: string; quota: number }[]
}

export interface Holiday {
  id: string
  name: string
  date: string
  type: 'Public' | 'National' | 'Optional' | string
  dayOfWeek?: string
}

export interface LeaveBalance {
  policyId: string
  leaveType: string
  paid: boolean
  year: number
  allocated: number
  accrued: number
  carriedForward: number
  adjusted: number
  used: number
  pending: number
  available: number
}

export interface LeaveRequest {
  id: string
  employeeId: string
  employeeName: string
  department: string
  leaveType: 'Annual' | 'Sick' | 'Casual' | 'Maternity/Paternity' | 'Compensatory' | 'Unpaid'
  startDate: string
  endDate: string
  daysCount: number
  reason: string
  status: 'Pending' | 'Approved' | 'Rejected'
  appliedOn: string
  /** True when the signed-in user can approve/reject the current step. */
  canAct?: boolean
}

// ==========================================
// 7. PAYROLL
// ==========================================
export interface SalaryBreakdown {
  basic: number
  hra: number
  specialAllowance: number
  conveyance: number
  providentFund: number
  professionalTax: number
  incomeTaxTds: number
  medicalInsurance: number
  grossEarnings: number
  totalDeductions: number
  netPay: number
}

export interface Payslip {
  id: string
  payslipNumber: string
  employeeId: string
  employeeName: string
  employeeCode: string
  department: string
  designation: string
  bankAccount: string
  monthYear: string // e.g. "November 2026"
  paidDays: number
  lossOfPayDays: number
  breakdown: SalaryBreakdown
  paymentStatus: 'Paid' | 'Processing' | 'Hold'
  paymentDate: string
  downloadAccessGranted?: boolean
}

// ==========================================
// 8. PERFORMANCE MANAGEMENT
// ==========================================
export interface GoalOKR {
  id: string
  employeeId: string
  employeeName: string
  title: string
  category: 'Strategic' | 'Operational' | 'Learning'
  targetDate: string
  weightage: number // percentage
  progress: number // percentage
  status: 'In Progress' | 'Achieved' | 'Behind'
}

export interface AppraisalCycle {
  id: string
  name: string
  cyclePeriod: string // e.g. "FY 2026 - Q3"
  employeeId: string
  employeeName: string
  department: string
  selfRating: number // 1 to 5
  managerRating: number
  overallScore: number
  strengths: string
  areasOfImprovement: string
  promotionRecommended: boolean
  status: 'Self Review' | 'Manager Review' | 'HR Completed'
}

// ==========================================
// 9. LEARNING & DEVELOPMENT
// ==========================================
export interface Course {
  id: string
  title: string
  category: 'Technical' | 'Leadership' | 'Compliance' | 'Soft Skills'
  instructor: string
  durationHours: number
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  enrollmentsCount: number
  status: 'Upcoming' | 'Ongoing' | 'Completed'
  scheduleDate: string
}

export interface TrainingRequest {
  id: string
  employeeId: string
  employeeName: string
  courseTitle: string
  cost: number
  justification: string
  status: 'Pending' | 'Approved' | 'Completed' | 'Rejected'
}

// ==========================================
// 10. EXPENSE MANAGEMENT
// ==========================================
export interface ExpenseClaim {
  id: string
  claimNumber: string
  employeeId: string
  employeeName: string
  category: 'Travel & Cab' | 'Client Dining' | 'Equipment' | 'Accommodation' | 'Internet & Mobile'
  expenseDate: string
  amount: number
  currency: string
  description: string
  receiptFileName?: string
  status: 'Submitted' | 'Approved' | 'Settled' | 'Rejected'
}

// ==========================================
// 11. EXIT MANAGEMENT
// ==========================================
export interface ExitProcess {
  id: string
  employeeId: string
  employeeName: string
  employeeCode: string
  department: string
  resignationDate: string
  requestedLastWorkingDay: string
  approvedLastWorkingDay: string
  noticePeriodDays: number
  reason: string
  status: 'Resigned' | 'Notice Period' | 'Clearance Pending' | 'Settled' | 'Exited'
  clearances: {
    department: 'IT Equipment' | 'Finance' | 'HR Documents' | 'Admin & Access'
    cleared: boolean
    clearedBy?: string
  }[]
  finalSettlementAmount: number
  experienceLetterGenerated: boolean
}

// ==========================================
// DASHBOARD STATS (Release 1: Core HRMS)
// ==========================================
export interface HRMSDashboardStats {
  totalEmployees: number
  activeEmployees: number
  presentToday: number
  onLeaveToday: number
  pendingLeaveRequests: number
  onboardingInProgress: number
  payrollProcessedThisMonth: number
  pendingExpenseClaims?: number
  openJobRequisitions?: number
  activeResignations?: number
}

export type HRMSStats = HRMSDashboardStats

/** A work-from-home application for a date range; approved days show as WFH in attendance. */
export interface RemoteWorkRequest {
  id: string
  employeeId: string
  employeeName: string
  fromDate: string
  toDate: string
  days: number
  /** WFH or On Duty (official work away from the office). */
  kind?: 'WFH' | 'On Duty'
  dutyLocation?: string
  reason: string
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'
  appliedOn: string
  canAct?: boolean
  canCancel?: boolean
}

export interface Resignation {
  id: string
  employeeId: string
  employeeName: string
  employeeCode: string
  department: string
  designation: string
  submittedOn: string
  proposedLastDay: string
  lastWorkingDay?: string
  noticeDays: number
  reason: string
  status: 'Pending' | 'Approved' | 'Rejected' | 'Withdrawn' | 'Completed'
  canAct?: boolean
  canWithdraw?: boolean
}

export type WorkLocation = 'Office' | 'Client location'

/** Today's clock state for the signed-in employee (GET /app/attendance/today). */
export interface PunchState {
  employeeId: string
  clockedIn: boolean
  location?: WorkLocation
  since?: string
  /** Clocked out for the day: further work is claimed with a regularization. */
  doneForDay?: boolean
  office?: { location: WorkLocation; checkIn: string; checkOut?: string }
  /** Work from home applied for today. */
  wfhToday?: 'Approved' | 'Pending'
  record?: AttendanceRecord
}

export type ProjectStatus = 'Planned' | 'Active' | 'On Hold' | 'Completed' | 'Cancelled'

export interface ProjectMember {
  employeeId: string
  name: string
  designation?: string
  role?: string
}

export interface Project {
  id: string
  name: string
  code: string
  clientName: string
  description: string
  status: ProjectStatus
  startDate?: string
  endDate?: string
  managerId?: string
  managerName?: string
  members: ProjectMember[]
  taskCounts: { todo: number; inProgress: number; done: number }
  progress: number
  /** The signed-in user can edit the project and its members. */
  canManage: boolean
}

export type TodoStatus = 'To do' | 'In progress' | 'Done'
export type TodoPriority = 'Low' | 'Medium' | 'High'

/** A personal todo, one assigned by a manager / HR, or a project task. */
export interface Todo {
  id: string
  title: string
  description: string
  status: TodoStatus
  priority: TodoPriority
  dueDate?: string
  overdue: boolean
  assigneeId: string
  assigneeName: string
  createdById: string
  createdByName: string
  createdByMe: boolean
  projectId?: string
  projectName?: string
  completedAt?: string
  createdAt: string
  canEdit: boolean
  canDelete: boolean
  canChangeStatus: boolean
}

export interface TodoInput {
  title?: string
  description?: string
  dueDate?: string
  priority?: TodoPriority
  status?: TodoStatus
  assigneeId?: string
  projectId?: string
}

/** Generic report from GET /app/reports/:name (also downloadable as CSV). */
export interface ReportResult {
  title: string
  columns: { key: string; label: string }[]
  rows: Record<string, string | number | null>[]
  totals?: Record<string, string | number | null>
}
