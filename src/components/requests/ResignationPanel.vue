<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CalendarClock, CheckCircle2, DoorOpen, Inbox, XCircle } from '@lucide/vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiMutation, useApiQuery } from '@/redux/vueAdapter'
import { usePermissions } from '@/composables/usePermissions'
import type { ApiError } from '@/services/apiClient'
import type { Resignation } from '@/types/hrms'
import { formatDay } from '@/components/attendance/time'

// The employee's own resignation (submit / status / withdraw) and, for
// reporting managers and HR, the resignations waiting for their decision.
const { user, hasEmployeeProfile } = usePermissions()
const { data: resignations, isLoading, error } = useApiQuery<Resignation[]>(hrmsApi.endpoints.getResignations)
const { data: policy } = useApiQuery<{ noticePeriodDays: number }>(hrmsApi.endpoints.getResignationPolicy)
const [submit, { isLoading: submitting }] = useApiMutation(hrmsApi.endpoints.submitResignation)
const [decide] = useApiMutation(hrmsApi.endpoints.decideResignation)
const [withdraw] = useApiMutation(hrmsApi.endpoints.withdrawResignation)

const myId = computed(() => user.value?.employeeId || '')
const mine = computed(() =>
  (resignations.value || []).filter((r) => r.employeeId === myId.value).sort((a, b) => Number(b.id) - Number(a.id)),
)
const current = computed(() => mine.value.find((r) => ['Pending', 'Approved', 'Completed'].includes(r.status)))
const others = computed(() =>
  (resignations.value || []).filter((r) => r.employeeId !== myId.value).sort((a, b) => Number(b.id) - Number(a.id)),
)
const toReview = computed(() => others.value.filter((r) => r.status === 'Pending'))

// ---- submit
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const addDays = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return iso(d)
}
const todayIso = iso(new Date())
const noticeDays = computed(() => policy.value?.noticePeriodDays ?? 30)
const form = ref({ reason: '', lastWorkingDay: addDays(30) })
watch(noticeDays, (days) => (form.value.lastWorkingDay = addDays(days)), { immediate: true })
const confirmText = ref('')
const formError = ref('')
const message = ref('')
const daysUntil = (dateIso: string) => Math.round((new Date(`${dateIso}T00:00:00`).getTime() - new Date(`${todayIso}T00:00:00`).getTime()) / 86400000)

const submitForm = async () => {
  formError.value = ''
  if (form.value.reason.trim().length < 5) return (formError.value = 'Please share a reason (at least 5 characters)')
  if (!form.value.lastWorkingDay || form.value.lastWorkingDay < todayIso) return (formError.value = 'Choose a last working day from today onwards')
  if (confirmText.value.trim().toUpperCase() !== 'RESIGN') return (formError.value = 'Type RESIGN to confirm')
  const { error: err } = await submit({ reason: form.value.reason.trim(), lastWorkingDay: form.value.lastWorkingDay })
  if (err) return (formError.value = (err as ApiError).data || 'Could not submit your resignation')
  confirmText.value = ''
  message.value = 'Your resignation has been submitted for approval.'
}

const busyId = ref('')
const withdrawMine = async (r: Resignation) => {
  if (!confirm('Withdraw your resignation?')) return
  busyId.value = r.id
  const { error: err } = await withdraw(r.id)
  busyId.value = ''
  message.value = err ? (err as ApiError).data || 'Could not withdraw' : 'Your resignation has been withdrawn.'
}

// ---- review (managers / HR); the approver may confirm a different last day
const lastDayEdits = ref<Record<string, string>>({})
const act = async (r: Resignation, status: 'Approved' | 'Rejected') => {
  busyId.value = r.id
  message.value = ''
  const lastWorkingDay = status === 'Approved' ? lastDayEdits.value[r.id] || undefined : undefined
  const { error: err } = await decide({ id: r.id, status, lastWorkingDay })
  busyId.value = ''
  message.value = err ? (err as ApiError).data || 'Could not update the resignation' : `Resignation of ${r.employeeName} ${status.toLowerCase()}`
}

const STATUS: Record<Resignation['status'], string> = {
  Pending: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  Approved: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
  Completed: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  Rejected: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
  Withdrawn: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
}
const inputCls =
  'mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-hidden focus:border-[#1989d9]'
</script>

<template>
  <div class="space-y-6">
    <p v-if="message" class="px-3 py-2 rounded-xl text-xs font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">{{ message }}</p>
    <div v-if="error" class="p-6 rounded-3xl border border-rose-200 text-center text-sm text-rose-600">{{ error?.data || 'Could not load resignations' }}</div>

    <!-- My resignation -->
    <section v-if="hasEmployeeProfile" class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 sm:p-6">
      <div class="flex items-center gap-3 mb-5">
        <div class="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
          <DoorOpen class="w-5 h-5" />
        </div>
        <div>
          <h2 class="text-base font-bold text-slate-900 dark:text-white">My Resignation</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Company notice period: {{ noticeDays }} days</p>
        </div>
      </div>

      <div v-if="isLoading && !resignations" class="text-sm text-slate-400">Loading…</div>

      <!-- Status of an active resignation -->
      <div v-else-if="current" class="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
        <div class="space-y-2">
          <span class="inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold" :class="STATUS[current.status]">
            {{ current.status === 'Approved' ? 'Approved · serving notice period' : current.status === 'Pending' ? 'Waiting for approval' : current.status }}
          </span>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <p class="text-slate-400 font-semibold uppercase text-[10px]">Submitted</p>
              <p class="font-bold text-slate-800 dark:text-slate-100">{{ formatDay(current.submittedOn) }}</p>
            </div>
            <div>
              <p class="text-slate-400 font-semibold uppercase text-[10px]">{{ current.lastWorkingDay ? 'Last working day' : 'Proposed last day' }}</p>
              <p class="font-bold text-slate-800 dark:text-slate-100">{{ formatDay(current.lastWorkingDay || current.proposedLastDay) }}</p>
            </div>
            <div v-if="current.status !== 'Completed'">
              <p class="text-slate-400 font-semibold uppercase text-[10px]">Days remaining</p>
              <p class="font-bold text-slate-800 dark:text-slate-100">{{ Math.max(daysUntil(current.lastWorkingDay || current.proposedLastDay), 0) }}</p>
            </div>
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-300">“{{ current.reason }}”</p>
        </div>
        <button
          v-if="current.canWithdraw"
          class="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
          :disabled="busyId === current.id" @click="withdrawMine(current)"
        >
          Withdraw resignation
        </button>
      </div>

      <!-- Submit form -->
      <form v-else class="grid gap-4 md:grid-cols-2" @submit.prevent="submitForm">
        <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 md:col-span-2">
          Reason for leaving
          <textarea v-model="form.reason" rows="3" maxlength="2000" :class="[inputCls, 'resize-none']" placeholder="Share your reason for resigning"></textarea>
        </label>
        <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300">
          Proposed last working day
          <input v-model="form.lastWorkingDay" type="date" :min="todayIso" :class="inputCls" />
          <span class="block mt-1 font-normal text-slate-400">
            {{ daysUntil(form.lastWorkingDay) }} day(s) of notice<template v-if="daysUntil(form.lastWorkingDay) < noticeDays"> — shorter than the {{ noticeDays }}-day policy; your approver decides</template>
          </span>
        </label>
        <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300">
          Type <strong>RESIGN</strong> to confirm
          <input v-model="confirmText" type="text" autocomplete="off" :class="inputCls" placeholder="RESIGN" />
        </label>
        <p v-if="formError" class="text-xs font-semibold text-rose-600 md:col-span-2">{{ formError }}</p>
        <div class="md:col-span-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p class="text-[11px] text-slate-400">
            It goes to your reporting manager and HR. After approval you serve the notice period; your login is closed after the last working day.
          </p>
          <button type="submit" :disabled="submitting" class="px-5 py-2.5 rounded-xl text-sm font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer shrink-0">
            {{ submitting ? 'Submitting…' : 'Submit resignation' }}
          </button>
        </div>
      </form>

      <details v-if="mine.length > (current ? 1 : 0)" class="mt-5 text-xs text-slate-500">
        <summary class="cursor-pointer font-semibold">Earlier resignations</summary>
        <ul class="mt-2 space-y-1">
          <li v-for="r in mine.filter((m) => m !== current)" :key="r.id">
            {{ formatDay(r.submittedOn) }} — <span class="font-bold">{{ r.status }}</span>
          </li>
        </ul>
      </details>
    </section>

    <!-- Review: managers and HR -->
    <section v-if="others.length" class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
      <div class="p-4 sm:p-6 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
        <div class="w-10 h-10 rounded-2xl bg-[#1989d9]/10 text-[#1989d9] flex items-center justify-center shrink-0">
          <CalendarClock class="w-5 h-5" />
        </div>
        <div>
          <h2 class="text-base font-bold text-slate-900 dark:text-white">Resignation Requests</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{{ toReview.filter((r) => r.canAct).length }} waiting for your decision</p>
        </div>
      </div>
      <div v-if="!others.length" class="p-10 flex flex-col items-center gap-2 text-sm text-slate-400">
        <Inbox class="w-8 h-8" /> No resignations
      </div>
      <ul class="divide-y divide-slate-100 dark:divide-slate-800">
        <li v-for="r in others" :key="r.id" class="p-4 sm:px-6 flex flex-col xl:flex-row xl:items-center gap-3">
          <div class="xl:w-64 shrink-0">
            <p class="text-sm font-bold text-slate-900 dark:text-white">{{ r.employeeName }}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">{{ r.employeeCode }} · {{ r.designation }} · {{ r.department }}</p>
          </div>
          <div class="flex-1 min-w-0 space-y-1 text-xs">
            <p class="text-slate-600 dark:text-slate-300">
              Submitted {{ formatDay(r.submittedOn) }} ·
              {{ r.lastWorkingDay ? 'Last day' : 'Proposed last day' }} <strong>{{ formatDay(r.lastWorkingDay || r.proposedLastDay) }}</strong>
              ({{ r.noticeDays }} days' notice)
            </p>
            <p class="text-slate-600 dark:text-slate-300 break-words">“{{ r.reason }}”</p>
          </div>
          <div class="flex flex-wrap items-end gap-2 shrink-0">
            <span class="px-2.5 py-1 rounded-lg text-[11px] font-bold" :class="STATUS[r.status]">{{ r.status }}</span>
            <template v-if="r.canAct && r.status === 'Pending'">
              <label class="text-[10px] font-semibold text-slate-400 uppercase">
                Last working day
                <input
                  type="date" :min="r.submittedOn" :value="lastDayEdits[r.id] || r.proposedLastDay"
                  class="block mt-0.5 px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs normal-case"
                  @input="lastDayEdits[r.id] = ($event.target as HTMLInputElement).value"
                />
              </label>
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
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>
