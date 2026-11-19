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
  HRMSStats,
} from '@/types/hrms'

export type {
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
  HRMSStats,
}

// ==========================================
// 1. HR ADMINISTRATION (Release 1)
// ==========================================
export const initialCompany: CompanyInfo = {
  id: 'comp-1',
  name: 'Agam Technologies Inc.',
  legalName: 'Agam Enterprise Solutions Ltd.',
  registrationNumber: 'REG-US-8924190',
  taxId: 'US-EIN-987654321',
  website: 'https://agam.internal',
  industry: 'Enterprise Software & Cloud Platforms',
  headquarters: 'San Francisco, CA',
  currency: 'USD ($)',
  fiscalYearStart: 'January 1',
}

export const initialBranches: Branch[] = [
  { id: 'br-1', name: 'San Francisco HQ', code: 'SF-HQ', address: '100 Market St, Suite 400', city: 'San Francisco', country: 'United States', isHeadquarters: true, timezone: 'America/Los_Angeles', activeEmployees: 42 },
  { id: 'br-2', name: 'New York Innovation Lab', code: 'NYC-01', address: '350 5th Ave', city: 'New York', country: 'United States', isHeadquarters: false, timezone: 'America/New_York', activeEmployees: 28 },
  { id: 'br-3', name: 'London Tech Hub', code: 'LDN-01', address: '10 Finsbury Square', city: 'London', country: 'United Kingdom', isHeadquarters: false, timezone: 'Europe/London', activeEmployees: 19 },
]

export const initialGrades: Grade[] = [
  { id: 'grd-1', name: 'Executive (E1-E2)', level: 1, minSalary: 160000, maxSalary: 280000, benefits: ['Executive Healthcare', 'Stock Options', 'Car Allowance'] },
  { id: 'grd-2', name: 'Senior Management (M1-M2)', level: 2, minSalary: 120000, maxSalary: 175000, benefits: ['Comprehensive Medical', 'Stock Bonus', 'Gym Stipend'] },
  { id: 'grd-3', name: 'Professional / Lead (P1-P3)', level: 3, minSalary: 85000, maxSalary: 130000, benefits: ['Health & Dental', 'Learning Allowance'] },
  { id: 'grd-4', name: 'Associate / Specialist (A1-A2)', level: 4, minSalary: 55000, maxSalary: 90000, benefits: ['Standard Medical', 'WFH Allowance'] },
]

export const initialDepartments: Department[] = [
  { id: 'dept-1', name: 'Engineering', code: 'ENG', head: 'Sarah Connor', totalEmployees: 18, budget: 350000 },
  { id: 'dept-2', name: 'Human Resources', code: 'HR', head: 'Priya Sharma', totalEmployees: 6, budget: 120000 },
  { id: 'dept-3', name: 'Product & Design', code: 'PRD', head: 'Alex Mercer', totalEmployees: 9, budget: 210000 },
  { id: 'dept-4', name: 'Sales & Marketing', code: 'MKT', head: 'Michael Scott', totalEmployees: 14, budget: 280000 },
  { id: 'dept-5', name: 'Finance & Operations', code: 'FIN', head: 'Angela Martin', totalEmployees: 5, budget: 160000 },
]

export const initialDesignations: Designation[] = [
  { id: 'des-1', title: 'VP of Engineering', code: 'VP-ENG', departmentId: 'dept-1', departmentName: 'Engineering', grade: 'Executive (E1-E2)', description: 'Technical strategy and engineering leadership' },
  { id: 'des-2', title: 'Senior Frontend Engineer', code: 'SR-FE', departmentId: 'dept-1', departmentName: 'Engineering', grade: 'Professional / Lead (P1-P3)', description: 'Frontend web and mobile client applications' },
  { id: 'des-3', title: 'Cloud Platform Architect', code: 'CLOUD-ARCH', departmentId: 'dept-1', departmentName: 'Engineering', grade: 'Senior Management (M1-M2)', description: 'Distributed cloud architecture and scalability' },
  { id: 'des-4', title: 'Head of People Operations', code: 'HEAD-HR', departmentId: 'dept-2', departmentName: 'Human Resources', grade: 'Senior Management (M1-M2)', description: 'HR policy, talent management and culture' },
  { id: 'des-5', title: 'Principal Product Manager', code: 'PRIN-PM', departmentId: 'dept-3', departmentName: 'Product & Design', grade: 'Senior Management (M1-M2)', description: 'Product roadmap and customer discovery' },
  { id: 'des-6', title: 'Senior UX & Product Designer', code: 'SR-UX', departmentId: 'dept-3', departmentName: 'Product & Design', grade: 'Professional / Lead (P1-P3)', description: 'Design systems and UX interaction' },
  { id: 'des-7', title: 'Enterprise Account Executive', code: 'ENT-AE', departmentId: 'dept-4', departmentName: 'Sales & Marketing', grade: 'Professional / Lead (P1-P3)', description: 'B2B enterprise account acquisition' },
  { id: 'des-8', title: 'Senior Financial Analyst', code: 'SR-FIN', departmentId: 'dept-5', departmentName: 'Finance & Operations', grade: 'Professional / Lead (P1-P3)', description: 'Corporate financial planning and analysis' },
]

export const initialRoles: RolePermission[] = [
  {
    id: 'role-1',
    roleName: 'HR Super Admin',
    description: 'Unrestricted administration, payroll release, approvals, and employee records',
    usersCount: 3,
    permissions: [
      { module: 'HR Administration', read: true, write: true, delete: true, approve: true },
      { module: 'Employee Management', read: true, write: true, delete: true, approve: true },
      { module: 'Onboarding', read: true, write: true, delete: true, approve: true },
      { module: 'Payroll & Compensation', read: true, write: true, delete: true, approve: true },
      { module: 'Attendance & Leave', read: true, write: true, delete: true, approve: true },
    ],
  },
  {
    id: 'role-2',
    roleName: 'Department Manager',
    description: 'Team attendance, leave approvals, shift management, and employee profile views',
    usersCount: 8,
    permissions: [
      { module: 'HR Administration', read: false, write: false, delete: false, approve: false },
      { module: 'Employee Management', read: true, write: false, delete: false, approve: true },
      { module: 'Attendance & Leave', read: true, write: true, delete: false, approve: true },
    ],
  },
  {
    id: 'role-3',
    roleName: 'General Employee (ESS)',
    description: 'Personal self-service access for payslips, clocking in, leave applications, documents',
    usersCount: 78,
    permissions: [
      { module: 'Employee Self-Service', read: true, write: true, delete: false, approve: false },
      { module: 'Attendance & Leave', read: true, write: true, delete: false, approve: false },
      { module: 'Leave Management', read: true, write: true, delete: false, approve: false },
      { module: 'Attendance', read: true, write: true, delete: false, approve: false },
    ],
  },
]

export const initialWorkflows: ApprovalWorkflow[] = [
  {
    id: 'wf-1',
    workflowName: 'Annual Leave Approval',
    module: 'Leave',
    levels: [
      { level: 1, approverRole: 'Direct Reporting Manager', description: 'Immediate operational impact evaluation' },
      { level: 2, approverRole: 'HR Operations Lead', description: 'Leave balance validation and payroll record update' },
    ],
    status: 'Active',
  },
]

// ==========================================
// 2. EMPLOYEE MANAGEMENT (Release 1)
// ==========================================
export const initialEmployees: Employee[] = [
  {
    id: 'emp-1',
    employeeCode: 'AGM-1001',
    firstName: 'Sarah',
    lastName: 'Connor',
    email: 'sarah.connor@agam.internal',
    phone: '+1 (555) 234-5678',
    department: 'Engineering',
    designation: 'VP of Engineering',
    grade: 'Executive (E1-E2)',
    branch: 'San Francisco HQ',
    reportingManagerName: 'Executive Board',
    employmentType: 'Full-time',
    status: 'Active',
    joiningDate: '2022-03-15',
    salary: 165000,
    documents: [
      { id: 'doc-1', title: 'Passport_Copy.pdf', category: 'ID Proof', uploadDate: '2022-03-15', fileSize: '1.8 MB', status: 'Verified' },
      { id: 'doc-2', title: 'Employment_Contract_Signed.pdf', category: 'Contract', uploadDate: '2022-03-15', fileSize: '2.4 MB', status: 'Verified' },
    ],
    history: [
      { id: 'h-1', employeeId: 'emp-1', employeeName: 'Sarah Connor', type: 'Promotion', effectiveDate: '2024-01-01', previousRole: 'Director of Engineering', newRole: 'VP of Engineering', previousDepartment: 'Engineering', newDepartment: 'Engineering', previousSalary: 145000, newSalary: 165000, approvedBy: 'CEO' },
    ],
    bankDetails: {
      bankName: 'JPMorgan Chase & Co.',
      accountName: 'Sarah Connor',
      accountNumber: '•••••••• 4892',
      routingCode: '021000021',
      accountType: 'Checking',
    },
  },
  {
    id: 'emp-2',
    employeeCode: 'AGM-1002',
    firstName: 'Priya',
    lastName: 'Sharma',
    email: 'priya.sharma@agam.internal',
    phone: '+1 (555) 345-6789',
    department: 'Human Resources',
    designation: 'Head of People Operations',
    grade: 'Senior Management (M1-M2)',
    branch: 'San Francisco HQ',
    reportingManagerName: 'Sarah Connor',
    employmentType: 'Full-time',
    status: 'Active',
    joiningDate: '2022-04-01',
    salary: 130000,
    documents: [
      { id: 'doc-3', title: 'National_ID_Verified.pdf', category: 'ID Proof', uploadDate: '2022-04-01', fileSize: '1.2 MB', status: 'Verified' },
    ],
    bankDetails: {
      bankName: 'Wells Fargo Bank',
      accountName: 'Priya Sharma',
      accountNumber: '•••••••• 1209',
      routingCode: '121000247',
      accountType: 'Checking',
    },
  },
  {
    id: 'emp-3',
    employeeCode: 'AGM-1003',
    firstName: 'Alex',
    lastName: 'Mercer',
    email: 'alex.mercer@agam.internal',
    phone: '+1 (555) 456-7890',
    department: 'Product & Design',
    designation: 'Principal Product Manager',
    grade: 'Senior Management (M1-M2)',
    branch: 'New York Innovation Lab',
    reportingManagerName: 'Sarah Connor',
    employmentType: 'Full-time',
    status: 'Active',
    joiningDate: '2022-06-10',
    salary: 135000,
  },
  {
    id: 'emp-4',
    employeeCode: 'AGM-1004',
    firstName: 'David',
    lastName: 'Kim',
    email: 'david.kim@agam.internal',
    phone: '+1 (555) 567-8901',
    department: 'Engineering',
    designation: 'Senior Frontend Engineer',
    grade: 'Professional / Lead (P1-P3)',
    branch: 'San Francisco HQ',
    reportingManagerName: 'Sarah Connor',
    employmentType: 'Full-time',
    status: 'On Leave',
    joiningDate: '2023-01-16',
    salary: 118000,
  },
  {
    id: 'emp-5',
    employeeCode: 'AGM-1005',
    firstName: 'Elena',
    lastName: 'Rostova',
    email: 'elena.rostova@agam.internal',
    phone: '+1 (555) 678-9012',
    department: 'Sales & Marketing',
    designation: 'Enterprise Account Executive',
    grade: 'Professional / Lead (P1-P3)',
    branch: 'London Tech Hub',
    reportingManagerName: 'Michael Scott',
    employmentType: 'Full-time',
    status: 'Active',
    joiningDate: '2023-05-20',
    salary: 110000,
  },
  {
    id: 'emp-6',
    employeeCode: 'AGM-1006',
    firstName: 'Marcus',
    lastName: 'Vance',
    email: 'marcus.vance@agam.internal',
    phone: '+1 (555) 789-0123',
    department: 'Finance & Operations',
    designation: 'Senior Financial Analyst',
    grade: 'Professional / Lead (P1-P3)',
    branch: 'San Francisco HQ',
    reportingManagerName: 'Angela Martin',
    employmentType: 'Full-time',
    status: 'Active',
    joiningDate: '2023-09-01',
    salary: 105000,
  },
  {
    id: 'emp-7',
    employeeCode: 'AGM-1007',
    firstName: 'Chloe',
    lastName: 'Bennett',
    email: 'chloe.bennett@agam.internal',
    phone: '+1 (555) 890-1234',
    department: 'Engineering',
    designation: 'Cloud Platform Architect',
    grade: 'Professional / Lead (P1-P3)',
    branch: 'San Francisco HQ',
    reportingManagerName: 'Sarah Connor',
    employmentType: 'Full-time',
    status: 'Active',
    joiningDate: '2023-02-10',
    salary: 115000,
  },
]

// ==========================================
// 3. ONBOARDING (Release 1)
// ==========================================
export const initialOnboardingCandidates: OnboardingCandidate[] = [
  {
    id: 'onb-1',
    candidateName: 'Maya Lin',
    email: 'maya.lin@example.com',
    jobTitle: 'Senior UX & Product Designer',
    department: 'Product & Design',
    joiningDate: '2026-12-01',
    assignedBuddy: 'Alex Mercer',
    status: 'In Progress',
    progressPercentage: 65,
    tasks: [
      { id: 't-1', taskName: 'Sign Offer & Non-Disclosure Agreement', category: 'HR Documentation', assignedTo: 'Candidate', completed: true, dueDate: '2026-11-18' },
      { id: 't-2', taskName: 'Upload Passport & Tax Identification W-4', category: 'HR Documentation', assignedTo: 'Candidate', completed: true, dueDate: '2026-11-20' },
      { id: 't-3', taskName: 'Provision MacBook Pro & Workspace Credentials', category: 'IT Setup', assignedTo: 'IT Ops', completed: true, dueDate: '2026-11-25' },
      { id: 't-4', taskName: 'Assign Employee Code & Identity Badge', category: 'Orientation', assignedTo: 'Priya Sharma', completed: false, dueDate: '2026-11-28' },
      { id: 't-5', taskName: 'Schedule First-Week Team Induction Session', category: 'Orientation', assignedTo: 'Alex Mercer', completed: false, dueDate: '2026-12-01' },
    ],
  },
]

// ==========================================
// 4. ATTENDANCE & SHIFTS (Release 1)
// ==========================================
export const initialShifts: Shift[] = [
  { id: 'sh-1', name: 'General Day Shift', startTime: '09:00 AM', endTime: '06:00 PM', graceMinutes: 15, activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { id: 'sh-2', name: 'Early Morning Engineering Shift', startTime: '08:00 AM', endTime: '05:00 PM', graceMinutes: 15, activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { id: 'sh-3', name: 'Customer Support EMEA Shift', startTime: '11:00 AM', endTime: '08:00 PM', graceMinutes: 20, activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
]

export const initialAttendance: AttendanceRecord[] = [
  { id: 'att-1', employeeId: 'emp-1', employeeName: 'Sarah Connor', date: '2026-11-17', checkIn: '08:55 AM', checkOut: '05:45 PM', shift: 'General Day Shift', workHours: 8.8, overtimeHours: 0.8, status: 'Present', source: 'Web Punch' },
  { id: 'att-2', employeeId: 'emp-2', employeeName: 'Priya Sharma', date: '2026-11-17', checkIn: '09:02 AM', checkOut: '05:30 PM', shift: 'General Day Shift', workHours: 8.5, overtimeHours: 0, status: 'Present', source: 'Biometric' },
  { id: 'att-3', employeeId: 'emp-3', employeeName: 'Alex Mercer', date: '2026-11-17', checkIn: '09:42 AM', checkOut: '06:15 PM', shift: 'General Day Shift', workHours: 8.5, overtimeHours: 0, status: 'Late', source: 'Mobile GPS' },
  { id: 'att-4', employeeId: 'emp-5', employeeName: 'Elena Rostova', date: '2026-11-17', checkIn: '09:00 AM', shift: 'General Day Shift', workHours: 6.2, status: 'Present', source: 'Biometric' },
  { id: 'att-5', employeeId: 'emp-6', employeeName: 'Marcus Vance', date: '2026-11-17', checkIn: '08:48 AM', shift: 'General Day Shift', workHours: 6.4, status: 'Present', source: 'Web Punch' },
]

export const initialRegularizations: RegularizationRequest[] = [
  { id: 'reg-1', employeeId: 'emp-3', employeeName: 'Alex Mercer', date: '2026-11-17', actualCheckIn: '09:05 AM', actualCheckOut: '06:15 PM', reason: 'Subway signal disruption delayed arrival by 35 minutes.', status: 'Pending' },
]

// ==========================================
// 5. LEAVE & HOLIDAYS (Release 1)
// ==========================================
export const initialLeavePolicies: LeaveTypePolicy[] = [
  { id: 'lp-1', name: 'Annual', totalAllowedPerYear: 20, accrualFrequency: 'Monthly', carryForwardAllowed: true, maxCarryForwardDays: 10 },
  { id: 'lp-2', name: 'Sick', totalAllowedPerYear: 12, accrualFrequency: 'Yearly', carryForwardAllowed: false, maxCarryForwardDays: 0 },
  { id: 'lp-3', name: 'Casual', totalAllowedPerYear: 8, accrualFrequency: 'Yearly', carryForwardAllowed: false, maxCarryForwardDays: 0 },
  { id: 'lp-4', name: 'Compensatory', totalAllowedPerYear: 5, accrualFrequency: 'Monthly', carryForwardAllowed: false, maxCarryForwardDays: 0 },
  { id: 'lp-5', name: 'Maternity/Paternity', totalAllowedPerYear: 90, accrualFrequency: 'Yearly', carryForwardAllowed: false, maxCarryForwardDays: 0 },
]

export const initialHolidays: Holiday[] = [
  { id: 'hol-1', name: "New Year's Day", date: '2026-01-01', type: 'Public', dayOfWeek: 'Thursday' },
  { id: 'hol-2', name: 'Martin Luther King Jr. Day', date: '2026-01-19', type: 'Public', dayOfWeek: 'Monday' },
  { id: 'hol-3', name: 'Memorial Day', date: '2026-05-25', type: 'Public', dayOfWeek: 'Monday' },
  { id: 'hol-4', name: 'Independence Day', date: '2026-07-04', type: 'National', dayOfWeek: 'Saturday' },
  { id: 'hol-5', name: 'Labor Day', date: '2026-09-07', type: 'Public', dayOfWeek: 'Monday' },
  { id: 'hol-6', name: 'Thanksgiving Day', date: '2026-11-26', type: 'Public', dayOfWeek: 'Thursday' },
  { id: 'hol-7', name: 'Christmas Day', date: '2026-12-25', type: 'Public', dayOfWeek: 'Friday' },
]

export const initialLeaveRequests: LeaveRequest[] = [
  {
    id: 'lr-1',
    employeeId: 'emp-4',
    employeeName: 'David Kim',
    department: 'Engineering',
    leaveType: 'Annual',
    startDate: '2026-11-16',
    endDate: '2026-11-20',
    daysCount: 5,
    reason: 'Family vacation and personal travel',
    status: 'Approved',
    appliedOn: '2026-11-05',
  },
  {
    id: 'lr-2',
    employeeId: 'emp-3',
    employeeName: 'Alex Mercer',
    department: 'Product & Design',
    leaveType: 'Casual',
    startDate: '2026-11-23',
    endDate: '2026-11-24',
    daysCount: 2,
    reason: 'Attending sibling graduation ceremony',
    status: 'Pending',
    appliedOn: '2026-11-14',
  },
  {
    id: 'lr-3',
    employeeId: 'emp-6',
    employeeName: 'Marcus Vance',
    department: 'Finance & Operations',
    leaveType: 'Sick',
    startDate: '2026-11-18',
    endDate: '2026-11-18',
    daysCount: 1,
    reason: 'Dental surgery and prescribed recovery',
    status: 'Pending',
    appliedOn: '2026-11-16',
  },
]

// ==========================================
// 6. PAYROLL (Release 1)
// ==========================================
export const initialPayslips: Payslip[] = [
  {
    id: 'ps-101',
    payslipNumber: 'PAY-2026-11-001',
    employeeId: 'emp-1',
    employeeName: 'Sarah Connor',
    employeeCode: 'AGM-1001',
    department: 'Engineering',
    designation: 'VP of Engineering',
    bankAccount: 'Chase Bank •••• 4892',
    monthYear: 'November 2026',
    paidDays: 30,
    lossOfPayDays: 0,
    paymentStatus: 'Paid',
    paymentDate: '2026-11-15',
    breakdown: {
      basic: 6875,
      hra: 3438,
      specialAllowance: 2750,
      conveyance: 687,
      providentFund: 825,
      professionalTax: 50,
      incomeTaxTds: 1950,
      medicalInsurance: 150,
      grossEarnings: 13750,
      totalDeductions: 2975,
      netPay: 10775,
    },
  },
  {
    id: 'ps-102',
    payslipNumber: 'PAY-2026-11-002',
    employeeId: 'emp-2',
    employeeName: 'Priya Sharma',
    employeeCode: 'AGM-1002',
    department: 'Human Resources',
    designation: 'Head of People Operations',
    bankAccount: 'Wells Fargo •••• 1209',
    monthYear: 'November 2026',
    paidDays: 30,
    lossOfPayDays: 0,
    paymentStatus: 'Paid',
    paymentDate: '2026-11-15',
    breakdown: {
      basic: 5416,
      hra: 2708,
      specialAllowance: 2167,
      conveyance: 542,
      providentFund: 650,
      professionalTax: 50,
      incomeTaxTds: 1450,
      medicalInsurance: 120,
      grossEarnings: 10833,
      totalDeductions: 2270,
      netPay: 8563,
    },
  },
]
