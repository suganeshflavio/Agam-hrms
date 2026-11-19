import type { AuthUser, SystemRoleType, UserPermission } from '@/types/auth'

const allModules: UserPermission['module'][] = [
  'admin',
  'employees',
  'onboarding',
  'recruitment',
  'attendance',
  'leaves',
  'payroll',
  'performance',
  'learning',
  'expenses',
  'exit',
  'master-data',
]

const fullAccess = { view: true, create: true, edit: true, delete: true, approve: true, export: true }
const readOnly = { view: true, create: false, edit: false, delete: false, approve: false, export: true }
const standardOps = { view: true, create: true, edit: true, delete: false, approve: true, export: true }
const employeeAccess = { view: true, create: true, edit: false, delete: false, approve: false, export: false }
const noAccess = { view: false, create: false, edit: false, delete: false, approve: false, export: false }

export const rolePermissionProfiles: Record<SystemRoleType, UserPermission[]> = {
  'Super Admin': allModules.map((module) => ({
    module,
    actions: { ...fullAccess },
  })),

  'HR Manager': allModules.map((module) => {
    if (module === 'admin') {
      return { module, actions: { ...readOnly, edit: true } }
    }
    return { module, actions: { ...fullAccess } }
  }),

  'Department Manager': allModules.map((module) => {
    if (['admin', 'payroll', 'master-data'].includes(module)) {
      return { module, actions: { ...noAccess } }
    }
    if (['leaves', 'expenses', 'performance', 'attendance'].includes(module)) {
      return { module, actions: { ...standardOps } }
    }
    return { module, actions: { ...readOnly } }
  }),

  'Payroll Specialist': allModules.map((module) => {
    if (module === 'payroll' || module === 'expenses') {
      return { module, actions: { ...fullAccess } }
    }
    if (['employees', 'attendance', 'leaves'].includes(module)) {
      return { module, actions: { ...readOnly } }
    }
    return { module, actions: { ...noAccess } }
  }),

  'Recruiter': allModules.map((module) => {
    if (['recruitment', 'onboarding'].includes(module)) {
      return { module, actions: { ...fullAccess } }
    }
    if (['employees', 'admin'].includes(module)) {
      return { module, actions: { ...readOnly } }
    }
    return { module, actions: { ...noAccess } }
  }),

  'General Employee': allModules.map((module) => {
    if (['leaves', 'expenses', 'attendance', 'learning'].includes(module)) {
      return { module, actions: { ...employeeAccess } }
    }
    return { module, actions: { ...noAccess } }
  }),
}

export const demoUsers = {
  admin: {
    id: 'user-admin-1',
    employeeId: 'emp-2',
    name: 'Priya Sharma',
    email: 'priya.sharma@agam.internal',
    role: 'Super Admin' as SystemRoleType,
    department: 'Human Resources',
    designation: 'Head of People Operations',
    permissions: rolePermissionProfiles['Super Admin'],
  },
  manager: {
    id: 'user-mgr-1',
    employeeId: 'emp-1',
    name: 'Sarah Connor',
    email: 'sarah.connor@agam.internal',
    role: 'Department Manager' as SystemRoleType,
    department: 'Engineering',
    designation: 'VP of Engineering',
    permissions: rolePermissionProfiles['Department Manager'],
  },
  employee: {
    id: 'user-emp-1',
    employeeId: 'emp-4',
    name: 'David Kim',
    email: 'david.kim@agam.internal',
    role: 'General Employee' as SystemRoleType,
    department: 'Engineering',
    designation: 'Senior Frontend Engineer',
    permissions: rolePermissionProfiles['General Employee'],
  },
}

export interface ZohoAccountProfile extends AuthUser {
  zohoId: string
  zohoAccountType: string
  verified: boolean
  hasPortalAccess: boolean
}

export const zohoDirectoryAccounts: Record<string, ZohoAccountProfile> = {
  'priya.sharma@agamtechnologies.zohomail.com': {
    id: 'zoho-user-001',
    zohoId: 'ZOHO-DIR-78901',
    zohoAccountType: 'Zoho One Enterprise Admin',
    employeeId: 'emp-2',
    name: 'Priya Sharma',
    email: 'priya.sharma@agamtechnologies.zohomail.com',
    role: 'Super Admin',
    department: 'Human Resources',
    designation: 'Head of People Operations',
    authProvider: 'zoho',
    verified: true,
    hasPortalAccess: true,
    permissions: rolePermissionProfiles['Super Admin'],
  },
  'sarah.connor@agamtechnologies.zohomail.com': {
    id: 'zoho-user-002',
    zohoId: 'ZOHO-DIR-78902',
    zohoAccountType: 'Zoho Directory Manager',
    employeeId: 'emp-1',
    name: 'Sarah Connor',
    email: 'sarah.connor@agamtechnologies.zohomail.com',
    role: 'Department Manager',
    department: 'Engineering',
    designation: 'VP of Engineering',
    authProvider: 'zoho',
    verified: true,
    hasPortalAccess: true,
    permissions: rolePermissionProfiles['Department Manager'],
  },
  'david.kim@agamtechnologies.zohomail.com': {
    id: 'zoho-user-003',
    zohoId: 'ZOHO-DIR-78903',
    zohoAccountType: 'Zoho Workplace Standard',
    employeeId: 'emp-4',
    name: 'David Kim',
    email: 'david.kim@agamtechnologies.zohomail.com',
    role: 'General Employee',
    department: 'Engineering',
    designation: 'Senior Frontend Engineer',
    authProvider: 'zoho',
    verified: true,
    hasPortalAccess: true,
    permissions: rolePermissionProfiles['General Employee'],
  },
  'alex.guest@othercorp.zohomail.com': {
    id: 'zoho-user-999',
    zohoId: 'ZOHO-EXT-99999',
    zohoAccountType: 'External Zoho Identity',
    name: 'Alex Guest',
    email: 'alex.guest@othercorp.zohomail.com',
    role: 'General Employee',
    department: 'External',
    designation: 'Guest Visitor',
    authProvider: 'zoho',
    verified: false,
    hasPortalAccess: false,
    permissions: [],
  },
}
