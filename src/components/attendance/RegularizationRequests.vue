<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowRight, CheckCircle2, ClipboardCheck, Inbox, XCircle } from '@lucide/vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiMutation, useApiQuery } from '@/redux/vueAdapter'
import { usePermissions } from '@/composables/usePermissions'
import type { ApiError } from '@/services/apiClient'
import type { RegularizationRequest } from '@/types/hrms'
import { formatDay } from './time'
import ListPagination from '@/components/common/ListPagination.vue'

// Attendance regularization requests the user can see: their own, plus their
// team's (managers) or everyone's (Super Admin / HR). Approve/Reject appears
// only for the person the request is currently waiting on.
const props = withDefaults(defineProps<{ from?: string; to?: string }>(), { from: undefined, to: undefined })
const { user } = usePermissions()
// With a date range (Requests & Approvals date filter) every status in that range is listed.
const { data: requests, isLoading, error } = useApiQuery<RegularizationRequest[]>(
  hrmsApi.endpoints.getRegularizations,
  () => (props.from ? { from: props.from, to: props.to || props.from } : undefined),
)
const [decide] = useApiMutation(hrmsApi.endpoints.updateRegularizationStatus)

const filter = ref<'Pending' | 'All'>(props.from ? 'All' : 'Pending')
watch(() => props.from, (from) => (filter.value = from ? 'All' : filter.value))
const myId = computed(() => user.value?.employeeId || '')
const scope = computed(() => user.value?.dataScope || 'own')
const title = computed(() => (scope.value === 'own' ? 'My Regularization Requests' : 'Regularization Requests'))

const list = computed(() => {
  const all = [...(requests.value || [])].sort((a, b) => b.date.localeCompare(a.date))
  return filter.value === 'Pending' ? all.filter((r) => r.status === 'Pending') : all
})

// 10 per page; back to page 1 whenever the filter or the date range changes.
const PAGE_SIZE = 10
const page = ref(1)
const paged = computed(() => list.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE))
watch([filter, () => props.from, () => props.to], () => (page.value = 1))
watch(
  () => list.value.length,
  (count) => (page.value = Math.min(page.value, Math.max(1, Math.ceil(count / PAGE_SIZE)))),
)
const waitingOnMe = computed(() => (requests.value || []).filter((r) => r.canAct).length)

const busyId = ref('')
const message = ref('')
const act = async (r: RegularizationRequest, status: 'Approved' | 'Rejected') => {
  busyId.value = r.id
  message.value = ''
  const { error: err } = await decide({ id: r.id, status })
  busyId.value = ''
  message.value = err ? (err as ApiError).data || 'Could not update the request' : `Request ${status.toLowerCase()}`
}

const STATUS: Record<RegularizationRequest['status'], string> = {
  Pending: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  Approved: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  Rejected: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
}
</script>

<template>
  <div class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
    <div class="p-4 sm:p-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-[#1989d9]/10 text-[#1989d9] flex items-center justify-center shrink-0">
          <ClipboardCheck class="w-5 h-5" />
        </div>
        <div>
          <h2 class="text-base font-bold text-slate-900 dark:text-white">{{ title }}</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            <template v-if="waitingOnMe">{{ waitingOnMe }} waiting for your approval · </template>
            Request one from a day in your attendance calendar
          </p>
        </div>
      </div>
      <div class="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 self-start sm:self-auto shrink-0">
        <button
          v-for="f in (['Pending', 'All'] as const)" :key="f"
          class="px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors"
          :class="filter === f ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'"
          @click="filter = f"
        >
          {{ f }}
        </button>
      </div>
    </div>

    <p v-if="message" class="mx-4 sm:mx-6 mt-4 px-3 py-2 rounded-xl text-xs font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">{{ message }}</p>

    <div v-if="error" class="p-10 text-center text-sm text-rose-600">{{ error?.data || 'Could not load requests' }}</div>
    <div v-else-if="isLoading && !requests" class="p-10 text-center text-sm text-slate-400">Loading…</div>
    <div v-else-if="!list.length" class="p-10 flex flex-col items-center gap-2 text-center text-sm text-slate-400">
      <Inbox class="w-8 h-8" />
      {{ filter === 'Pending' ? 'No pending regularization requests.' : 'No regularization requests yet.' }}
    </div>

    <ul v-else class="divide-y divide-slate-100 dark:divide-slate-800">
      <li v-for="r in paged" :key="r.id" class="p-4 sm:px-6 flex flex-col lg:flex-row lg:items-center gap-3">
        <div class="lg:w-56 shrink-0">
          <p class="text-sm font-bold text-slate-900 dark:text-white">
            {{ r.employeeId === myId ? 'You' : r.employeeName }}
          </p>
          <p class="text-xs text-slate-500 dark:text-slate-400">{{ formatDay(r.date) }}</p>
        </div>

        <div class="flex-1 min-w-0 space-y-1">
          <div class="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span class="text-slate-400 line-through" v-if="r.actualCheckIn || r.actualCheckOut">
              {{ r.actualCheckIn || '—' }} – {{ r.actualCheckOut || '—' }}
            </span>
            <span v-else class="text-slate-400">No punch</span>
            <ArrowRight class="w-3.5 h-3.5 text-slate-400" />
            <span class="font-bold text-slate-800 dark:text-slate-100">{{ r.correctedCheckIn || '—' }} – {{ r.correctedCheckOut || '—' }}</span>
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-300 break-words">“{{ r.reason }}”</p>
        </div>

        <div class="flex items-center gap-2 shrink-0">
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
        </div>
      </li>
    </ul>
    <ListPagination v-if="list.length > PAGE_SIZE" v-model:page="page" :total="list.length" :page-size="PAGE_SIZE" />
  </div>
</template>
