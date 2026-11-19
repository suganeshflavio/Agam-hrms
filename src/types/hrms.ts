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
  module: 'Leave' | 'Expense' | 'Promotion' | 'Resignation' | 'Requisition'
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

export interface Employee {
  id: string
  employeeCode: string
  firstName: string
  lastName: string
  email: string
  phone: string
  avatarUrl?: string
  dateOfBirth?: string
  gender?: 'Male' | 'Female' | 'Non-binary' | 'Other'
  address?: string
  emergencyContact?: string | {
    name: string
    relation: string
    phone: string
  }
  
  // Employment Details
  role?: string
  department: string
  designation: string
  grade: string
  branch: string
  reportingManagerId?: string
  reportingManagerName?: string
  shift?: string
  approvalWorkflow?: string
  employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'Intern'
  status: 'Active' | 'On Leave' | 'Terminated' | 'Probation' | 'Notice Period'
  joiningDate: string
  salary: number

  // Documents & Records
  documents?: EmployeeDocument[]
  history?: TransferPromotionRecord[]
  bankDetails?: {
    bankName: string
    accountNumber: string
    routingCode: string
    accountType: 'Checking' | 'Savings'
    accountName?: string
  }
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
}

export interface Holiday {
  id: string
  name: string
  date: string
  type: 'Public' | 'National' | 'Optional' | string
  dayOfWeek?: string
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
