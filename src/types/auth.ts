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
    | 'projects'
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
  /** Whose records the user can reach: all (Super Admin/HR), team (managers), own, none. */
  dataScope?: 'all' | 'team' | 'own' | 'none'
  department: string
  designation: string
  avatar?: string
  authProvider?: 'credentials' | 'zoho'
  zohoId?: string
  zohoAccountType?: string
  permissions: UserPermission[]
  userId?: string
  companyName?: string
  companyCode?: string
  /** True after HR creates the account; the user must set their own password. */
  mustChangePassword?: boolean
}

export interface AuthState {
  isAuthenticated: boolean
  user: AuthUser | null
  token: string | null
  loginTime?: string
  roleSimulation: boolean
}
