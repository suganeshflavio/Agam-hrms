import { describe, it, expect, beforeEach } from 'vitest'
import { storageService } from '../services/storageService'

describe('Phase 2 - Core HR & Employee Management Service Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('retrieves default departments and adds a new department unit', () => {
    const initialDepts = storageService.getDepartments()
    expect(initialDepts.length).toBeGreaterThanOrEqual(5)

    const newDept = storageService.addDepartment({
      name: 'Cybersecurity & SecOps',
      code: 'SEC',
      head: 'Alex Rivera',
      budget: 240000,
    })

    expect(newDept.id).toBeDefined()
    expect(newDept.code).toBe('SEC')

    const updatedDepts = storageService.getDepartments()
    expect(updatedDepts.some((d) => d.code === 'SEC')).toBe(true)
  })

  it('retrieves default designations and registers a new designation', () => {
    const initialDesigs = storageService.getDesignations()
    expect(initialDesigs.length).toBeGreaterThanOrEqual(8)

    const newDesig = storageService.addDesignation({
      title: 'Senior SecOps Engineer',
      code: 'SR-SECOPS',
      departmentId: 'dept-1',
      departmentName: 'Engineering',
      grade: 'Professional / Lead (P1-P3)',
      description: 'Zero trust security and penetration testing',
    })

    expect(newDesig.id).toBeDefined()
    expect(newDesig.title).toBe('Senior SecOps Engineer')

    const updated = storageService.getDesignations()
    expect(updated.some((d) => d.code === 'SR-SECOPS')).toBe(true)
  })

  it('records transfer and promotion lifecycle events with compensation adjustment', () => {
    const employees = storageService.getEmployees()
    const emp = employees[0]!

    const previousRole = emp.designation
    const previousSalary = emp.salary

    const updated = storageService.recordTransferPromotion(emp.id, {
      type: 'Promotion',
      newRole: 'Distinguished Fellow Architect',
      newDepartment: 'Engineering',
      newSalary: 175000,
    })

    expect(updated.designation).toBe('Distinguished Fellow Architect')
    expect(updated.salary).toBe(175000)
    expect(updated.history?.length).toBeGreaterThan(0)
    expect(updated.history?.[0]?.previousRole).toBe(previousRole)
    expect(updated.history?.[0]?.previousSalary).toBe(previousSalary)
  })

  it('attaches employee compliance documents and manages verification lifecycle', () => {
    const employees = storageService.getEmployees()
    const emp = employees[0]!

    const doc = storageService.addEmployeeDocument(emp.id, {
      title: 'State_Driver_License.pdf',
      category: 'ID Proof',
      fileSize: '2.1 MB',
    })

    expect(doc.id).toBeDefined()
    expect(doc.status).toBe('Pending')

    const verified = storageService.verifyEmployeeDocument(emp.id, doc.id, 'Verified')
    expect(verified.status).toBe('Verified')
  })

  it('manages pre-boarding candidates and converts completed candidate into active employee', () => {
    const candidate = storageService.addOnboardingCandidate({
      candidateName: 'Clara Oswald',
      email: 'clara.oswald@example.com',
      jobTitle: 'Junior Frontend Developer',
      department: 'Engineering',
      joiningDate: '2026-12-01',
      assignedBuddy: 'Sarah Connor',
    })

    expect(candidate.id).toBeDefined()
    expect(candidate.tasks.length).toBe(5)
    expect(candidate.progressPercentage).toBe(0)

    // Complete all tasks
    candidate.tasks.forEach((t) => {
      storageService.toggleOnboardingTask(candidate.id, t.id)
    })

    // Convert candidate to active employee
    const newEmp = storageService.convertOnboardingCandidateToEmployee(candidate.id, 92000)
    expect(newEmp.firstName).toBe('Clara')
    expect(newEmp.lastName).toBe('Oswald')
    expect(newEmp.status).toBe('Active')
    expect(newEmp.employeeCode).toMatch(/^AGM-\d+/)
    expect(newEmp.documents?.length).toBeGreaterThanOrEqual(2)

    // Verify candidate state updated
    const candList = storageService.getOnboardingCandidates()
    const updatedCand = candList.find((c) => c.id === candidate.id)
    expect(updatedCand?.status).toBe('Completed')
  })
})
