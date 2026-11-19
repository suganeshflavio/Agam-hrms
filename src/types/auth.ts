export type SystemRoleType =
  | 'Super Admin'
  | 'HR Manager'
  | 'Department Manager'
  | 'Payroll Specialist'
  | 'Recruiter'
  | 'General Employee'

export interface PermissionAction {
  view: boolean
  create: boolean
  edit: boolean
  delete: boolean
  approve: boolean
  export: boolean
}

export interface UserPermission {
  module:
    | 'admin'
    | 'employees'
    | 'onboarding'
    | 'recruitment'
    | 'attendance'
    | 'leaves'
    | 'payroll'
    | 'performance'
    | 'learning'
    | 'expenses'
    | 'exit'
    | 'master-data'
  actions: PermissionAction
}

export interface AuthUser {
  id: string
  employeeId?: string
  name: string
  email: string
  role: SystemRoleType
  department: string
  designation: string
  avatar?: string
  authProvider?: 'credentials' | 'zoho'
  zohoId?: string
  zohoAccountType?: string
  permissions: UserPermission[]
}

export interface AuthState {
  isAuthenticated: boolean
  user: AuthUser | null
  token: string | null
  loginTime?: string
  roleSimulation: boolean
}
