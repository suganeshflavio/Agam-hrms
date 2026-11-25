<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CheckCircle2, Home, Inbox, Plus, X, XCircle } from '@lucide/vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiMutation, useApiQuery } from '@/redux/vueAdapter'
import { usePermissions } from '@/composables/usePermissions'
import type { ApiError } from '@/services/apiClient'
import type { RemoteWorkRequest } from '@/types/hrms'
import { formatDay } from '@/components/attendance/time'

// Work-from-home applications: applied for a date range like leave and approved
// through the company's WFH approval workflow. Approved days show as "WFH" in
// the attendance calendar and count as attended (no clock-in needed).
const props = withDefaults(defineProps<{ onlyMine?: boolean; from?: string; to?: string }>(), {
  onlyMine: false,
  from: undefined,
  to: undefined,
})

const { user, hasEmployeeProfile } = usePermissions()
// With a date range (Requests & Approvals date filter) every status in that range is listed.
const { data: requests, isLoading, error } = useApiQuery<RemoteWorkRequest[]>(
  hrmsApi.endpoints.getRemoteWork,
  () => (props.from ? { from: props.from, to: props.to || props.from } : undefined),
)
const [apply, { isLoading: applying }] = useApiMutation(hrmsApi.endpoints.applyWfh)
const [decide] = useApiMutation(hrmsApi.endpoints.decideRemoteWork)
const [cancel] = useApiMutation(hrmsApi.endpoints.cancelRemoteWork)

const myId = computed(() => user.value?.employeeId || '')
const filter = ref<'Pending' | 'All'>(props.onlyMine || props.from ? 'All' : 'Pending')
watch(() => props.from, (from) => (filter.value = from ? 'All' : filter.value))
const list = computed(() => {
  let all = [...(requests.value || [])]
  if (props.onlyMine) all = all.filter((r) => r.employeeId === myId.value)
  all.sort((a, b) => b.fromDate.localeCompare(a.fromDate) || Number(b.id) - Number(a.id))
  return filter.value === 'Pending' ? all.filter((r) => r.status === 'Pending') : all
})
const waitingOnMe = computed(() => (requests.value || []).filter((r) => r.canAct && r.status === 'Pending').length)

// ---- apply form
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const shift = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return iso(d)
}
const todayIso = iso(new Date())
const showForm = ref(false)
const form = ref({ fromDate: todayIso, toDate: todayIso, reason: '' })
const formError = ref('')
const message = ref('')
const openForm = () => {
  form.value = { fromDate: todayIso, toDate: todayIso, reason: '' }
  formError.value = ''
  showForm.value = true
}
// Weekdays in the range (the server also excludes holidays and weekly offs).
const weekdays = computed(() => {
  const { fromDate, toDate } = form.value
  if (!fromDate || !toDate || toDate < fromDate) return 0
  let count = 0
  for (let d = new Date(`${fromDate}T00:00:00`); iso(d) <= toDate; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) count++
  }
  return count
})
const submitForm = async () => {
  formError.value = ''
  const f = form.value
  if (!f.fromDate) return (formError.value = 'Choose the start date')
  if (f.toDate && f.toDate < f.fromDate) return (formError.value = 'The end date must be on or after the start date')
  if (f.reason.trim().length < 5) return (formError.value = 'Please give a reason (at least 5 characters)')
  const { error: err } = await apply({ fromDate: f.fromDate, toDate: f.toDate || f.fromDate, reason: f.reason.trim() })
  if (err) return (formError.value = (err as ApiError).data || 'Could not apply for work from home')
  showForm.value = false
  message.value = 'Work from home applied. It shows as WFH in your attendance calendar once approved.'
}

// ---- approve / reject / cancel
const busyId = ref('')
const act = async (r: RemoteWorkRequest, status: 'Approved' | 'Rejected') => {
  busyId.value = r.id
  message.value = ''
  const { error: err } = await decide({ id: r.id, status })
  busyId.value = ''
  message.value = err ? (err as ApiError).data || 'Could not update the application' : `Application ${status.toLowerCase()}`
}
const withdraw = async (r: RemoteWorkRequest) => {
  busyId.value = r.id
  const { error: err } = await cancel(r.id)
  busyId.value = ''
  message.value = err ? (err as ApiError).data || 'Could not cancel the application' : 'Application cancelled'
}

const range = (r: RemoteWorkRequest) => (r.fromDate === r.toDate ? formatDay(r.fromDate) : `${formatDay(r.fromDate)} – ${formatDay(r.toDate)}`)
const STATUS: Record<RemoteWorkRequest['status'], string> = {
  Pending: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  Approved: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  Rejected: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
  Cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
}
const inputCls =
  'mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-hidden focus:border-[#1989d9]'
</script>

<template>
  <div class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
    <div class="p-4 sm:p-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
          <Home class="w-5 h-5" />
        </div>
        <div class="min-w-0">
          <h2 class="text-base font-bold text-slate-900 dark:text-white">Work From Home</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            <template v-if="waitingOnMe">{{ waitingOnMe }} waiting for your approval · </template>
            Approved days show as WFH in the attendance calendar
          </p>
        </div>
      </div>
      <div class="scroll-row items-center gap-2 max-w-full">
        <div class="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 shrink-0">
          <button
            v-for="f in (['Pending', 'All'] as const)" :key="f"
            class="px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors whitespace-nowrap"
            :class="filter === f ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'"
            @click="filter = f"
          >
            {{ f }}
          </button>
        </div>
        <button
          v-if="hasEmployeeProfile"
          class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 bg-[#1989d9] text-white hover:bg-[#1478c0] shadow-sm shadow-[#1989d9]/30 cursor-pointer"
          @click="openForm"
        >
          <Plus class="w-4 h-4" /> Apply Work From Home
        </button>
      </div>
    </div>

    <p v-if="message" class="mx-4 sm:mx-6 mt-4 px-3 py-2 rounded-xl text-xs font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">{{ message }}</p>

    <div v-if="error" class="p-10 text-center text-sm text-rose-600">{{ error?.data || 'Could not load applications' }}</div>
    <div v-else-if="isLoading && !requests" class="p-10 text-center text-sm text-slate-400">Loading…</div>
    <div v-else-if="!list.length" class="p-10 flex flex-col items-center gap-2 text-center text-sm text-slate-400">
      <Inbox class="w-8 h-8" />
      {{ filter === 'Pending' ? 'No applications waiting for approval.' : 'No work-from-home applications yet.' }}
    </div>

    <ul v-else class="divide-y divide-slate-100 dark:divide-slate-800">
      <li v-for="r in list" :key="r.id" class="p-4 sm:px-6 flex flex-col lg:flex-row lg:items-center gap-3">
        <div class="lg:w-56 shrink-0">
          <p class="text-sm font-bold text-slate-900 dark:text-white">{{ r.employeeId === myId ? 'You' : r.employeeName }}</p>
          <p class="text-xs text-slate-500 dark:text-slate-400">Applied {{ formatDay(r.appliedOn) }}</p>
        </div>
        <div class="flex-1 min-w-0 space-y-1">
          <p class="flex flex-wrap items-center gap-2 text-xs">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
              <Home class="w-3 h-3" /> WFH
            </span>
            <span class="font-semibold text-slate-800 dark:text-slate-100">{{ range(r) }}</span>
            <span class="text-slate-500">· {{ r.days }} working day(s)</span>
          </p>
          <p class="text-xs text-slate-600 dark:text-slate-300 break-words">“{{ r.reason }}”</p>
        </div>
        <div class="flex flex-wrap items-center gap-2 shrink-0">
          <span class="px-2.5 py-1 rounded-lg text-[11px] font-bold" :class="STATUS[r.status]">{{ r.status }}</span>
          <template v-if="r.canAct && r.status === 'Pending'">
            <button
              class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 cursor-pointer"
              :disabled="busyId === r.id" @click="act(r, 'Approved')"
            >
              <CheckCircle2 class="w-3.5 h-3.5" /> Approve
            </button>
            <button
              class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/50 disabled:opacity-50 cursor-pointer"
              :disabled="busyId === r.id" @click="act(r, 'Rejected')"
            >
              <XCircle class="w-3.5 h-3.5" /> Reject
            </button>
          </template>
          <button
            v-else-if="r.canCancel && r.status === 'Pending'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
            :disabled="busyId === r.id" @click="withdraw(r)"
          >
            Cancel
          </button>
        </div>
      </li>
    </ul>

    <!-- Apply modal (a bottom sheet on phones) -->
    <div v-if="showForm" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs sm:p-4" @click.self="showForm = false">
      <form class="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-6 space-y-4 max-h-[92vh] overflow-y-auto" @submit.prevent="submitForm">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-lg font-bold text-slate-900 dark:text-white">Apply Work From Home</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Goes to your approver. Approved days show as WFH — no clock-in needed.</p>
          </div>
          <button type="button" class="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" @click="showForm = false">
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            From
            <input v-model="form.fromDate" type="date" :min="shift(-60)" :max="shift(60)" :class="inputCls" />
          </label>
          <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            To
            <input v-model="form.toDate" type="date" :min="form.fromDate" :max="shift(60)" :class="inputCls" />
          </label>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          {{ weekdays }} weekday(s) — company holidays and weekly offs are not counted.
        </p>
        <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300">
          Reason
          <textarea v-model="form.reason" rows="3" maxlength="1000" :class="[inputCls, 'resize-none']" placeholder="e.g. Internet installation at home"></textarea>
        </label>
        <p v-if="formError" class="text-xs font-semibold text-rose-600">{{ formError }}</p>
        <div class="flex gap-2 pt-1">
          <button type="button" class="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" @click="showForm = false">
            Cancel
          </button>
          <button type="submit" :disabled="applying" class="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-[#1989d9] text-white hover:bg-[#1478c0] disabled:opacity-50 cursor-pointer">
            {{ applying ? 'Sending…' : 'Apply' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
