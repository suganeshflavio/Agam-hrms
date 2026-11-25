<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import {
  UserCheck,
  Calendar,
  Clock,
  Banknote,
  Receipt,
  FileText,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  CalendarPlus,
  Printer,
  X,
  Eye,
  Check,
  Award,
  Layers,
  MapPin,
  ChevronRight,
  Landmark,
  DoorOpen,
  Home,
} from '@lucide/vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiQuery, useApiMutation, useAppSelector } from '@/redux/vueAdapter'
import type { Employee, LeaveRequest, Payslip, AttendanceRecord, LeaveBalance, LeaveTypePolicy } from '@/types/hrms'
import { useMoney } from '@/composables/useMoney'
import FormInput from '@/components/forms/FormInput.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormTextarea from '@/components/forms/FormTextarea.vue'
import AppLogo from '@/components/common/AppLogo.vue'
import ResignationPanel from '@/components/requests/ResignationPanel.vue'
import RemoteWorkRequests from '@/components/requests/RemoteWorkRequests.vue'
import PunchControl from '@/components/attendance/PunchControl.vue'
import { usePunch } from '@/composables/usePunch'

const router = useRouter()
const currentUser = useAppSelector((state) => state.auth.user)
// The signed-in user's employee record (none for admin-only logins).
const currentUserId = computed(() => currentUser.value?.employeeId || '')
const currentUserName = computed(() => currentUser.value?.name || '')
const hasEmployeeProfile = computed(() => !!currentUserId.value)
const NO_PROFILE_MESSAGE = "Your login isn't linked to an employee profile."

// Redux Queries & Mutations
const { data: employees } = useApiQuery<Employee[]>(hrmsApi.endpoints.getEmployees)
const { data: leaves } = useApiQuery<LeaveRequest[]>(hrmsApi.endpoints.getLeaveRequests)
const { data: payslips } = useApiQuery<Payslip[]>(hrmsApi.endpoints.getPayslips)
const { data: attendance } = useApiQuery<AttendanceRecord[]>(hrmsApi.endpoints.getAttendance)
const { data: leaveBalances } = useApiQuery<LeaveBalance[]>(hrmsApi.endpoints.getLeaveBalances)
const { data: leavePolicies } = useApiQuery<LeaveTypePolicy[]>(hrmsApi.endpoints.getLeavePolicies)
const { company, formatMoney } = useMoney()

// Clock In / Clock Out with a work location (shared control).
const { statusLabel: punchStatus } = usePunch()
const [applyLeave, { isLoading: isApplyingLeave }] = useApiMutation(hrmsApi.endpoints.applyLeave)

// Tab & Modal State
type EssTab = 'overview' | 'leaves' | 'payslips' | 'attendance' | 'wfh' | 'resignation'
const activeTab = ref<EssTab>('overview')
const isLeaveModalOpen = ref(false)
const selectedPayslip = ref<Payslip | null>(null)
const notification = ref('')

const showNotification = (msg: string) => {
  notification.value = msg
  setTimeout(() => {
    notification.value = ''
  }, 3500)
}

const handlePrint = () => {
  window.print()
}

// Current User's Specific Records
const myEmployeeProfile = computed(() => {
  if (!currentUserId.value) return undefined
  return (employees.value || []).find((e) => e.id === currentUserId.value)
})

const myManager = computed(() => {
  const managerId = myEmployeeProfile.value?.reportingManagerId
  return managerId ? (employees.value || []).find((e) => e.id === managerId) : undefined
})

const maskedAccount = computed(() => {
  const number = myEmployeeProfile.value?.bankDetails?.accountNumber || ''
  const digits = number.replace(/\D/g, '')
  return digits ? `•••• ${digits.slice(-4)}` : number
})

const myLeaves = computed(() => {
  return (leaves.value || []).filter((l) => l.employeeId === currentUserId.value)
})

// Own payslips only (matched by employee id), latest first.
const payslipSortKey = (p: Payslip) => p.paymentDate || (Date.parse(`1 ${p.monthYear}`) ? new Date(`1 ${p.monthYear}`).toISOString() : '')
const myPayslips = computed(() => {
  if (!currentUserId.value) return []
  return (payslips.value || [])
    .filter((p) => p.employeeId === currentUserId.value)
    .slice()
    .sort((a, b) => payslipSortKey(b).localeCompare(payslipSortKey(a)))
})

const myAttendance = computed(() => {
  if (!currentUserId.value) return []
  return (attendance.value || []).filter((a) => a.employeeId === currentUserId.value)
})

const todayStr = new Date().toISOString().split('T')[0] ?? ''
const myAttendanceToday = computed(() => {
  if (!currentUserId.value) return undefined
  return (attendance.value || []).find((a) => a.employeeId === currentUserId.value && a.date === todayStr)
})

const currentShift = computed(() => myAttendanceToday.value?.shift || myEmployeeProfile.value?.shift || '—')

// Leave types come from the company's leave policies.
const leaveTypeOptions = computed(() => (leavePolicies.value || []).map((p) => ({ value: p.name, label: p.name })))

const openLeaveModal = () => {
  if (!hasEmployeeProfile.value) {
    showNotification(NO_PROFILE_MESSAGE)
    return
  }
  isLeaveModalOpen.value = true
}

// Leave Application Form (VeeValidate + Zod)
const selfLeaveSchema = z
  .object({
    leaveType: z.string().min(1, 'Please select a leave type'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    reason: z.string().min(8, 'Reason must be at least 8 characters explaining the leave'),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: 'End date cannot be earlier than start date',
    path: ['endDate'],
  })
type SelfLeaveValues = z.infer<typeof selfLeaveSchema>

const { handleSubmit, resetForm } = useForm<SelfLeaveValues>({
  validationSchema: toTypedSchema(selfLeaveSchema),
  initialValues: {
    leaveType: '',
    startDate: todayStr,
    endDate: todayStr,
    reason: '',
  },
})

const onLeaveSubmit = handleSubmit(async (values) => {
  if (!hasEmployeeProfile.value || !myEmployeeProfile.value) {
    showNotification(NO_PROFILE_MESSAGE)
    return
  }
  const start = new Date(values.startDate)
  const end = new Date(values.endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

  const { error } = await applyLeave({
    employeeId: currentUserId.value,
    employeeName: currentUserName.value,
    department: myEmployeeProfile.value.department,
    leaveType: values.leaveType as LeaveRequest['leaveType'],
    startDate: values.startDate,
    endDate: values.endDate,
    daysCount: days,
    reason: values.reason,
  })
  if (error) {
    showNotification(error?.data || 'The leave request could not be submitted')
    return
  }

  showNotification('Leave application submitted for approval.')
  resetForm()
  isLeaveModalOpen.value = false
})

const formatCurrency = (val: number) => formatMoney(val)
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto">
    <!-- Header Banner -->
    <div class="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-600/10 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
      <div class="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

      <div class="flex items-center gap-4 relative">
        <div class="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-2xl border border-white/20 shadow-md">
          {{ currentUserName.split(' ').filter(Boolean).map(n => n[0]).join('') }}
        </div>
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-2xl font-black">{{ currentUserName }}</h1>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 uppercase tracking-wider">
              {{ myEmployeeProfile?.status || '—' }}
            </span>
          </div>
          <p v-if="myEmployeeProfile" class="text-xs text-indigo-100 mt-1">
            {{ myEmployeeProfile.designation }} • {{ myEmployeeProfile.department }} • Code: <span class="font-bold">{{ myEmployeeProfile.employeeCode }}</span>
          </p>
          <p v-else class="text-xs text-indigo-100 mt-1">{{ NO_PROFILE_MESSAGE }}</p>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row sm:items-start gap-3 self-stretch md:self-auto relative">
        <button
          v-if="myEmployeeProfile"
          @click="router.push(`/employees/${myEmployeeProfile.id}`)"
          class="px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold text-xs border border-white/20 transition-all flex items-center gap-1.5"
        >
          <span>View 360° Profile</span>
          <ChevronRight class="w-3.5 h-3.5" />
        </button>

        <PunchControl button-class="bg-white text-indigo-700 hover:bg-indigo-50" @punched="showNotification" />
      </div>
    </div>

    <!-- Alert Banner -->
    <div
      v-if="notification"
      class="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-medium animate-fadeIn"
    >
      <CheckCircle2 class="w-5 h-5 text-emerald-500 shrink-0" />
      <span>{{ notification }}</span>
    </div>

    <!-- Leave balances (from the backend) -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div
        v-for="balance in leaveBalances || []"
        :key="balance.policyId"
        class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs"
      >
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-xs font-semibold">{{ balance.leaveType }}</span>
          <Calendar class="w-4 h-4 text-indigo-500" />
        </div>
        <p class="text-2xl font-black text-slate-900 dark:text-white mt-1">{{ balance.available }} Days</p>
        <p class="text-[10px] text-slate-400 mt-0.5">
          {{ balance.used }} used of {{ balance.allocated }}<span v-if="balance.pending > 0"> • {{ balance.pending }} pending</span>
        </p>
      </div>
      <div
        v-if="hasEmployeeProfile && !(leaveBalances || []).length"
        class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs text-xs text-slate-400 flex items-center"
      >
        No leave balances yet
      </div>

      <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-xs font-semibold">Latest Net Pay</span>
          <Banknote class="w-4 h-4 text-emerald-500" />
        </div>
        <p class="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
          {{ myPayslips.length ? formatCurrency(myPayslips[0]!.breakdown.netPay) : '—' }}
        </p>
        <p class="text-[10px] text-slate-400 mt-0.5">
          {{ myPayslips.length ? `${myPayslips[0]!.monthYear} • ${myPayslips[0]!.paymentStatus}` : 'No payslips yet' }}
        </p>
      </div>

      <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-xs font-semibold">Shift Status</span>
          <CheckCircle2 class="w-4 h-4 text-purple-500" />
        </div>
        <p class="text-base font-extrabold text-slate-900 dark:text-white mt-2">
          {{ !hasEmployeeProfile ? '—' : punchStatus }}
        </p>
        <p class="text-[10px] text-slate-400 mt-0.5">{{ currentShift }}</p>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="scroll-row items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
      <button
        @click="activeTab = 'overview'"
        :class="[
          'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2',
          activeTab === 'overview'
            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
        ]"
      >
        <UserCheck class="w-4 h-4" />
        <span>My ESS Overview</span>
      </button>

      <button
        @click="activeTab = 'leaves'"
        :class="[
          'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2',
          activeTab === 'leaves'
            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
        ]"
      >
        <CalendarPlus class="w-4 h-4" />
        <span>My Time-off ({{ myLeaves.length }})</span>
      </button>

      <button
        @click="activeTab = 'payslips'"
        :class="[
          'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2',
          activeTab === 'payslips'
            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
        ]"
      >
        <Banknote class="w-4 h-4" />
        <span>My Payslips ({{ myPayslips.length }})</span>
      </button>

      <button
        @click="activeTab = 'attendance'"
        :class="[
          'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2',
          activeTab === 'attendance'
            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
        ]"
      >
        <Clock class="w-4 h-4" />
        <span>My Shifts ({{ myAttendance.length }})</span>
      </button>

      <button
        @click="activeTab = 'wfh'"
        :class="[
          'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0',
          activeTab === 'wfh'
            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
        ]"
      >
        <Home class="w-4 h-4" />
        <span>Work From Home</span>
      </button>

      <button
        @click="activeTab = 'resignation'"
        :class="[
          'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap',
          activeTab === 'resignation'
            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
        ]"
      >
        <DoorOpen class="w-4 h-4" />
        <span>Resignation</span>
      </button>
    </div>

    <!-- TAB 1: OVERVIEW -->
    <div v-if="activeTab === 'overview'" class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Reporting Structure</h3>
        <div class="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
          <span class="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">Direct Manager</span>
          <p class="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
            {{ myEmployeeProfile?.reportingManagerName || 'Not assigned' }}
          </p>
          <p v-if="myManager?.email" class="text-xs text-slate-500 mt-0.5">{{ myManager.email }}</p>
        </div>

        <div class="space-y-2 pt-2 text-xs">
          <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
            <span class="text-slate-500">Employment Type</span>
            <span class="font-bold text-slate-800 dark:text-slate-200">{{ myEmployeeProfile?.employmentType || '—' }}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
            <span class="text-slate-500">Assigned Branch</span>
            <span class="font-bold text-slate-800 dark:text-slate-200">{{ myEmployeeProfile?.branch || '—' }}</span>
          </div>
          <div class="flex justify-between py-1">
            <span class="text-slate-500">Joining Date</span>
            <span class="font-bold text-slate-800 dark:text-slate-200">{{ myEmployeeProfile?.joiningDate || '—' }}</span>
          </div>
        </div>
      </div>

      <div class="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Salary Account</h3>
        <div
          v-if="myEmployeeProfile?.bankDetails"
          class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1"
        >
          <span class="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Bank Account on File</span>
          <p class="text-xs font-bold text-slate-900 dark:text-white">{{ myEmployeeProfile.bankDetails.bankName || '—' }}</p>
          <p class="text-[11px] text-slate-400 font-mono">
            Account: {{ maskedAccount || '—' }}<span v-if="myEmployeeProfile.bankDetails.accountType"> ({{ myEmployeeProfile.bankDetails.accountType }})</span>
          </p>
        </div>
        <p v-else class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-400">
          No bank details on file
        </p>
      </div>

      <div class="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Quick Actions</h3>
        <div class="space-y-2.5">
          <button
            @click="openLeaveModal"
            class="w-full text-left p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 hover:bg-indigo-100/60 border border-indigo-100 dark:border-indigo-900/40 transition-colors flex items-center justify-between"
          >
            <div>
              <p class="text-xs font-bold text-slate-900 dark:text-white">Apply for Leave</p>
              <p class="text-[11px] text-slate-400">Submit planned or sick time off</p>
            </div>
            <CalendarPlus class="w-4 h-4 text-indigo-500" />
          </button>

          <button
            @click="activeTab = 'wfh'"
            class="w-full text-left p-3.5 rounded-2xl bg-sky-50/60 dark:bg-sky-950/20 hover:bg-sky-100/60 border border-sky-100 dark:border-sky-900/40 transition-colors flex items-center justify-between"
          >
            <div>
              <p class="text-xs font-bold text-slate-900 dark:text-white">Apply Work From Home</p>
              <p class="text-[11px] text-slate-400">Shows as WFH in your attendance once approved</p>
            </div>
            <Home class="w-4 h-4 text-sky-500" />
          </button>

          <button
            @click="activeTab = 'resignation'"
            class="w-full text-left p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 border border-slate-200/60 dark:border-slate-800 transition-colors flex items-center justify-between"
          >
            <div>
              <p class="text-xs font-bold text-slate-900 dark:text-white">Resignation</p>
              <p class="text-[11px] text-slate-400">Submit or track your resignation</p>
            </div>
            <DoorOpen class="w-4 h-4 text-slate-400" />
          </button>

          <button
            @click="activeTab = 'payslips'"
            class="w-full text-left p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 border border-slate-200/60 dark:border-slate-800 transition-colors flex items-center justify-between"
          >
            <div>
              <p class="text-xs font-bold text-slate-900 dark:text-white">View Latest Payslip</p>
              <p class="text-[11px] text-slate-400">Inspect statutory monthly breakdown</p>
            </div>
            <Banknote class="w-4 h-4 text-slate-400" />
          </button>

          <button
            v-if="myEmployeeProfile"
            @click="router.push(`/employees/${myEmployeeProfile.id}`)"
            class="w-full text-left p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 border border-slate-200/60 dark:border-slate-800 transition-colors flex items-center justify-between"
          >
            <div>
              <p class="text-xs font-bold text-slate-900 dark:text-white">Complete 360° Profile</p>
              <p class="text-[11px] text-slate-400">Documents, contracts, and career history</p>
            </div>
            <ChevronRight class="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>
    </div>

    <!-- WORK FROM HOME -->
    <div v-if="activeTab === 'wfh'">
      <RemoteWorkRequests only-mine />
    </div>

    <!-- RESIGNATION -->
    <div v-if="activeTab === 'resignation'">
      <ResignationPanel />
    </div>

    <!-- TAB 2: MY LEAVES -->
    <div v-if="activeTab === 'leaves'" class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-base font-bold text-slate-900 dark:text-white">My Time-Off Applications</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">History of submitted vacation and casual leave requests</p>
        </div>
        <button
          @click="openLeaveModal"
          class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all"
        >
          <CalendarPlus class="w-4 h-4" />
          <span>Apply for Time Off</span>
        </button>
      </div>

      <div class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-semibold uppercase text-slate-400">
                <th class="py-3.5 px-6">Leave Type</th>
                <th class="py-3.5 px-6">Duration</th>
                <th class="py-3.5 px-6">Days</th>
                <th class="py-3.5 px-6">Reason</th>
                <th class="py-3.5 px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80">
              <tr v-if="myLeaves.length === 0">
                <td colspan="5" class="py-12 text-center text-slate-400">
                  No personal leave requests submitted yet.
                </td>
              </tr>
              <tr
                v-for="leave in myLeaves"
                :key="leave.id"
                class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
              >
                <td class="py-4 px-6 font-bold text-slate-900 dark:text-white">
                  {{ leave.leaveType }}
                </td>
                <td class="py-4 px-6 font-mono text-slate-600 dark:text-slate-300">
                  {{ leave.startDate }} &rarr; {{ leave.endDate }}
                </td>
                <td class="py-4 px-6 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {{ leave.daysCount }} days
                </td>
                <td class="py-4 px-6 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                  {{ leave.reason }}
                </td>
                <td class="py-4 px-6 text-right">
                  <span
                    :class="[
                      'px-2.5 py-0.5 rounded-full text-[10px] font-bold',
                      leave.status === 'Approved'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                        : leave.status === 'Pending'
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                        : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                    ]"
                  >
                    {{ leave.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 3: MY PAYSLIPS -->
    <div v-if="activeTab === 'payslips'" class="space-y-4">
      <div>
        <h2 class="text-base font-bold text-slate-900 dark:text-white">My Monthly Payslips</h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Click any statement to inspect and print official salary voucher</p>
      </div>

      <div class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-semibold uppercase text-slate-400">
                <th class="py-3.5 px-6">Voucher #</th>
                <th class="py-3.5 px-6">Pay Period</th>
                <th class="py-3.5 px-6">Gross Pay</th>
                <th class="py-3.5 px-6">Deductions</th>
                <th class="py-3.5 px-6">Net Take-Home</th>
                <th class="py-3.5 px-6">Status</th>
                <th class="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80">
              <tr v-if="myPayslips.length === 0">
                <td colspan="7" class="py-12 text-center text-slate-400">
                  No payslips generated for your profile yet.
                </td>
              </tr>
              <tr
                v-for="slip in myPayslips"
                :key="slip.id"
                @click="selectedPayslip = slip"
                class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
              >
                <td class="py-4 px-6 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {{ slip.payslipNumber }}
                </td>
                <td class="py-4 px-6 text-slate-700 dark:text-slate-300 font-medium">
                  {{ slip.monthYear }}
                </td>
                <td class="py-4 px-6 font-mono text-slate-600 dark:text-slate-300">
                  {{ formatCurrency(slip.breakdown.grossEarnings) }}
                </td>
                <td class="py-4 px-6 font-mono text-rose-600 dark:text-rose-400">
                  -{{ formatCurrency(slip.breakdown.totalDeductions) }}
                </td>
                <td class="py-4 px-6 font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                  {{ formatCurrency(slip.breakdown.netPay) }}
                </td>
                <td class="py-4 px-6">
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    {{ slip.paymentStatus }}
                  </span>
                </td>
                <td class="py-4 px-6 text-right">
                  <button
                    @click.stop="selectedPayslip = slip"
                    class="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors"
                  >
                    <Eye class="w-4 h-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 4: MY ATTENDANCE -->
    <div v-if="activeTab === 'attendance'" class="space-y-4">
      <div>
        <h2 class="text-base font-bold text-slate-900 dark:text-white">My Attendance & Punch History</h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Personal check-in and check-out ledger</p>
      </div>

      <div class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-semibold uppercase text-slate-400">
                <th class="py-3.5 px-6">Date</th>
                <th class="py-3.5 px-6">Shift</th>
                <th class="py-3.5 px-6">Check In</th>
                <th class="py-3.5 px-6">Check Out</th>
                <th class="py-3.5 px-6">Hours</th>
                <th class="py-3.5 px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80">
              <tr v-if="myAttendance.length === 0">
                <td colspan="6" class="py-12 text-center text-slate-400">
                  No attendance punches recorded yet.
                </td>
              </tr>
              <tr
                v-for="rec in myAttendance"
                :key="rec.id"
                class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
              >
                <td class="py-4 px-6 font-mono font-medium text-slate-900 dark:text-white">
                  {{ rec.date }}
                </td>
                <td class="py-4 px-6 text-slate-500 dark:text-slate-400">
                  {{ rec.shift }}
                </td>
                <td class="py-4 px-6 font-mono font-medium text-slate-800 dark:text-slate-200">
                  {{ rec.checkIn }}
                </td>
                <td class="py-4 px-6 font-mono text-slate-500 dark:text-slate-400">
                  {{ rec.checkOut || 'In progress' }}
                </td>
                <td class="py-4 px-6 font-mono text-slate-800 dark:text-slate-200">
                  {{ rec.workHours ? `${rec.workHours} hrs` : 'Active' }}
                </td>
                <td class="py-4 px-6 text-right">
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    {{ rec.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal 1: Quick Leave Application -->
    <div
      v-if="isLeaveModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 animate-scaleUp">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">Apply for Time Off</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Submitted for approval through your company's leave workflow</p>
          </div>
          <button
            @click="isLeaveModalOpen = false"
            class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <form @submit="onLeaveSubmit" class="space-y-4 mt-6">
          <FormSelect
            name="leaveType"
            label="Leave Type"
            :options="leaveTypeOptions"
            required
          />

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput name="startDate" type="date" label="Start Date" required />
            <FormInput name="endDate" type="date" label="End Date" required />
          </div>

          <FormTextarea
            name="reason"
            label="Reason for Absence"
            placeholder="Please specify reasons for this leave request..."
            required
          />

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              @click="isLeaveModalOpen = false"
              class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isApplyingLeave"
              class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {{ isApplyingLeave ? 'Submitting...' : 'Submit Request' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal 2: Payslip Voucher Inspector -->
    <div
      v-if="selectedPayslip"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div class="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 overflow-y-auto max-h-[92vh] animate-scaleUp print:p-0 print:border-none print:shadow-none">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 print:hidden">
          <div class="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
            <FileText class="w-4 h-4" />
            <span>Salary Statement</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="handlePrint"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold"
            >
              <Printer class="w-3.5 h-3.5" />
              <span>Print / Export</span>
            </button>
            <button
              @click="selectedPayslip = null"
              class="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <div class="mt-6 space-y-6">
          <div class="flex items-start justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div class="flex items-center gap-2">
                <AppLogo variant="full" className="h-8 w-auto max-w-[170px]" />
              </div>
              <p class="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mt-2">{{ company?.legalName || company?.name || '—' }}</p>
              <p v-if="company?.headquarters" class="text-[11px] text-slate-500">{{ company.headquarters }}</p>
            </div>
            <div class="text-right">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Statement</span>
              <p class="text-sm font-extrabold text-[#0e6db3] dark:text-[#38a5e4] font-mono mt-0.5">{{ selectedPayslip.payslipNumber }}</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div class="space-y-2">
              <h3 class="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] pb-2 border-b border-slate-200 dark:border-slate-800">
                Gross Earnings
              </h3>
              <div class="flex justify-between py-1">
                <span class="text-slate-500">Basic Pay</span>
                <span class="font-mono text-slate-800 dark:text-slate-200">{{ formatCurrency(selectedPayslip.breakdown.basic) }}</span>
              </div>
              <div class="flex justify-between py-1">
                <span class="text-slate-500">HRA & Allowances</span>
                <span class="font-mono text-slate-800 dark:text-slate-200">{{ formatCurrency(selectedPayslip.breakdown.hra + selectedPayslip.breakdown.specialAllowance) }}</span>
              </div>
              <div class="flex justify-between py-2 border-t border-slate-200 dark:border-slate-800 font-bold">
                <span>Total Gross</span>
                <span class="font-mono text-indigo-600 dark:text-indigo-400">{{ formatCurrency(selectedPayslip.breakdown.grossEarnings) }}</span>
              </div>
            </div>

            <div class="space-y-2">
              <h3 class="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] pb-2 border-b border-slate-200 dark:border-slate-800">
                Deductions
              </h3>
              <div class="flex justify-between py-1">
                <span class="text-slate-500">Provident Fund (PF)</span>
                <span class="font-mono text-slate-800 dark:text-slate-200">{{ formatCurrency(selectedPayslip.breakdown.providentFund) }}</span>
              </div>
              <div class="flex justify-between py-1">
                <span class="text-slate-500">Income Tax (TDS)</span>
                <span class="font-mono text-slate-800 dark:text-slate-200">{{ formatCurrency(selectedPayslip.breakdown.incomeTaxTds) }}</span>
              </div>
              <div class="flex justify-between py-2 border-t border-slate-200 dark:border-slate-800 font-bold">
                <span>Total Deductions</span>
                <span class="font-mono text-rose-600 dark:text-rose-400">-{{ formatCurrency(selectedPayslip.breakdown.totalDeductions) }}</span>
              </div>
            </div>
          </div>

          <div class="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
            <div>
              <span class="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Net Take-Home Pay</span>
              <p class="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                {{ formatCurrency(selectedPayslip.breakdown.netPay) }}
              </p>
            </div>
            <span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
              {{ selectedPayslip.paymentStatus }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
