<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Users,
  UserCheck,
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  TrendingUp,
  CalendarCheck,
  Fingerprint,
} from '@lucide/vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiQuery, useApiMutation } from '@/redux/vueAdapter'
import { usePermissions } from '@/composables/usePermissions'
import type { HRMSStats, LeaveRequest, AttendanceRecord, Employee } from '@/types/hrms'

// Access follows HR Administration -> Roles & Permissions.
const { user: authUser, can, hasEmployeeProfile } = usePermissions()
// Whose records the backend returns: all (Super Admin/HR), team (managers), own (General Employee).
const canViewOrganization = computed(() => authUser.value?.dataScope === 'all')
const canViewAllAttendance = computed(() => can('attendance', 'view'))
const canViewAllLeaves = computed(() => can('leaves', 'view'))
// Logins without an employee profile cannot punch attendance.
const currentUserId = computed(() => authUser.value?.employeeId || '')
const currentUserName = computed(() => authUser.value?.name || '')

// Fetch stats, leaves, attendance, and employees via Redux Toolkit API
const { data: stats } = useApiQuery<HRMSStats>(hrmsApi.endpoints.getStats)
const { data: employees } = useApiQuery<Employee[]>(hrmsApi.endpoints.getEmployees)
const { data: leaves, isLoading: leavesLoading } = useApiQuery<LeaveRequest[]>(hrmsApi.endpoints.getLeaveRequests)
const { data: attendance, isLoading: attendanceLoading } = useApiQuery<AttendanceRecord[]>(hrmsApi.endpoints.getAttendance)

const [updateLeaveStatus, { isLoading: updatingStatus }] = useApiMutation(
  hrmsApi.endpoints.updateLeaveStatus
)

const [recordAttendance, { isLoading: punchingAttendance }] = useApiMutation(
  hrmsApi.endpoints.recordAttendance
)

// The backend already limits the employee list to the user's scope (own, or own + team).
const teamIds = computed(() => new Set((employees.value || []).map((e) => e.id)))

// Headcount & Presence Metrics
const scopedHeadcount = computed(() => {
  if (canViewOrganization.value) return stats.value?.totalEmployees ?? (employees.value ? employees.value.length : '—')
  return (employees.value || []).filter((e) => teamIds.value.has(e.id)).length
})

const scopedActive = computed(() => {
  if (canViewOrganization.value) return stats.value?.activeEmployees ?? (employees.value || []).filter((e) => e.status === 'Active').length
  return (employees.value || []).filter((e) => teamIds.value.has(e.id) && e.status === 'Active').length
})

// Daily Attendance Register: latest 5 records the user may see
const dailyAttendanceRegister = computed(() => {
  const all = attendance.value || []
  const list = canViewAllAttendance.value ? all : all.filter((a) => teamIds.value.has(a.employeeId))
  return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)
})

// Leave Management Top 5: pending first, then latest applied
const top5Leaves = computed(() => {
  const all = leaves.value || []
  const list = canViewAllLeaves.value ? all : all.filter((l) => teamIds.value.has(l.employeeId))

  return [...list]
    .sort((a, b) => {
      if (a.status === 'Pending' && b.status !== 'Pending') return -1
      if (a.status !== 'Pending' && b.status === 'Pending') return 1
      return new Date(b.appliedOn || b.startDate).getTime() - new Date(a.appliedOn || a.startDate).getTime()
    })
    .slice(0, 5)
})

const today = new Date().toISOString().split('T')[0]
const userAttendanceToday = computed(() => {
  return (attendance.value || []).find(
    (a) => a.employeeId === currentUserId.value && a.date === today
  )
})

const punchError = ref('')
const handlePunch = async () => {
  punchError.value = ''
  if (!hasEmployeeProfile.value) {
    punchError.value = "Your login isn't linked to an employee profile. Add yourself as an employee with your login email."
    return
  }
  const { error } = await recordAttendance({
    employeeId: currentUserId.value,
    employeeName: currentUserName.value,
  })
  if (error) {
    punchError.value = error?.data || 'Could not record attendance'
    setTimeout(() => (punchError.value = ''), 6000)
  }
}

const handleApprove = async (id: string) => {
  await updateLeaveStatus({ id, status: 'Approved' })
}

const handleReject = async (id: string) => {
  await updateLeaveStatus({ id, status: 'Rejected' })
}
</script>

<template>
  <div class="space-y-8 max-w-7xl mx-auto">
    <!-- Welcome Header & Quick Punch (AGAM Technologies Brand Palette) -->
    <div class="relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-[#044663] via-[#095f87] to-[#1989d9] text-white shadow-xl shadow-[#044663]/20">
      <!-- Subtle Decorative Logo Backdrop / Watermark -->
      <div class="absolute -right-8 -bottom-10 opacity-10 pointer-events-none w-72 h-72">
        <svg viewBox="20 20 570 510" class="w-full h-full fill-white">
          <path d="M300.773 405.515C278.722 425.804 238.86 441.019 204.088 441.019C154.049 441.019 124.364 416.504 124.364 378.461C124.364 366.625 126.909 353.945 132.846 344.644C144.719 324.355 160.833 315.902 204.935 308.293C238.86 301.531 273.633 292.23 289.748 286.312C299.924 282.086 309.254 277.859 327.913 266.869L328.761 323.511C328.761 359.863 319.431 387.761 300.773 405.515M389.247 420.942C407.055 392.749 419.509 354.462 419.509 321.146L419.509 190.783C419.509 142.595 412.724 118.078 394.066 89.335C384.736 75.808 373.711 64.818 361.838 57.209C334.698 40.302 291.443 30.157 246.494 30.157C139.632 30.157 54.8192 80.881 54.8192 147.667C54.8192 186.556 80.2627 211.072 117.581 211.072C153.2 211.072 175.252 189.093 175.252 153.585C175.252 145.131 171.011 137.523 159.137 125.687C171.86 109.624 210.025 95.252 243.95 95.252C291.443 95.252 325.368 123.151 325.368 164.576C325.368 182.328 318.583 200.928 305.862 210.226C292.293 221.218 276.178 226.289 232.076 233.898L183.734 243.199C133.695 251.652 124.364 254.187 104.01 263.488C87.8961 269.406 76.0221 277.013 66.6932 285.468C43.7949 304.911 30.2244 339.574 30.2244 378.461C30.2244 468.074 85.353 517.953 184.581 517.953C218.505 517.953 257.384 514.766 288.782 501.28C333.129 482.231 364.259 460.502 389.247 420.942" />
        </svg>
      </div>

      <div class="relative z-10">
        <div class="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-xs text-[11px] font-semibold text-sky-100 mb-2 border border-white/20">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{{ canViewOrganization ? 'Full Organization View' : 'My Team Hub' }}</span>
        </div>
        <h1 class="text-2xl md:text-3xl font-extrabold tracking-tight">
          Welcome back{{ currentUserName ? `, ${currentUserName}` : '' }} 👋
        </h1>
        <p class="text-sky-100 text-sm mt-1 max-w-xl">
          Here is your internal HR operational summary for today, {{ new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }) }}.
        </p>
      </div>

      <!-- Quick Attendance Punch Clock -->
      <div class="relative z-10 flex items-center gap-3 bg-white/10 backdrop-blur-md p-2.5 rounded-2xl border border-white/20 self-start md:self-auto shadow-inner">
        <div class="text-right px-2">
          <p class="text-[11px] font-medium text-sky-100 uppercase tracking-wider">Attendance Status</p>
          <p class="text-sm font-bold">
            {{ userAttendanceToday ? (userAttendanceToday.checkOut ? 'Shift Completed' : 'Punched In') : 'Not Checked In' }}
          </p>
        </div>
        <button
          @click="handlePunch"
          :disabled="!hasEmployeeProfile || punchingAttendance || (userAttendanceToday && !!userAttendanceToday.checkOut)"
          :title="hasEmployeeProfile ? '' : 'Your login isn\'t linked to an employee profile. Add yourself as an employee with your login email.'"
          class="px-4 py-2 rounded-xl bg-white text-[#044663] font-bold text-xs shadow-md hover:bg-sky-50 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <span v-if="punchingAttendance">Syncing...</span>
          <span v-else-if="!userAttendanceToday">Clock In</span>
          <span v-else-if="!userAttendanceToday.checkOut">Clock Out</span>
          <span v-else>Completed</span>
        </button>
      </div>
    </div>

    <!-- Stat Cards Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-[#1989d9]/10 dark:bg-[#1989d9]/20 text-[#1989d9] dark:text-[#38a5e4] flex items-center justify-center shrink-0">
          <Users class="w-6 h-6" />
        </div>
        <div>
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {{ canViewOrganization ? 'Total Headcount' : 'Team Members' }}
          </p>
          <p class="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
            {{ scopedHeadcount }}
          </p>
          <div class="flex items-center text-emerald-600 dark:text-emerald-400 text-xs font-semibold gap-1 mt-1">
            <TrendingUp class="w-3.5 h-3.5" />
            <span>Active: {{ scopedActive }}</span>
          </div>
        </div>
      </div>

      <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <UserCheck class="w-6 h-6" />
        </div>
        <div>
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Present Today</p>
          <p class="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
            {{ stats?.presentToday ?? '...' }}
          </p>
          <p class="text-xs text-slate-400 mt-1">Logged into office</p>
        </div>
      </div>

      <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-[#0e6db3] dark:text-[#38a5e4] flex items-center justify-center shrink-0">
          <CalendarDays class="w-6 h-6" />
        </div>
        <div>
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">On Leave</p>
          <p class="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
            {{ stats?.onLeaveToday ?? '...' }}
          </p>
          <p class="text-xs text-[#0e6db3] dark:text-[#38a5e4] mt-1 font-medium">Scheduled leaves</p>
        </div>
      </div>

      <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
          <Clock class="w-6 h-6" />
        </div>
        <div>
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pending Leaves</p>
          <p class="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
            {{ stats?.pendingLeaveRequests ?? '...' }}
          </p>
          <p class="text-xs text-rose-500 dark:text-rose-400 mt-1 font-medium">Requires approval</p>
        </div>
      </div>
    </div>

    <!-- Main Dashboard Panels: Daily Attendance Register & Leave Management Top 5 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 1. Daily Attendance Register Panel -->
      <div class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-[#044663]/10 dark:bg-[#1989d9]/20 text-[#044663] dark:text-[#38a5e4] flex items-center justify-center">
                <Clock class="w-5 h-5" />
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="text-base font-bold text-slate-900 dark:text-white">Daily Attendance Register</h2>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1989d9]/10 text-[#0e6db3] dark:text-[#38a5e4]">
                    Top 5
                  </span>
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Latest punch logs and presence records
                </p>
              </div>
            </div>

            <RouterLink
              to="/attendance"
              class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1989d9] dark:text-[#38a5e4] hover:underline"
            >
              <span>Full Register</span>
              <ArrowRight class="w-3.5 h-3.5" />
            </RouterLink>
          </div>

          <!-- Loading State -->
          <div v-if="attendanceLoading" class="py-12 text-center text-slate-400 text-xs">
            <div class="w-6 h-6 border-2 border-[#1989d9] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <span>Loading daily attendance records...</span>
          </div>

          <!-- Empty State -->
          <div v-else-if="dailyAttendanceRegister.length === 0" class="py-12 text-center text-slate-400 text-xs">
            No attendance punches logged yet for today.
          </div>

          <!-- Attendance Records List -->
          <div v-else class="divide-y divide-slate-100 dark:divide-slate-800/80 mt-2 space-y-1">
            <div
              v-for="record in dailyAttendanceRegister"
              :key="record.id"
              class="py-3 flex items-center justify-between gap-3 group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-2 rounded-xl transition-colors"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#044663] to-[#1989d9] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  {{ record.employeeName.split(' ').map(n => n[0]).join('') }}
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <p class="text-xs font-bold text-slate-900 dark:text-white truncate">{{ record.employeeName }}</p>
                    <span
                      :class="[
                        'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                        record.status === 'Present'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50'
                          : record.status === 'Late'
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/50'
                          : record.status === 'Half Day'
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200/50'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200/50'
                      ]"
                    >
                      {{ record.status }}
                    </span>
                  </div>
                  <div class="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    <span>{{ record.shift }}</span>
                    <span>•</span>
                    <span class="font-mono text-slate-600 dark:text-slate-300">In: {{ record.checkIn }}</span>
                    <span v-if="record.checkOut" class="font-mono text-slate-600 dark:text-slate-300">| Out: {{ record.checkOut }}</span>
                  </div>
                </div>
              </div>

              <div class="text-right shrink-0">
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700">
                  <Fingerprint class="w-3 h-3 text-[#1989d9]" />
                  <span>{{ record.source }}</span>
                </span>
                <p v-if="record.workHours" class="text-[10px] text-slate-400 mt-1 font-mono">
                  {{ record.workHours }}h total
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
          <RouterLink
            to="/attendance"
            class="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
          >
            <Clock class="w-4 h-4 text-[#1989d9]" />
            <span>Open Attendance Module</span>
          </RouterLink>
        </div>
      </div>

      <!-- 2. Leave Management (Top 5) Panel -->
      <div class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-[#1989d9]/10 dark:bg-[#1989d9]/20 text-[#0e6db3] dark:text-[#38a5e4] flex items-center justify-center">
                <CalendarCheck class="w-5 h-5" />
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="text-base font-bold text-slate-900 dark:text-white">Leave Management</h2>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1989d9]/10 text-[#0e6db3] dark:text-[#38a5e4] border border-[#1989d9]/20">
                    Top 5
                  </span>
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Recent leave applications & approval requests
                </p>
              </div>
            </div>

            <RouterLink
              to="/leaves"
              class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1989d9] dark:text-[#38a5e4] hover:underline"
            >
              <span>Manage Leaves</span>
              <ArrowRight class="w-3.5 h-3.5" />
            </RouterLink>
          </div>

          <!-- Loading State -->
          <div v-if="leavesLoading" class="py-12 text-center text-slate-400 text-xs">
            <div class="w-6 h-6 border-2 border-[#1989d9] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <span>Loading leave requests...</span>
          </div>

          <!-- Empty State -->
          <div v-else-if="top5Leaves.length === 0" class="py-12 text-center text-slate-400 text-xs">
            No leave requests found. All team requests are cleared! 🎉
          </div>

          <!-- Leave Requests List -->
          <div v-else class="divide-y divide-slate-100 dark:divide-slate-800/80 mt-2 space-y-1">
            <div
              v-for="req in top5Leaves"
              :key="req.id"
              class="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-2 rounded-xl transition-colors"
            >
              <div class="flex items-start gap-3 min-w-0">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#044663] to-[#1989d9] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs mt-0.5 sm:mt-0">
                  {{ req.employeeName.split(' ').map(n => n[0]).join('') }}
                </div>
                <div class="min-w-0 space-y-0.5">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span class="font-bold text-xs text-slate-900 dark:text-white">{{ req.employeeName }}</span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {{ req.department }}
                    </span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-[#1989d9]/10 text-[#0e6db3] dark:text-[#38a5e4]">
                      {{ req.leaveType }}
                    </span>
                    <span
                      :class="[
                        'text-[10px] px-1.5 py-0.5 rounded font-semibold',
                        req.status === 'Approved'
                          ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                          : req.status === 'Pending'
                          ? 'bg-sky-50 dark:bg-sky-950 text-[#0e6db3] dark:text-[#38a5e4] border border-sky-200/50'
                          : 'bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                      ]"
                    >
                      {{ req.status }}
                    </span>
                  </div>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400">
                    {{ req.startDate }} to {{ req.endDate }} ({{ req.daysCount }} {{ req.daysCount === 1 ? 'day' : 'days' }}) • "{{ req.reason }}"
                  </p>
                </div>
              </div>

              <!-- Quick Approval Actions: only when the signed-in user can act on this request -->
              <div
                v-if="req.status === 'Pending' && req.canAct"
                class="flex items-center gap-1.5 shrink-0 self-end sm:self-center"
              >
                <button
                  @click="handleApprove(req.id)"
                  :disabled="updatingStatus"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 class="w-3.5 h-3.5" />
                  <span>Approve</span>
                </button>
                <button
                  @click="handleReject(req.id)"
                  :disabled="updatingStatus"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[11px] font-bold hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <XCircle class="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
          <RouterLink
            to="/leaves"
            class="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
          >
            <CalendarCheck class="w-4 h-4 text-[#1989d9]" />
            <span>Open Leave Management</span>
          </RouterLink>
        </div>
      </div>
    </div>
    <!-- Clock-in errors from the server -->
    <div v-if="punchError" class="fixed bottom-6 right-6 z-50 max-w-md px-4 py-3 rounded-xl bg-rose-600 text-white text-sm shadow-lg" role="alert">
      {{ punchError }}
    </div>
  </div>
</template>
