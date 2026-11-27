<script setup lang="ts">
import { computed, ref } from 'vue'
import { Banknote, CheckCircle2, Inbox, Plus, X, XCircle } from '@lucide/vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiMutation, useApiQuery } from '@/redux/vueAdapter'
import { usePermissions } from '@/composables/usePermissions'
import { useMoney } from '@/composables/useMoney'
import type { ApiError } from '@/services/apiClient'
import type { LeaveBalance, LeaveEncashment, LeaveTypePolicy } from '@/types/hrms'
import { formatDay } from '@/components/attendance/time'

// Leave encashment (SRS 6.5): employees request to cash unused days of an
// encashable leave type; HR approves; the amount is paid in the next payroll run.
const { user, hasEmployeeProfile } = usePermissions()
const { formatMoney } = useMoney()
const myId = computed(() => user.value?.employeeId || '')

const { data: requests, isLoading, error } = useApiQuery<LeaveEncashment[]>(hrmsApi.endpoints.getLeaveEncashments)
const { data: policies } = useApiQuery<LeaveTypePolicy[]>(hrmsApi.endpoints.getLeavePolicies)
const { data: balances } = useApiQuery<LeaveBalance[]>(hrmsApi.endpoints.getLeaveBalances)
const [requestEncashment, { isLoading: saving }] = useApiMutation(hrmsApi.endpoints.requestLeaveEncashment)
const [decide] = useApiMutation(hrmsApi.endpoints.decideLeaveEncashment)
const [cancel] = useApiMutation(hrmsApi.endpoints.cancelLeaveEncashment)

const encashable = computed(() => (policies.value || []).filter((p) => p.encashable))
const availableFor = (name: string) => (balances.value || []).find((b) => b.leaveType === name)?.available ?? 0

const showForm = ref(false)
const form = ref({ leaveType: '', days: 1, reason: '' })
const formError = ref('')
const message = ref('')
const openForm = () => {
  form.value = { leaveType: encashable.value[0]?.name || '', days: 1, reason: '' }
  formError.value = ''
  showForm.value = true
}
const submit = async () => {
  if (!form.value.leaveType) return (formError.value = 'Choose a leave type')
  if (!(Number(form.value.days) > 0)) return (formError.value = 'Enter the number of days')
  const { error: err } = await requestEncashment({ leaveType: form.value.leaveType, days: Number(form.value.days), reason: form.value.reason.trim() || undefined })
  if (err) return (formError.value = (err as ApiError).data || 'Could not send the request')
  showForm.value = false
  message.value = 'Encashment requested. Once HR approves, it is paid with the next payroll.'
}
const busyId = ref('')
const act = async (e: LeaveEncashment, status: 'Approved' | 'Rejected') => {
  busyId.value = e.id
  const { error: err } = await decide({ id: e.id, status })
  busyId.value = ''
  message.value = err ? (err as ApiError).data || 'Could not update the request' : `Encashment ${status.toLowerCase()}`
}
const withdraw = async (e: LeaveEncashment) => {
  busyId.value = e.id
  const { error: err } = await cancel(e.id)
  busyId.value = ''
  message.value = err ? (err as ApiError).data || 'Could not cancel' : 'Request cancelled'
}
const STATUS: Record<LeaveEncashment['status'], string> = {
  Pending: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  Approved: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  Rejected: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
  Cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
}
const inputCls = 'mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-hidden focus:border-[#1989d9]'
</script>

<template>
  <div class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden" data-section="encashment">
    <div class="p-4 sm:p-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0"><Banknote class="w-5 h-5" /></div>
        <div>
          <h2 class="text-base font-bold text-slate-900 dark:text-white">Leave Encashment</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Cash unused leave. Approved amounts are paid with the next payroll.</p>
        </div>
      </div>
      <button
        v-if="hasEmployeeProfile && encashable.length" type="button"
        class="self-start sm:self-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#1989d9] text-white hover:bg-[#1478c0] cursor-pointer"
        @click="openForm"
      >
        <Plus class="w-4 h-4" /> Request encashment
      </button>
    </div>
    <p v-if="!encashable.length" class="mx-4 sm:mx-6 mt-4 text-xs text-slate-500">No leave type allows encashment yet. HR can turn it on in a leave policy.</p>
    <p v-if="message" class="mx-4 sm:mx-6 mt-4 px-3 py-2 rounded-xl text-xs font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">{{ message }}</p>

    <div v-if="error" class="p-10 text-center text-sm text-rose-600">{{ (error as ApiError)?.data || 'Could not load encashments' }}</div>
    <div v-else-if="isLoading && !requests" class="p-10 text-center text-sm text-slate-400">Loading…</div>
    <div v-else-if="!requests?.length" class="p-10 flex flex-col items-center gap-2 text-sm text-slate-400"><Inbox class="w-8 h-8" /> No encashment requests.</div>
    <ul v-else class="divide-y divide-slate-100 dark:divide-slate-800">
      <li v-for="e in requests" :key="e.id" class="p-4 sm:px-6 flex flex-col lg:flex-row lg:items-center gap-3" :data-encashment="e.id">
        <div class="lg:w-56 shrink-0">
          <p class="text-sm font-bold text-slate-900 dark:text-white">{{ e.employeeId === myId ? 'You' : e.employeeName }}</p>
          <p class="text-xs text-slate-500">Applied {{ formatDay(e.appliedOn) }}</p>
        </div>
        <div class="flex-1 min-w-0 text-xs space-y-0.5">
          <p class="font-semibold text-slate-800 dark:text-slate-100">{{ e.days }} day(s) of {{ e.leaveType }} · {{ formatMoney(e.amount) }}</p>
          <p class="text-slate-500">{{ formatMoney(e.perDayAmount) }} per day<span v-if="e.paidIn"> · Paid in {{ e.paidIn }} payroll</span></p>
          <p v-if="e.reason" class="text-slate-600 dark:text-slate-300">“{{ e.reason }}”</p>
        </div>
        <div class="flex flex-wrap items-center gap-2 shrink-0">
          <span class="px-2.5 py-1 rounded-lg text-[11px] font-bold" :class="STATUS[e.status]">{{ e.status }}</span>
          <template v-if="e.canAct && e.status === 'Pending'">
            <button type="button" :disabled="busyId === e.id" class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white disabled:opacity-50 cursor-pointer" @click="act(e, 'Approved')"><CheckCircle2 class="w-3.5 h-3.5" /> Approve</button>
            <button type="button" :disabled="busyId === e.id" class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/50 disabled:opacity-50 cursor-pointer" @click="act(e, 'Rejected')"><XCircle class="w-3.5 h-3.5" /> Reject</button>
          </template>
          <button v-else-if="e.canCancel" type="button" :disabled="busyId === e.id" class="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 cursor-pointer" @click="withdraw(e)">Cancel</button>
        </div>
      </li>
    </ul>

    <div v-if="showForm" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs sm:p-4" @click.self="showForm = false">
      <form class="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-6 space-y-4" role="dialog" aria-label="Request encashment" @submit.prevent="submit">
        <div class="flex items-start justify-between">
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">Request leave encashment</h3>
          <button type="button" class="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" aria-label="Close" @click="showForm = false"><X class="w-5 h-5" /></button>
        </div>
        <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300">
          Leave type
          <select v-model="form.leaveType" :class="inputCls">
            <option v-for="p in encashable" :key="p.id" :value="p.name">{{ p.name }} — {{ availableFor(p.name) }} day(s) available<template v-if="p.maxEncashDays">, max {{ p.maxEncashDays }}/year</template></option>
          </select>
        </label>
        <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300">
          Days
          <input v-model="form.days" type="number" min="0.5" step="0.5" :class="inputCls" />
        </label>
        <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300">
          Reason (optional)
          <textarea v-model="form.reason" rows="2" maxlength="500" :class="[inputCls, 'resize-none']"></textarea>
        </label>
        <p v-if="formError" class="text-xs font-semibold text-rose-600">{{ formError }}</p>
        <button type="submit" :disabled="saving" class="w-full px-4 py-2.5 rounded-xl text-sm font-bold bg-[#1989d9] text-white disabled:opacity-50 cursor-pointer">{{ saving ? 'Sending…' : 'Send for approval' }}</button>
      </form>
    </div>
  </div>
</template>
