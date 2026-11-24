<script setup lang="ts">
import { ref, computed } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import {
  CalendarPlus,
  CheckCircle2,
  XCircle,
  CalendarCheck2,
  X,
  Calendar,
  Layers,
  Sparkles,
  ShieldAlert,
  Check,
  Building,
  Plus,
  Pencil,
  Trash2,
} from '@lucide/vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiQuery, useApiMutation, useAppSelector } from '@/redux/vueAdapter'
import type { LeaveRequest, Employee, LeaveTypePolicy, Holiday, LeaveBalance } from '@/types/hrms'
import FormInput from '@/components/forms/FormInput.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormTextarea from '@/components/forms/FormTextarea.vue'
import { usePermissions } from '@/composables/usePermissions'

const currentUser = useAppSelector((state) => state.auth.user)
// Access from Roles & Permissions: Leave Management row. Approve/Reject
// buttons follow each request's `canAct` (set by the approval workflow).
const { can } = usePermissions()
const canViewAllLeaves = computed(() => can('leaves', 'view'))
const canCreateLeaveSetup = computed(() => can('leaves', 'create'))
const canEditLeaveSetup = computed(() => can('leaves', 'edit'))
const canDeleteLeaveSetup = computed(() => can('leaves', 'delete'))
// Applying on behalf of other employees needs Write on Leave Management.
const canApplyForOthers = computed(() => can('leaves', 'create'))
// Signed-in user's employee record id (empty for admin-only logins).
const currentUserId = computed(() => currentUser.value?.employeeId || '')
const NO_PROFILE_MESSAGE = "Your login isn't linked to an employee profile."

// Redux Queries & Mutations
const { data: leaves } = useApiQuery<LeaveRequest[]>(hrmsApi.endpoints.getLeaveRequests)
const { data: employees } = useApiQuery<Employee[]>(hrmsApi.endpoints.getEmployees)
const { data: policies } = useApiQuery<LeaveTypePolicy[]>(hrmsApi.endpoints.getLeavePolicies)
const { data: holidays } = useApiQuery<Holiday[]>(hrmsApi.endpoints.getHolidays)
const { data: leaveBalances } = useApiQuery<LeaveBalance[]>(hrmsApi.endpoints.getLeaveBalances)

// Calendar year shown on the holiday tab: from the holidays themselves, else the current year.
const holidayYears = computed(() => {
  const years = new Set((holidays.value || []).map((h) => (h.date || '').slice(0, 4)).filter(Boolean))
  return years.size ? Array.from(years).sort().join(', ') : String(new Date().getFullYear())
})

const [applyLeave, { isLoading: isApplying }] = useApiMutation(hrmsApi.endpoints.applyLeave)
const [updateLeaveStatus] = useApiMutation(hrmsApi.endpoints.updateLeaveStatus)

// Leave Policy Mutations (Admin Only)
const [addLeavePolicy, { isLoading: isSavingPolicy }] = useApiMutation(hrmsApi.endpoints.addLeavePolicy)
const [updateLeavePolicy] = useApiMutation(hrmsApi.endpoints.updateLeavePolicy)
const [deleteLeavePolicy] = useApiMutation(hrmsApi.endpoints.deleteLeavePolicy)

// Holiday Mutations (Admin Only)
const [addHoliday, { isLoading: isSavingHoliday }] = useApiMutation(hrmsApi.endpoints.addHoliday)
const [updateHoliday] = useApiMutation(hrmsApi.endpoints.updateHoliday)
const [deleteHoliday] = useApiMutation(hrmsApi.endpoints.deleteHoliday)

// Tab & Filter State
type LeaveTab = 'requests' | 'policies' | 'holidays'
const activeTab = ref<LeaveTab>('requests')
const activeFilter = ref<'All' | 'Pending' | 'Approved' | 'Rejected'>('All')
const isModalOpen = ref(false)
const notification = ref('')

const showNotification = (msg: string) => {
  notification.value = msg
  setTimeout(() => {
    notification.value = ''
  }, 3500)
}

const employeeOptions = computed(() => {
  return (employees.value || []).map((e) => ({
    value: e.id,
    label: `${e.firstName} ${e.lastName} (${e.department})`,
  }))
})

// Leave types come from the company's leave policies.
const leaveTypeOptions = computed(() => (policies.value || []).map((p) => ({ value: p.name, label: p.name })))

// Form Setup with VeeValidate + Zod
const leaveFormSchema = z
  .object({
    employeeId: z.string().min(1, 'Please select an employee'),
    leaveType: z.string().min(1, 'Please select a leave type'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    reason: z.string().min(8, 'Reason must be at least 8 characters explaining the leave'),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: 'End date cannot be earlier than start date',
    path: ['endDate'],
  })
type LeaveFormValues = z.infer<typeof leaveFormSchema>

const { handleSubmit, resetForm } = useForm<LeaveFormValues>({
  validationSchema: toTypedSchema(leaveFormSchema),
  initialValues: {
    employeeId: '',
    leaveType: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: '',
  },
})

const openRequestLeaveModal = () => {
  if (!canApplyForOthers.value && !currentUserId.value) {
    showNotification(NO_PROFILE_MESSAGE)
    return
  }
  const initialEmpId = canApplyForOthers.value ? '' : currentUserId.value
  resetForm({
    values: {
      employeeId: initialEmpId,
      leaveType: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      reason: '',
    },
  })
  isModalOpen.value = true
}

const onSubmit = handleSubmit(async (values) => {
  const empId = values.employeeId || currentUserId.value
  const emp = (employees.value || []).find((e) => e.id === empId)
  if (!emp) {
    showNotification(empId ? 'Select a valid employee' : NO_PROFILE_MESSAGE)
    return
  }
  const start = new Date(values.startDate)
  const end = new Date(values.endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

  const { error } = await applyLeave({
    employeeId: empId,
    employeeName: `${emp.firstName} ${emp.lastName}`,
    department: emp.department,
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

  showNotification('Leave request submitted successfully for approval!')
  resetForm()
  isModalOpen.value = false
})

// Leave Management Read = every request the backend returns; otherwise the
// user's own requests plus any they can approve (e.g. their team's).
const scopedLeaves = computed(() => {
  const all = leaves.value || []
  if (canViewAllLeaves.value) return all
  const myId = currentUserId.value
  return all.filter((l) => (myId && l.employeeId === myId) || l.canAct)
})

const filteredLeaves = computed(() => {
  if (activeFilter.value === 'All') return scopedLeaves.value
  return scopedLeaves.value.filter((l) => l.status === activeFilter.value)
})

const handleStatusChange = async (id: string, status: 'Approved' | 'Rejected') => {
  if (!(leaves.value || []).find((l) => l.id === id)?.canAct) {
    showNotification('You are not an approver for this leave request.')
    return
  }
  const { error } = await updateLeaveStatus({ id, status })
  if (error) {
    showNotification(error?.data || 'The leave request could not be updated')
    return
  }
  showNotification(`Leave request marked as ${status}`)
}

// Summary Metrics
const pendingCount = computed(() => scopedLeaves.value.filter((l) => l.status === 'Pending').length)
const approvedCount = computed(() => scopedLeaves.value.filter((l) => l.status === 'Approved').length)

// ==========================================
// Policy Modal & Form (Admin Only)
// ==========================================
const isPolicyModalOpen = ref(false)
const isEditingPolicy = ref(false)
const editingPolicyId = ref<string | null>(null)
const policyForm = ref({
  name: '',
  totalAllowedPerYear: 0,
  maxCarryForwardDays: 0,
  accrualFrequency: 'Monthly' as 'Monthly' | 'Quarterly' | 'Yearly',
  paid: true,
  description: '',
})

const openAddPolicyModal = () => {
  if (!canCreateLeaveSetup.value) return
  isEditingPolicy.value = false
  editingPolicyId.value = null
  policyForm.value = {
    name: '',
    totalAllowedPerYear: 0,
    maxCarryForwardDays: 0,
    accrualFrequency: 'Monthly',
    paid: true,
    description: '',
  }
  isPolicyModalOpen.value = true
}

const openEditPolicyModal = (p: LeaveTypePolicy) => {
  if (!canEditLeaveSetup.value) return
  isEditingPolicy.value = true
  editingPolicyId.value = p.id
  policyForm.value = {
    name: p.name,
    totalAllowedPerYear: p.totalAllowedPerYear,
    maxCarryForwardDays: p.maxCarryForwardDays,
    accrualFrequency: p.accrualFrequency,
    paid: p.paid ?? (p.name !== 'Unpaid'),
    description: p.description || '',
  }
  isPolicyModalOpen.value = true
}

const handleSavePolicy = async () => {
  if (!(isEditingPolicy.value ? canEditLeaveSetup.value : canCreateLeaveSetup.value)) return
  if (!policyForm.value.name.trim()) {
    showNotification('Policy name is required')
    return
  }

  if (isEditingPolicy.value && editingPolicyId.value) {
    await updateLeavePolicy({
      id: editingPolicyId.value,
      updates: {
        name: policyForm.value.name.trim(),
        totalAllowedPerYear: Number(policyForm.value.totalAllowedPerYear),
        maxCarryForwardDays: Number(policyForm.value.maxCarryForwardDays),
        accrualFrequency: policyForm.value.accrualFrequency,
        paid: policyForm.value.paid,
        carryForwardAllowed: Number(policyForm.value.maxCarryForwardDays) > 0,
        description: policyForm.value.description.trim(),
      },
    })
    showNotification(`Leave policy "${policyForm.value.name}" updated successfully!`)
  } else {
    await addLeavePolicy({
      name: policyForm.value.name.trim(),
      totalAllowedPerYear: Number(policyForm.value.totalAllowedPerYear),
      maxCarryForwardDays: Number(policyForm.value.maxCarryForwardDays),
      accrualFrequency: policyForm.value.accrualFrequency,
      paid: policyForm.value.paid,
      carryForwardAllowed: Number(policyForm.value.maxCarryForwardDays) > 0,
      description: policyForm.value.description.trim(),
    })
    showNotification(`Leave policy "${policyForm.value.name}" added successfully!`)
  }
  isPolicyModalOpen.value = false
}

const handleDeletePolicy = async (p: LeaveTypePolicy) => {
  if (!canDeleteLeaveSetup.value) return
  if (confirm(`Are you sure you want to delete leave policy "${p.name}"?`)) {
    await deleteLeavePolicy(p.id)
    showNotification(`Leave policy "${p.name}" deleted.`)
  }
}

// ==========================================
// Holiday Modal & Form (Admin Only)
// ==========================================
const isHolidayModalOpen = ref(false)
const isEditingHoliday = ref(false)
const editingHolidayId = ref<string | null>(null)
const holidayForm = ref({
  name: '',
  date: new Date().toISOString().split('T')[0] ?? '',
  type: 'National' as 'Public' | 'National' | 'Optional',
})

const openAddHolidayModal = () => {
  if (!canCreateLeaveSetup.value) return
  isEditingHoliday.value = false
  editingHolidayId.value = null
  holidayForm.value = {
    name: '',
    date: new Date().toISOString().split('T')[0] ?? '',
    type: 'National',
  }
  isHolidayModalOpen.value = true
}

const openEditHolidayModal = (h: Holiday) => {
  if (!canEditLeaveSetup.value) return
  isEditingHoliday.value = true
  editingHolidayId.value = h.id
  holidayForm.value = {
    name: h.name,
    date: h.date,
    type: (h.type as any) || 'National',
  }
  isHolidayModalOpen.value = true
}

const handleSaveHoliday = async () => {
  if (!(isEditingHoliday.value ? canEditLeaveSetup.value : canCreateLeaveSetup.value)) return
  if (!holidayForm.value.name.trim() || !holidayForm.value.date) {
    showNotification('Holiday name and date are required')
    return
  }
  const dayOfWeek = new Date(holidayForm.value.date).toLocaleDateString('en-US', { weekday: 'long' })

  if (isEditingHoliday.value && editingHolidayId.value) {
    await updateHoliday({
      id: editingHolidayId.value,
      updates: {
        name: holidayForm.value.name.trim(),
        date: holidayForm.value.date,
        type: holidayForm.value.type,
        dayOfWeek,
      },
    })
    showNotification(`Holiday "${holidayForm.value.name}" updated successfully!`)
  } else {
    await addHoliday({
      name: holidayForm.value.name.trim(),
      date: holidayForm.value.date,
      type: holidayForm.value.type,
      dayOfWeek,
    })
    showNotification(`Holiday "${holidayForm.value.name}" added to calendar!`)
  }
  isHolidayModalOpen.value = false
}

const handleDeleteHoliday = async (h: Holiday) => {
  if (!canDeleteLeaveSetup.value) return
  if (confirm(`Are you sure you want to delete holiday "${h.name}"?`)) {
    await deleteHoliday(h.id)
    showNotification(`Holiday "${h.name}" removed from calendar.`)
  }
}
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Leave Management
        </h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Review time-off balances, request absences, manage leave policies, and view the holiday calendar
        </p>
      </div>

      <button
        @click="openRequestLeaveModal"
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1989d9] hover:bg-[#0e6db3] text-white font-semibold text-xs shadow-md shadow-[#1989d9]/20 active:scale-95 transition-all self-start cursor-pointer"
      >
        <CalendarPlus class="w-4 h-4" />
        <span>Request Leave</span>
      </button>
    </div>

    <!-- Alert Message -->
    <div
      v-if="notification"
      class="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-medium animate-fadeIn"
    >
      <CheckCircle2 class="w-5 h-5 text-emerald-500 shrink-0" />
      <span>{{ notification }}</span>
    </div>

    <!-- Leave Balance KPI Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <!-- My leave balances (from the backend) -->
      <div
        v-for="balance in leaveBalances || []"
        :key="balance.policyId"
        class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs"
      >
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-xs font-semibold">{{ balance.leaveType }}</span>
          <CalendarCheck2 class="w-4 h-4 text-[#1989d9]" />
        </div>
        <p class="text-2xl font-black text-slate-900 dark:text-white mt-1">{{ balance.available }} Days</p>
        <p class="text-[10px] text-slate-400 mt-0.5">
          {{ balance.used }} taken • {{ balance.allocated }} allowance<span v-if="balance.pending > 0"> • {{ balance.pending }} pending</span>
        </p>
      </div>
      <div
        v-if="currentUserId && !(leaveBalances || []).length"
        class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center text-xs text-slate-400"
      >
        No leave balances yet
      </div>

      <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-xs font-semibold">Pending Approvals</span>
          <ShieldAlert class="w-4 h-4 text-amber-500" />
        </div>
        <p class="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{{ pendingCount }}</p>
        <p class="text-[10px] text-slate-400 mt-0.5">Awaiting manager action</p>
      </div>

      <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-xs font-semibold">Total Approved</span>
          <CheckCircle2 class="w-4 h-4 text-[#1989d9]" />
        </div>
        <p class="text-2xl font-black text-[#0e6db3] dark:text-[#38a5e4] mt-1">{{ approvedCount }}</p>
        <p class="text-[10px] text-slate-400 mt-0.5">All approved requests shown</p>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
      <button
        @click="activeTab = 'requests'"
        :class="[
          'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer',
          activeTab === 'requests'
            ? 'bg-[#1989d9] text-white shadow-sm shadow-[#1989d9]/30'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
        ]"
      >
        <CalendarCheck2 class="w-4 h-4" />
        <span>Applications & Requests ({{ scopedLeaves?.length || 0 }})</span>
      </button>

      <button
        @click="activeTab = 'policies'"
        :class="[
          'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer',
          activeTab === 'policies'
            ? 'bg-[#1989d9] text-white shadow-sm shadow-[#1989d9]/30'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
        ]"
      >
        <Layers class="w-4 h-4" />
        <span>Leave Policies ({{ policies?.length || 0 }})</span>
      </button>

      <button
        @click="activeTab = 'holidays'"
        :class="[
          'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer',
          activeTab === 'holidays'
            ? 'bg-[#1989d9] text-white shadow-sm shadow-[#1989d9]/30'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
        ]"
      >
        <Calendar class="w-4 h-4" />
        <span>Holiday Calendar ({{ holidays?.length || 0 }})</span>
      </button>
    </div>

    <!-- TAB 1: LEAVE APPLICATIONS -->
    <div v-if="activeTab === 'requests'" class="space-y-4">
      <!-- Status Filter Pills -->
      <div class="flex items-center gap-2">
        <button
          v-for="filter in ['All', 'Pending', 'Approved', 'Rejected'] as const"
          :key="filter"
          @click="activeFilter = filter"
          :class="[
            'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer',
            activeFilter === filter
              ? 'bg-[#1989d9] text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          ]"
        >
          {{ filter }}
        </button>
      </div>

      <!-- Requests Table -->
      <div class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th class="py-3.5 px-6">Employee</th>
                <th class="py-3.5 px-6">Leave Type</th>
                <th class="py-3.5 px-6">Duration</th>
                <th class="py-3.5 px-6">Days</th>
                <th class="py-3.5 px-6">Reason</th>
                <th class="py-3.5 px-6">Status</th>
                <th class="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
              <tr v-if="filteredLeaves.length === 0">
                <td colspan="7" class="py-12 text-center text-slate-400 text-xs">
                  No leave requests found for this filter.
                </td>
              </tr>
              <tr
                v-for="leave in filteredLeaves"
                :key="leave.id"
                class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
              >
                <td class="py-4 px-6 font-semibold text-slate-900 dark:text-white text-xs">
                  <div>
                    <p>{{ leave.employeeName }}</p>
                    <p class="text-[11px] text-slate-400 font-normal">{{ leave.department }}</p>
                  </div>
                </td>
                <td class="py-4 px-6 text-xs text-slate-700 dark:text-slate-300 font-medium">
                  {{ leave.leaveType }}
                </td>
                <td class="py-4 px-6 text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {{ leave.startDate }} &rarr; {{ leave.endDate }}
                </td>
                <td class="py-4 px-6 text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                  {{ leave.daysCount }} days
                </td>
                <td class="py-4 px-6 text-xs text-slate-600 dark:text-slate-300 max-w-xs truncate">
                  {{ leave.reason }}
                </td>
                <td class="py-4 px-6">
                  <span
                    :class="[
                      'px-2.5 py-1 rounded-md text-xs font-semibold',
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
                <td class="py-4 px-6 text-right">
                  <div v-if="leave.status === 'Pending' && leave.canAct" class="flex items-center justify-end gap-1.5">
                    <button
                      @click="handleStatusChange(leave.id, 'Approved')"
                      title="Approve Leave"
                      class="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 hover:bg-emerald-100 transition-colors cursor-pointer"
                    >
                      <Check class="w-4 h-4" />
                    </button>
                    <button
                      @click="handleStatusChange(leave.id, 'Rejected')"
                      title="Reject Leave"
                      class="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                    >
                      <XCircle class="w-4 h-4" />
                    </button>
                  </div>
                  <span v-else-if="leave.status === 'Pending'" class="text-xs text-amber-500 font-medium">Awaiting Approval</span>
                  <span v-else class="text-xs text-slate-400">Archived</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 2: LEAVE POLICIES -->
    <div v-if="activeTab === 'policies'" class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
        <div>
          <h2 class="text-base font-bold text-slate-900 dark:text-white">Company Leave Policies</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Accrual rules, carry-forward allowances, and entitlement quotas</p>
        </div>

        <button
          v-if="canCreateLeaveSetup"
          @click="openAddPolicyModal"
          class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1989d9] hover:bg-[#0e6db3] text-white font-semibold text-xs shadow-md shadow-[#1989d9]/20 active:scale-95 transition-all cursor-pointer"
        >
          <Plus class="w-4 h-4" />
          <span>Add Leave Policy</span>
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          v-for="policy in policies"
          :key="policy.id"
          class="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 hover:border-[#1989d9]/40 transition-colors relative group"
        >
          <div class="flex items-center justify-between">
            <span class="p-2.5 rounded-xl bg-[#1989d9]/10 text-[#0e6db3] dark:text-[#38a5e4]">
              <Layers class="w-5 h-5" />
            </span>
            <div class="flex items-center gap-1.5">
              <span class="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                {{ policy.paid !== false && policy.name !== 'Unpaid' ? 'Paid Time-Off' : 'Unpaid' }}
              </span>
              <div v-if="canEditLeaveSetup || canDeleteLeaveSetup" class="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                <button
                  v-if="canEditLeaveSetup"
                  @click="openEditPolicyModal(policy)"
                  title="Edit Policy"
                  class="p-1 rounded-lg text-slate-400 hover:text-[#0e6db3] dark:hover:text-[#38a5e4] hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Pencil class="w-3.5 h-3.5" />
                </button>
                <button
                  v-if="canDeleteLeaveSetup"
                  @click="handleDeletePolicy(policy)"
                  title="Delete Policy"
                  class="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">{{ policy.name }} Leave</h3>
            <p class="text-2xl font-black text-[#0e6db3] dark:text-[#38a5e4] mt-1 font-mono">
              {{ policy.totalAllowedPerYear }} Days <span class="text-xs font-normal text-slate-400">/ year</span>
            </p>
          </div>

          <div class="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
            <div class="flex justify-between py-1">
              <span class="text-slate-400">Carry Forward Limit</span>
              <span class="font-bold text-slate-800 dark:text-slate-200">{{ policy.maxCarryForwardDays }} Days</span>
            </div>
            <div class="flex justify-between py-1">
              <span class="text-slate-400">Accrual Frequency</span>
              <span class="font-bold text-slate-800 dark:text-slate-200">{{ policy.accrualFrequency }}</span>
            </div>
            <p class="text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
              {{ policy.description || '—' }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: HOLIDAY CALENDAR -->
    <div v-if="activeTab === 'holidays'" class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
      <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-bold text-slate-900 dark:text-white">Corporate Holiday Calendar ({{ holidayYears }})</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Official company-wide non-working holidays and national observances</p>
        </div>

        <button
          v-if="canCreateLeaveSetup"
          @click="openAddHolidayModal"
          class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1989d9] hover:bg-[#0e6db3] text-white font-semibold text-xs shadow-md shadow-[#1989d9]/20 active:scale-95 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus class="w-4 h-4" />
          <span>Add Holiday</span>
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th class="py-3.5 px-6">Holiday Name</th>
              <th class="py-3.5 px-6">Date</th>
              <th class="py-3.5 px-6">Day of Week</th>
              <th class="py-3.5 px-6">Classification</th>
              <th class="py-3.5 px-6">Attendance</th>
              <th v-if="canEditLeaveSetup || canDeleteLeaveSetup" class="py-3.5 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
            <tr
              v-for="holiday in holidays"
              :key="holiday.id"
              class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
            >
              <td class="py-4 px-6 font-semibold text-slate-900 dark:text-white text-xs">
                {{ holiday.name }}
              </td>
              <td class="py-4 px-6 text-xs text-slate-600 dark:text-slate-300 font-mono">
                {{ holiday.date }}
              </td>
              <td class="py-4 px-6 text-xs text-slate-500 dark:text-slate-400">
                {{ holiday.dayOfWeek || new Date(holiday.date).toLocaleDateString('en-US', { weekday: 'long' }) }}
              </td>
              <td class="py-4 px-6">
                <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#1989d9]/10 text-[#0e6db3] dark:text-[#38a5e4] border border-[#1989d9]/20">
                  {{ holiday.type }}
                </span>
              </td>
              <td class="py-4 px-6">
                <span
                  :class="[
                    'px-2.5 py-0.5 rounded-full text-[10px] font-bold',
                    (holiday.type || '').toLowerCase() === 'optional'
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                      : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                  ]"
                >
                  {{ (holiday.type || '').toLowerCase() === 'optional' ? 'Optional holiday' : 'Company holiday' }}
                </span>
              </td>
              <td v-if="canEditLeaveSetup || canDeleteLeaveSetup" class="py-4 px-6 text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    v-if="canEditLeaveSetup"
                    @click="openEditHolidayModal(holiday)"
                    title="Edit Holiday"
                    class="p-1.5 rounded-lg text-slate-400 hover:text-[#0e6db3] dark:hover:text-[#38a5e4] hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Pencil class="w-3.5 h-3.5" />
                  </button>
                  <button
                    v-if="canDeleteLeaveSetup"
                    @click="handleDeleteHoliday(holiday)"
                    title="Delete Holiday"
                    class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal: Request Leave Dialog -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
    >
      <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 animate-scaleUp">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">Apply for Time Off</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Submit request verified by Zod schema</p>
          </div>
          <button
            @click="isModalOpen = false"
            class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <form @submit="onSubmit" class="space-y-4 mt-6">
          <FormSelect
            v-if="canApplyForOthers"
            name="employeeId"
            label="Employee"
            :options="employeeOptions"
            required
          />

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
            placeholder="Brief reason for your time-off request..."
            required
          />

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              @click="isModalOpen = false"
              class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isApplying"
              class="px-5 py-2.5 rounded-xl bg-[#1989d9] hover:bg-[#0e6db3] text-white font-semibold text-xs shadow-md shadow-[#1989d9]/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {{ isApplying ? 'Submitting...' : 'Submit Leave Application' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal: Add / Edit Policy Dialog (Admin Only) -->
    <div
      v-if="isPolicyModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
    >
      <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 animate-scaleUp">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">
              {{ isEditingPolicy ? 'Edit Leave Policy' : 'Create Leave Policy' }}
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Configure annual entitlement quotas and accrual rules
            </p>
          </div>
          <button
            @click="isPolicyModalOpen = false"
            class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-4 mt-6">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Policy / Leave Type Name <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="policyForm.name"
              type="text"
              placeholder="e.g. Parental, Bereavement, Sabbatical"
              class="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:border-[#1989d9] text-slate-800 dark:text-slate-200"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Total Allowed / Year (Days) <span class="text-rose-500">*</span>
              </label>
              <input
                v-model.number="policyForm.totalAllowedPerYear"
                type="number"
                min="0"
                class="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:border-[#1989d9] text-slate-800 dark:text-slate-200"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Carry Forward Limit (Days)
              </label>
              <input
                v-model.number="policyForm.maxCarryForwardDays"
                type="number"
                min="0"
                class="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:border-[#1989d9] text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Accrual Frequency
              </label>
              <select
                v-model="policyForm.accrualFrequency"
                class="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden text-slate-700 dark:text-slate-200"
              >
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Paid / Unpaid Status
              </label>
              <select
                v-model="policyForm.paid"
                class="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden text-slate-700 dark:text-slate-200"
              >
                <option :value="true">Paid Leave</option>
                <option :value="false">Unpaid Leave</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Policy Description
            </label>
            <textarea
              v-model="policyForm.description"
              rows="3"
              placeholder="Guidelines and entitlement terms..."
              class="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:border-[#1989d9] text-slate-800 dark:text-slate-200"
            ></textarea>
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              @click="isPolicyModalOpen = false"
              class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              @click="handleSavePolicy"
              :disabled="isSavingPolicy"
              class="px-5 py-2.5 rounded-xl bg-[#1989d9] hover:bg-[#0e6db3] text-white font-semibold text-xs shadow-md shadow-[#1989d9]/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {{ isSavingPolicy ? 'Saving...' : (isEditingPolicy ? 'Update Policy' : 'Create Policy') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Add / Edit Holiday Dialog (Admin Only) -->
    <div
      v-if="isHolidayModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
    >
      <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 animate-scaleUp">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">
              {{ isEditingHoliday ? 'Edit Calendar Holiday' : 'Add Calendar Holiday' }}
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Official company-wide non-working calendar event
            </p>
          </div>
          <button
            @click="isHolidayModalOpen = false"
            class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-4 mt-6">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Holiday Name <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="holidayForm.name"
              type="text"
              placeholder="e.g. Diwali, Independence Day, Thanksgiving"
              class="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:border-[#1989d9] text-slate-800 dark:text-slate-200"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Holiday Date <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="holidayForm.date"
              type="date"
              class="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:border-[#1989d9] text-slate-800 dark:text-slate-200"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Holiday Classification
            </label>
            <select
              v-model="holidayForm.type"
              class="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden text-slate-700 dark:text-slate-200"
            >
              <option value="National">National Holiday</option>
              <option value="Public">Public / Gazetted Holiday</option>
              <option value="Optional">Optional / Festive Holiday</option>
            </select>
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              @click="isHolidayModalOpen = false"
              class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              @click="handleSaveHoliday"
              :disabled="isSavingHoliday"
              class="px-5 py-2.5 rounded-xl bg-[#1989d9] hover:bg-[#0e6db3] text-white font-semibold text-xs shadow-md shadow-[#1989d9]/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {{ isSavingHoliday ? 'Saving...' : (isEditingHoliday ? 'Update Holiday' : 'Add Holiday') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
