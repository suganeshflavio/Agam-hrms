<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { BadgeCheck, CalendarClock, MessageSquareText, Star, X } from '@lucide/vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiMutation, useApiQuery } from '@/redux/vueAdapter'
import type { ApiError } from '@/services/apiClient'
import type { ProbationRecord } from '@/types/hrms'
import { formatDay } from '@/components/attendance/time'

// Probation management (SRS 6.3): who is on probation, manager feedback, HR confirm / extend.
const router = useRouter()
const { data: records, isLoading, error } = useApiQuery<ProbationRecord[]>(hrmsApi.endpoints.getProbation)
const [reviewProbation, { isLoading: saving }] = useApiMutation(hrmsApi.endpoints.reviewProbation)

const filter = ref<'all' | 'due' | 'overdue'>('all')
const list = computed(() => {
  const all = records.value || []
  if (filter.value === 'due') return all.filter((r) => r.daysLeft != null && r.daysLeft >= 0 && r.daysLeft <= 14)
  if (filter.value === 'overdue') return all.filter((r) => r.daysLeft != null && r.daysLeft < 0)
  return all
})
const count = (f: 'due' | 'overdue') =>
  (records.value || []).filter((r) => r.daysLeft != null && (f === 'overdue' ? r.daysLeft < 0 : r.daysLeft >= 0 && r.daysLeft <= 14)).length

const dueLabel = (r: ProbationRecord) => {
  if (r.daysLeft == null) return 'No end date set'
  if (r.daysLeft < 0) return `Overdue by ${-r.daysLeft} day${r.daysLeft === -1 ? '' : 's'}`
  if (r.daysLeft === 0) return 'Ends today'
  return `${r.daysLeft} day${r.daysLeft === 1 ? '' : 's'} left`
}
const dueClass = (r: ProbationRecord) =>
  r.daysLeft == null ? 'bg-slate-100 text-slate-600' : r.daysLeft < 0 ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' : r.daysLeft <= 14 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'

// ---- Action dialog
const message = ref('')
const flash = (text: string) => {
  message.value = text
  setTimeout(() => (message.value = ''), 3500)
}
type Mode = 'feedback' | 'confirm' | 'extend'
const active = ref<{ record: ProbationRecord; mode: Mode } | null>(null)
const form = ref({ feedback: '', rating: 0, recommendation: 'confirm' as 'confirm' | 'extend', newEndDate: '' })
const formError = ref('')
const open = (record: ProbationRecord, mode: Mode) => {
  const base = record.probationEndDate ? new Date(`${record.probationEndDate}T00:00:00`) : new Date()
  base.setMonth(base.getMonth() + 3)
  form.value = { feedback: '', rating: 0, recommendation: 'confirm', newEndDate: base.toISOString().slice(0, 10) }
  formError.value = ''
  active.value = { record, mode }
}
const submit = async () => {
  if (!active.value) return
  const { record, mode } = active.value
  if (mode === 'feedback' && !form.value.feedback.trim()) return (formError.value = 'Write your feedback')
  if (mode === 'extend' && !form.value.newEndDate) return (formError.value = 'Choose the new end date')
  const { error: err } = await reviewProbation({
    employeeId: record.employeeId, outcome: mode, feedback: form.value.feedback.trim() || undefined,
    ...(mode === 'feedback' ? { rating: form.value.rating || undefined, recommendation: form.value.recommendation } : {}),
    ...(mode === 'extend' ? { newEndDate: form.value.newEndDate } : {}),
  })
  if (err) return (formError.value = (err as ApiError).data || 'Could not save')
  flash(mode === 'confirm' ? `${record.employeeName} is now confirmed` : mode === 'extend' ? 'Probation extended' : 'Feedback saved')
  active.value = null
}
const TITLES: Record<Mode, string> = { feedback: 'Probation feedback', confirm: 'Confirm employment', extend: 'Extend probation' }
const chip = (on: boolean) => (on ? 'bg-[#1989d9] border-[#1989d9] text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300')
const input = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-[#1989d9]/30'
</script>

<template>
  <div class="space-y-5 max-w-6xl mx-auto">
    <div>
      <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Probation Reviews</h1>
      <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Employees on probation. Managers give feedback; HR confirms or extends.</p>
    </div>

    <div class="flex flex-wrap gap-2 text-xs">
      <button type="button" class="px-3.5 py-2 rounded-2xl border font-bold cursor-pointer" :class="chip(filter === 'all')" @click="filter = 'all'">All {{ records?.length || 0 }}</button>
      <button type="button" class="px-3.5 py-2 rounded-2xl border font-bold cursor-pointer" :class="chip(filter === 'due')" @click="filter = 'due'">Due in 14 days {{ count('due') }}</button>
      <button type="button" class="px-3.5 py-2 rounded-2xl border font-bold cursor-pointer" :class="chip(filter === 'overdue')" @click="filter = 'overdue'">Overdue {{ count('overdue') }}</button>
    </div>

    <p v-if="message" class="px-3 py-2 rounded-xl text-xs font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">{{ message }}</p>
    <div v-if="error" class="p-10 rounded-3xl border border-rose-200 text-center text-sm text-rose-600">{{ (error as ApiError)?.data || 'Could not load probation records' }}</div>
    <div v-else-if="isLoading && !records" class="h-40 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse"></div>
    <p v-else-if="!list.length" class="p-10 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-sm text-slate-500">No one on probation here.</p>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div v-for="r in list" :key="r.employeeId" :data-probation="r.employeeId" class="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <button type="button" class="text-base font-bold text-slate-900 dark:text-white hover:text-[#1989d9] text-left cursor-pointer" @click="router.push(`/employees/${r.employeeId}`)">{{ r.employeeName }}</button>
            <p class="text-xs text-slate-500 dark:text-slate-400">{{ r.employeeCode }} · {{ r.designation }} · {{ r.department }}</p>
          </div>
          <span class="px-2 py-1 rounded-lg text-[11px] font-bold shrink-0" :class="dueClass(r)">{{ dueLabel(r) }}</span>
        </div>
        <div class="grid grid-cols-3 gap-2 text-xs">
          <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50"><p class="text-[10px] uppercase font-semibold text-slate-400">Joined</p><p class="font-bold">{{ formatDay(r.joiningDate) }}</p></div>
          <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50"><p class="text-[10px] uppercase font-semibold text-slate-400">Ends</p><p class="font-bold">{{ r.probationEndDate ? formatDay(r.probationEndDate) : '—' }}</p></div>
          <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 min-w-0"><p class="text-[10px] uppercase font-semibold text-slate-400">Manager</p><p class="font-bold truncate">{{ r.reportingManagerName || '—' }}</p></div>
        </div>

        <div v-if="r.reviews.length" class="space-y-2">
          <div v-for="rv in r.reviews" :key="rv.id" class="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
            <div class="flex items-center justify-between gap-2">
              <span class="font-bold text-slate-700 dark:text-slate-200">{{ rv.outcome }} · {{ rv.reviewerName }}</span>
              <span class="text-slate-400">{{ formatDay(rv.createdAt.slice(0, 10)) }}</span>
            </div>
            <p v-if="rv.rating || rv.recommendation" class="mt-1 flex items-center gap-2 text-slate-500">
              <span v-if="rv.rating" class="inline-flex items-center gap-0.5 text-amber-500"><Star v-for="i in rv.rating" :key="i" class="w-3 h-3 fill-current" /></span>
              <span v-if="rv.recommendation">Recommends: <b>{{ rv.recommendation }}</b></span>
            </p>
            <p v-if="rv.newEndDate" class="mt-1 text-slate-500">New end date: {{ formatDay(rv.newEndDate) }}</p>
            <p v-if="rv.feedback" class="mt-1 text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{{ rv.feedback }}</p>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <button v-if="r.canReview" type="button" class="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer" @click="open(r, 'feedback')">
            <MessageSquareText class="w-4 h-4" /> Add feedback
          </button>
          <button v-if="r.canDecide" type="button" class="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-300 text-xs font-bold cursor-pointer" @click="open(r, 'extend')">
            <CalendarClock class="w-4 h-4" /> Extend
          </button>
          <button v-if="r.canDecide" type="button" class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer" @click="open(r, 'confirm')">
            <BadgeCheck class="w-4 h-4" /> Confirm
          </button>
        </div>
      </div>
    </div>

    <div v-if="active" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs sm:p-4" @click.self="active = null">
      <form class="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-6 space-y-4" role="dialog" aria-modal="true" :aria-label="TITLES[active.mode]" @submit.prevent="submit">
        <div class="flex items-start justify-between">
          <div>
            <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ TITLES[active.mode] }}</h3>
            <p class="text-xs text-slate-500">{{ active.record.employeeName }}</p>
          </div>
          <button type="button" class="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" aria-label="Close" @click="active = null"><X class="w-5 h-5" /></button>
        </div>
        <template v-if="active.mode === 'feedback'">
          <div>
            <p class="text-xs font-semibold text-slate-500 mb-1.5">Rating</p>
            <div class="flex gap-1">
              <button v-for="i in 5" :key="i" type="button" class="p-1 cursor-pointer" :aria-label="`${i} stars`" @click="form.rating = i">
                <Star class="w-6 h-6" :class="i <= form.rating ? 'text-amber-400 fill-current' : 'text-slate-300'" />
              </button>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <button type="button" class="px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer" :class="chip(form.recommendation === 'confirm')" @click="form.recommendation = 'confirm'">Recommend confirm</button>
            <button type="button" class="px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer" :class="chip(form.recommendation === 'extend')" @click="form.recommendation = 'extend'">Recommend extend</button>
          </div>
        </template>
        <div v-if="active.mode === 'extend'">
          <label class="text-xs font-semibold text-slate-500" for="newEnd">New probation end date</label>
          <input id="newEnd" v-model="form.newEndDate" type="date" :class="input" />
        </div>
        <p v-if="active.mode === 'confirm'" class="text-sm text-slate-600 dark:text-slate-300">
          {{ active.record.employeeName }} becomes a confirmed employee from today and is notified.
        </p>
        <div>
          <label class="text-xs font-semibold text-slate-500" for="fb">{{ active.mode === 'feedback' ? 'Feedback' : 'Notes (optional)' }}</label>
          <textarea id="fb" v-model="form.feedback" rows="4" :class="input"></textarea>
        </div>
        <p v-if="formError" class="text-xs font-semibold text-rose-600">{{ formError }}</p>
        <button type="submit" :disabled="saving" class="w-full px-4 py-2.5 rounded-xl text-sm font-bold bg-[#1989d9] text-white disabled:opacity-50 cursor-pointer">
          {{ saving ? 'Saving…' : active.mode === 'confirm' ? 'Confirm employment' : active.mode === 'extend' ? 'Extend probation' : 'Save feedback' }}
        </button>
      </form>
    </div>
  </div>
</template>
