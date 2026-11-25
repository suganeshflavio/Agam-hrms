import type { AttendanceDayStatus } from '@/types/hrms'

export const STATUS_LABELS: Record<AttendanceDayStatus, string> = {
  present: 'Present',
  late: 'Late',
  half_day: 'Half Day',
  absent: 'Absent',
  wfh: 'Work from home',
  on_leave: 'On Leave',
  holiday: 'Holiday',
  weekly_off: 'Weekly Off',
  not_marked: 'Not marked',
  upcoming: 'Upcoming',
}

/** Marked = green, missed = red, non-working days neutral. */
export const STATUS_BADGE: Record<AttendanceDayStatus, string> = {
  present: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  late: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  half_day: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  absent: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
  wfh: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
  on_leave: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
  holiday: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
  weekly_off: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  not_marked: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  upcoming: 'bg-white text-slate-400 dark:bg-slate-900',
}
