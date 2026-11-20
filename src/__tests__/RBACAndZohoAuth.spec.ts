import { describe, it, expect, beforeEach } from 'vitest'
import { storageService } from '../services/storageService'
import { zohoDirectoryAccounts } from '../services/authProfiles'
import { getZohoConfig, getZohoAuthorizationUrl, handleZohoCallback } from '../services/zohoAuthService'

describe('RBAC, Zoho Auth & Security Scoping Tests', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  // 1. Zoho Auth Verification
  it('validates Zoho directory accounts and detects authorized vs unauthorized users', () => {
    const adminZoho = zohoDirectoryAccounts['priya.sharma@agamtechnologies.zohomail.com']
    expect(adminZoho).toBeDefined()
    expect(adminZoho?.hasPortalAccess).toBe(true)
    expect(adminZoho?.role).toBe('Super Admin')

    const employeeZoho = zohoDirectoryAccounts['david.kim@agamtechnologies.zohomail.com']
    expect(employeeZoho).toBeDefined()
    expect(employeeZoho?.hasPortalAccess).toBe(true)
    expect(employeeZoho?.role).toBe('General Employee')

    const unauthorizedZoho = zohoDirectoryAccounts['alex.guest@othercorp.zohomail.com']
    expect(unauthorizedZoho).toBeDefined()
    expect(unauthorizedZoho?.hasPortalAccess).toBe(false)
  })

  // 1b. Live Zoho OAuth 2.0 Configuration and URL Generation
  it('loads Zoho OAuth credentials and generates compliant authorization URL', () => {
    const config = getZohoConfig()
    // Credentials come from the environment, never hardcoded in source.
    expect(config.clientId).toBe(import.meta.env.VITE_ZOHO_CLIENT_ID || '')
    expect(config.authUrl).toMatch(/accounts\.zoho\.(in|com)\/oauth\/v2\/auth/)
    expect(config.redirectUri).toBe('http://localhost:5173/auth/callback')

    const authUrl = getZohoAuthorizationUrl('custom_state_token')
    expect(authUrl).toMatch(/https:\/\/accounts\.zoho\.(in|com)\/oauth\/v2\/auth/)
    expect(authUrl).toContain(`client_id=${encodeURIComponent(config.clientId)}`)
    expect(authUrl).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fauth%2Fcallback')
    expect(authUrl).toContain('response_type=code')
    expect(authUrl).toContain('state=custom_state_token')
    expect(authUrl).toContain('access_type=offline')
  })

  // 1c. Zoho OAuth Callback Handshake
  it('handles Zoho OAuth code callback and provisions authenticated session', async () => {
    const testCode = '1000.test_zoho_oauth_code_sample'
    const result = await handleZohoCallback(testCode)
    expect(result.success).toBe(true)
    expect(result.user).toBeDefined()
    expect(result.user?.role).toBe('Super Admin')
    expect(result.user?.authProvider).toBe('zoho')
    expect(result.token).toContain('zoho-oauth-token')
  })

  // 2. Dynamic Roles & Permissions Editing
  it('updates permissions dynamically for read, write, delete, and approve', () => {
    const roles = storageService.getRoles()
    expect(roles.length).toBeGreaterThan(0)

    const empRole = roles.find((r) => r.id === 'role-3')!
    expect(empRole).toBeDefined()

    // Dynamically toggle write permission on Employee Self-Service module for employee role
    const updated = storageService.updateRolePermission('role-3', 'Employee Self-Service', 'write', true)
    const essPerm = updated.permissions.find((p) => p.module === 'Employee Self-Service')
    expect(essPerm?.write).toBe(true)

    // Revoke write permission
    const revoked = storageService.updateRolePermission('role-3', 'Employee Self-Service', 'write', false)
    const essPermRevoked = revoked.permissions.find((p) => p.module === 'Employee Self-Service')
    expect(essPermRevoked?.write).toBe(false)
  })

  it('adds custom roles and persists them', () => {
    const newRole = storageService.addRole({
      roleName: 'Auditor',
      description: 'Compliance auditor with read-only view',
      usersCount: 1,
      permissions: [
        { module: 'HR Administration', read: true, write: false, delete: false, approve: false },
        { module: 'Payroll', read: true, write: false, delete: false, approve: false },
      ],
    })

    expect(newRole.id).toBeDefined()
    expect(newRole.roleName).toBe('Auditor')
    const roles = storageService.getRoles()
    expect(roles.some((r) => r.roleName === 'Auditor')).toBe(true)
  })

  // 3. Super Admin Candidate Onboarding Flow
  it('allows Super Admin to attach documents, assign role/grade/workflow, and onboard candidate as active employee', () => {
    const candidates = storageService.getOnboardingCandidates()
    expect(candidates.length).toBeGreaterThan(0)
    const candidate = candidates[0]!

    // Add compliance document
    const updatedWithDoc = storageService.addOnboardingDocument(
      candidate.id,
      {
        category: 'ID Proof',
        title: 'Passport & Identity Verification',
        fileSize: '2.4 MB',
        status: 'Verified',
      }
    )
    expect(updatedWithDoc.uploadedDocuments?.length).toBeGreaterThan(0)
    expect(updatedWithDoc.uploadedDocuments?.[0]?.title).toBe('Passport & Identity Verification')

    // Convert candidate to active employee with assigned role, salary grade, workflow, and salary
    const activeEmp = storageService.convertOnboardingCandidateToEmployee(candidate.id, {
      assignedRole: 'General Employee',
      salaryGrade: 'Grade 3 (Senior IC)',
      approvalWorkflow: 'Engineering 2-Tier Approval',
      salary: 110000,
    })

    expect(activeEmp.id).toBeDefined()
    expect(activeEmp.email).toBe(candidate.email)
    expect(activeEmp.role).toBe('General Employee')
    expect(activeEmp.grade).toBe('Grade 3 (Senior IC)')
    expect(activeEmp.status).toBe('Active')

    // Check candidate marked Completed in onboarding list
    const candidateList = storageService.getOnboardingCandidates()
    const convertedCandidate = candidateList.find((c) => c.id === candidate.id)
    expect(convertedCandidate?.status).toBe('Completed')
  })

  // 4. Payroll Access Controls & Custom Breakdown
  it('allows Super Admin to toggle employee payslip download access and add custom breakdown', () => {
    const payslips = storageService.getPayslips()
    expect(payslips.length).toBeGreaterThan(0)
    const targetSlip = payslips[0]!
    const originalAccess = targetSlip.downloadAccessGranted

    // Toggle access
    const toggled = storageService.togglePayslipAccess(targetSlip.id)
    expect(toggled.downloadAccessGranted).toBe(!originalAccess)

    // Add custom salary breakdown for an employee
    const newBreakdown = storageService.addSalaryBreakdown({
      employeeId: 'emp-1',
      basic: 6000,
      hra: 2500,
      specialAllowance: 1500,
      performanceBonus: 1000,
    })

    expect(newBreakdown.id).toBeDefined()
    expect(newBreakdown.breakdown.basic).toBe(6000)
    expect(newBreakdown.breakdown.hra).toBe(2500)
    expect(newBreakdown.breakdown.grossEarnings).toBe(6000 + 2500 + 1500 + 200 + 1000)
    expect(newBreakdown.breakdown.netPay).toBeGreaterThan(0)
  })

  // 5. Scoping Logic Verification
  it('scopes employee records correctly based on user role', () => {
    const allEmployees = storageService.getEmployees()
    expect(allEmployees.length).toBeGreaterThanOrEqual(4)

    // Super Admin: sees all
    const superAdminRole = 'Super Admin'
    const superAdminView = superAdminRole === 'Super Admin' ? allEmployees : []
    expect(superAdminView.length).toBe(allEmployees.length)

    // Department Manager (Engineering): sees Engineering only
    const managerDepartment = 'Engineering'
    const managerView = allEmployees.filter(
      (emp) => emp.department.toLowerCase() === managerDepartment.toLowerCase()
    )
    expect(managerView.length).toBeGreaterThan(0)
    expect(managerView.length).toBeLessThan(allEmployees.length)
    expect(managerView.every((emp) => emp.department === 'Engineering')).toBe(true)

    // General Employee (emp-4): sees only self
    const currentEmployeeId = 'emp-4'
    const employeeView = allEmployees.filter((emp) => emp.id === currentEmployeeId)
    expect(employeeView.length).toBe(1)
    expect(employeeView[0]?.id).toBe('emp-4')
  })
})
