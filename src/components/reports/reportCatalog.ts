import type { PermissionModule } from '@/composables/usePermissions'

/** A report served by GET /app/reports/:name (JSON, or CSV with format=csv). */
export interface ReportDefinition {
  name: string
  title: string
  group: 'Attendance' | 'Leave' | 'Payroll' | 'Employees' | 'Projects' | 'Exit'
  description: string
  /** month: ?month=YYYY-MM · range: ?from=&to= · none */
  filter: 'month' | 'range' | 'none'
  department?: boolean
  /** Visible with this module's view permission (managers with a team see team-scoped reports too). */
  permission: PermissionModule
  team?: boolean
}

export const REPORTS: ReportDefinition[] = [
  {
    name: 'attendance_summary', title: 'Attendance summary', group: 'Attendance', filter: 'month', department: true,
    permission: 'attendance', team: true,
    description: 'Per employee: present, late, absent, half days, WFH, on duty, leave and overtime for a month.',
  },
  {
    name: 'missing_punches', title: 'Missed check-outs', group: 'Attendance', filter: 'range', department: true,
    permission: 'attendance', team: true,
    description: 'Days with a check-in but no check-out, and whether a regularization was requested.',
  },
]
