<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  LogIn,
  LogOut,
  Plane,
  Timer,
  XCircle,
  FilePenLine,
  Hourglass,
  Home,
} from '@lucide/vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiMutation, useApiQuery } from '@/redux/vueAdapter'
import { usePermissions } from '@/composables/usePermissions'
import type { ApiError } from '@/services/apiClient'
import type { AttendanceCalendar, AttendanceDayStatus, RegularizationRequest } from '@/types/hrms'
import { STATUS_BADGE, STATUS_LABELS } from './statusStyles'
import { to24h } from './time'

// A month of attendance: green = attendance marked, red = missed.
const props = withDefaults(
  defineProps<{ employeeId?: string; title?: string; regularizeDate?: string }>(),
  { employeeId: undefined, title: 'My Attendance', regularizeDate: undefined },
)

type Day = AttendanceCalendar['days'][number]

const pad = (n: number) => String(n).padStart(2, '0')
const now = new Date()
const todayIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
const year = ref(now.getFullYear())
const month = ref(now.getMonth()) // 0-based
const monthKey = computed(() => `${year.value}-${pad(month.value + 1)}`)
const monthLabel = computed(() => new Date(year.value, month.value, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))
const isCurrentMonth = computed(() => year.value === now.getFullYear() && month.value === now.getMonth())

const { data: calendar, isLoading, error } = useApiQuery<AttendanceCalendar>(
  hrmsApi.endpoints.getAttendanceCalendar,
  () => ({ month: monthKey.value, employeeId: props.employeeId }),
)

const selectedDate = ref(todayIso)
const shiftMonth = (delta: number) => {
  const d = new Date(year.value, month.value + delta, 1)
  year.value = d.getFullYear()
  month.value = d.getMonth()
}
const goToToday = () => {
  year.value = now.getFullYear()
  month.value = now.getMonth()
  selectedDate.value = todayIso
}
// Keep a sensible day selected when the month changes.
watch(monthKey, (key) => {
  if (!selectedDate.value.startsWith(key)) selectedDate.value = key === todayIso.slice(0, 7) ? todayIso : `${key}-01`
})

// Monday-first grid, padded to whole weeks.
const cells = computed<(Day | null)[]>(() => {
  const days = calendar.value?.days || []
  if (!days.length) return []
  const lead = (new Date(year.value, month.value, 1).getDay() + 6) % 7
  const grid: (Day | null)[] = [...Array.from({ length: lead }, () => null), ...days]
  while (grid.length % 7) grid.push(null)
  return grid
})

const MARKED: AttendanceDayStatus[] = ['present', 'late', 'half_day']
const isMarked = (s: AttendanceDayStatus) => MARKED.includes(s)

// Cell look per status. Marked days are solid green, missed days solid red.
const CELL: Record<AttendanceDayStatus, string> = {
  present: 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/30',
  late: 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/30',
  half_day: 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/30',
  absent: 'bg-rose-500 text-white border-rose-500 shadow-sm shadow-rose-500/30',
  wfh: 'bg-sky-500 text-white border-sky-500 shadow-sm shadow-sky-500/30',
  on_leave: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900',
  holiday: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900',
  weekly_off: 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800/60 dark:text-slate-500 dark:border-slate-700',
  not_marked: 'bg-amber-50 text-amber-800 border-amber-400 border-dashed dark:bg-amber-950/30 dark:text-amber-300',
  upcoming: 'bg-white text-slate-400 border-slate-200 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-800',
}

const SHORT: Partial<Record<AttendanceDayStatus, string>> = {
  late: 'Late',
  half_day: 'Half day',
  absent: 'Absent',
  wfh: 'WFH',
  on_leave: 'Leave',
  holiday: 'Holiday',
  weekly_off: 'Off',
  not_marked: 'Mark now',
}

const summary = computed(() => {
  const s = calendar.value?.summary || {}
  const marked = (s.present || 0) + (s.late || 0) + (s.half_day || 0)
  const missed = s.absent || 0
  const wfh = s.wfh || 0
  const worked = marked + wfh + missed
  return {
    marked,
    missed,
    wfh,
    late: s.late || 0,
    leave: s.on_leave || 0,
    rate: worked ? Math.round(((marked + wfh) / worked) * 100) : null,
  }
})

const stats = computed(() => [
  { label: 'Days present', value: summary.value.marked, icon: CheckCircle2, cls: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400' },
  { label: 'Work from home', value: summary.value.wfh, icon: Home, cls: 'text-sky-600 bg-sky-50 dark:bg-sky-950/50 dark:text-sky-300' },
  { label: 'Days missed', value: summary.value.missed, icon: XCircle, cls: 'text-rose-600 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-400' },
  { label: 'Late arrivals', value: summary.value.late, icon: Timer, cls: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400' },
  { label: 'On leave', value: summary.value.leave, icon: Plane, cls: 'text-violet-600 bg-violet-50 dark:bg-violet-950/50 dark:text-violet-300' },
])

const legend = [
  { label: 'Marked', cls: 'bg-emerald-500' },
  { label: 'Work from home', cls: 'bg-sky-500' },
  { label: 'Missed', cls: 'bg-rose-500' },
  { label: 'Today, not marked', cls: 'bg-amber-50 border border-dashed border-amber-400' },
  { label: 'Leave', cls: 'bg-violet-200 dark:bg-violet-800' },
  { label: 'Holiday', cls: 'bg-cyan-100 dark:bg-cyan-900' },
  { label: 'Weekly off', cls: 'bg-slate-200 dark:bg-slate-700' },
  { label: 'Regularization pending', cls: 'bg-amber-400 rounded-full' },
  { label: 'WFH pending approval', cls: 'bg-sky-400 rounded-full' },
]

const weekdays = [
  { short: 'M', long: 'Mon' },
  { short: 'T', long: 'Tue' },
  { short: 'W', long: 'Wed' },
  { short: 'T', long: 'Thu' },
  { short: 'F', long: 'Fri' },
  { short: 'S', long: 'Sat' },
  { short: 'S', long: 'Sun' },
]

const selectedDay = computed(() => calendar.value?.days.find((d) => d.date === selectedDate.value))

// ---- Regularization: ask the reporting authority to correct a day's attendance
const { user } = usePermissions()
const myId = computed(() => props.employeeId || user.value?.employeeId || '')
const ownCalendar = computed(() => !props.employeeId || props.employeeId === user.value?.employeeId)
const { data: regularizations } = useApiQuery<RegularizationRequest[]>(hrmsApi.endpoints.getRegularizations)
const [submitRegularization, { isLoading: submitting }] = useApiMutation(hrmsApi.endpoints.submitRegularization)

const myRequests = computed(() => (regularizations.value || []).filter((r) => r.employeeId === myId.value))
const pendingDates = computed(() => new Set(myRequests.value.filter((r) => r.status === 'Pending').map((r) => r.date)))
const requestForDay = computed(() =>
  myRequests.value.filter((r) => r.date === selectedDate.value).sort((a, b) => Number(b.id) - Number(a.id))[0],
)
const REGULARIZABLE: AttendanceDayStatus[] = ['absent', 'not_marked', 'present', 'late', 'half_day']
const canRequest = computed(
  () =>
    ownCalendar.value &&
    !!selectedDay.value &&
    selectedDay.value.date <= todayIso &&
    REGULARIZABLE.includes(selectedDay.value.status) &&
    !pendingDates.value.has(selectedDay.value.date),
)

const showForm = ref(false)
const form = ref({ checkIn: '', checkOut: '', reason: '' })
const formError = ref('')
const formDone = ref('')
const openForm = () => {
  const day = selectedDay.value
  form.value = { checkIn: to24h(day?.checkIn) || '09:00', checkOut: to24h(day?.checkOut) || '18:00', reason: '' }
  formError.value = ''
  formDone.value = ''
  showForm.value = true
}
watch(selectedDate, () => {
  showForm.value = false
  formDone.value = ''
})

// Opened from "Request regularization" (after clocking out): select the day and open the form.
watch(
  () => [props.regularizeDate, selectedDay.value?.date] as const,
  ([date]) => {
    if (!date || showForm.value) return
    if (selectedDate.value !== date) {
      selectedDate.value = date
      return
    }
    if (canRequest.value) openForm()
  },
  { immediate: true },
)
const submitForm = async () => {
  const day = selectedDay.value
  if (!day) return
  formError.value = ''
  if (!form.value.checkIn && !form.value.checkOut) return (formError.value = 'Enter the correct check-in and/or check-out time')
  if (form.value.checkIn && form.value.checkOut && form.value.checkOut <= form.value.checkIn)
    return (formError.value = 'Check-out must be after check-in')
  if (form.value.reason.trim().length < 5) return (formError.value = 'Please give a reason (at least 5 characters)')
  const { error: err } = await submitRegularization({
    employeeId: myId.value,
    employeeName: user.value?.name || '',
    date: day.date,
    actualCheckIn: day.checkIn || '',
    actualCheckOut: day.checkOut || '',
    correctedCheckIn: form.value.checkIn || undefined,
    correctedCheckOut: form.value.checkOut || undefined,
    reason: form.value.reason.trim(),
  })
  if (err) return (formError.value = (err as ApiError).data || 'Could not send the request')
  showForm.value = false
  formDone.value = 'Request sent for approval. The day updates once it is approved.'
}
const selectedLabel = computed(() =>
  selectedDay.value
    ? new Date(`${selectedDay.value.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '',
)
const dayNumber = (iso: string) => Number(iso.slice(8, 10))
const tooltip = (d: Day) =>
  [STATUS_LABELS[d.status], d.leaveType, d.checkIn && `In ${d.checkIn}`, d.checkOut && `Out ${d.checkOut}`].filter(Boolean).join(' · ')
</script>

<template>
  <div class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
    <!-- Header -->
    <div class="p-4 sm:p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-[#1989d9]/10 text-[#1989d9] flex items-center justify-center shrink-0">
          <CalendarDays class="w-5 h-5" />
        </div>
        <div>
          <h2 class="text-base font-bold text-slate-900 dark:text-white">{{ title }}</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {{ summary.marked }} day(s) marked · {{ summary.missed }} missed
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 self-stretch sm:self-auto">
        <button
          class="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          title="Previous month" @click="shiftMonth(-1)"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>
        <span class="flex-1 sm:flex-none sm:min-w-40 text-center text-sm font-bold text-slate-800 dark:text-slate-100">{{ monthLabel }}</span>
        <button
          class="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          title="Next month" :disabled="isCurrentMonth" @click="shiftMonth(1)"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
        <button
          v-if="!isCurrentMonth"
          class="px-3 py-2 rounded-xl text-xs font-bold bg-[#1989d9] text-white hover:bg-[#1478c0] cursor-pointer"
          @click="goToToday"
        >
          Today
        </button>
      </div>
    </div>

    <div v-if="error" class="p-10 text-center text-sm text-rose-600">{{ error?.data || 'Could not load attendance' }}</div>

    <div v-else class="p-4 sm:p-6 space-y-5">
      <!-- Month summary -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div
          v-for="s in stats" :key="s.label"
          class="p-3 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 flex items-center gap-3"
        >
          <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" :class="s.cls">
            <component :is="s.icon" class="w-4 h-4" />
          </div>
          <div class="min-w-0">
            <p class="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-none">{{ s.value }}</p>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">{{ s.label }}</p>
          </div>
        </div>
      </div>

      <div v-if="summary.rate !== null" class="space-y-1.5">
        <div class="flex justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          <span>Attendance rate (working days so far)</span>
          <span :class="summary.rate >= 90 ? 'text-emerald-600' : summary.rate >= 75 ? 'text-amber-600' : 'text-rose-600'">{{ summary.rate }}%</span>
        </div>
        <div class="h-2 rounded-full bg-rose-100 dark:bg-rose-950/50 overflow-hidden">
          <div class="h-full rounded-full bg-emerald-500 transition-all duration-500" :style="{ width: `${summary.rate}%` }"></div>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_18rem] gap-5">
        <!-- Calendar -->
        <div class="min-w-0">
          <div class="grid grid-cols-7 gap-1 sm:gap-2 mb-1.5 text-center text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-slate-400">
            <span v-for="(d, i) in weekdays" :key="i">
              <span class="sm:hidden">{{ d.short }}</span><span class="hidden sm:inline">{{ d.long }}</span>
            </span>
          </div>

          <!-- Loading skeleton -->
          <div v-if="isLoading && !cells.length" class="grid grid-cols-7 gap-1 sm:gap-2">
            <div v-for="i in 35" :key="i" class="aspect-square sm:aspect-auto sm:h-20 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse"></div>
          </div>

          <div v-else class="grid grid-cols-7 gap-1 sm:gap-2" :class="isLoading ? 'opacity-60' : ''">
            <template v-for="(cell, i) in cells" :key="i">
              <div v-if="!cell" class="aspect-square sm:aspect-auto sm:h-20"></div>
              <button
                v-else
                type="button"
                class="group relative aspect-square sm:aspect-auto sm:h-20 rounded-xl border p-1 sm:p-2 flex flex-col items-center justify-center sm:items-start sm:justify-between text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md cursor-pointer focus:outline-hidden"
                :class="[
                  CELL[cell.status],
                  selectedDate === cell.date ? 'ring-2 ring-offset-2 ring-[#1989d9] dark:ring-offset-slate-900' : '',
                  cell.date === todayIso && selectedDate !== cell.date ? 'ring-2 ring-[#1989d9]/50' : '',
                ]"
                :title="tooltip(cell)"
                @click="selectedDate = cell.date"
              >
                <div class="flex items-center gap-1 sm:w-full sm:justify-between">
                  <span class="text-xs sm:text-sm font-extrabold leading-none">{{ dayNumber(cell.date) }}</span>
                  <span
                    v-if="cell.date === todayIso"
                    class="hidden sm:inline text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md"
                    :class="isMarked(cell.status) || cell.status === 'absent' ? 'bg-white/25' : 'bg-[#1989d9] text-white'"
                  >Today</span>
                </div>

                <span
                  v-if="pendingDates.has(cell.date)"
                  class="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-white dark:ring-slate-900"
                  title="Regularization pending"
                ></span>
                <span
                  v-if="cell.wfhPending"
                  class="absolute top-1 left-1 w-2 h-2 rounded-full bg-sky-400 ring-2 ring-white dark:ring-slate-900"
                  title="Work from home pending approval"
                ></span>

                <!-- Mobile: a small dot for late/half day -->
                <span v-if="cell.status === 'late' || cell.status === 'half_day'" class="sm:hidden mt-0.5 w-1 h-1 rounded-full bg-white"></span>

                <!-- Larger screens: times or a short label -->
                <div class="hidden sm:block w-full text-[10px] leading-tight font-semibold">
                  <template v-if="isMarked(cell.status)">
                    <span v-if="cell.checkIn" class="block font-mono opacity-95">{{ cell.checkIn }}<template v-if="cell.checkOut"> – {{ cell.checkOut }}</template></span>
                    <span v-if="SHORT[cell.status]" class="block opacity-80">{{ SHORT[cell.status] }}</span>
                  </template>
                  <span v-else-if="SHORT[cell.status]" class="block truncate opacity-90">{{ cell.leaveType || SHORT[cell.status] }}</span>
                </div>
              </button>
            </template>
          </div>

          <div class="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span v-for="item in legend" :key="item.label" class="flex items-center gap-1.5">
              <span class="w-3 h-3 rounded-sm" :class="item.cls"></span>{{ item.label }}
            </span>
          </div>
        </div>

        <!-- Day details -->
        <aside class="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 p-4 sm:p-5 h-fit">
          <template v-if="selectedDay">
            <p class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Day details</p>
            <h3 class="mt-1 text-sm font-bold text-slate-900 dark:text-white">{{ selectedLabel }}</h3>
            <span class="inline-block mt-2 px-2.5 py-1 rounded-lg text-[11px] font-bold" :class="STATUS_BADGE[selectedDay.status]">
              {{ STATUS_LABELS[selectedDay.status] }}<template v-if="selectedDay.leaveType"> · {{ selectedDay.leaveType }}</template>
            </span>
            <span v-if="selectedDay.location" class="inline-block mt-2 ml-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {{ selectedDay.location }}
            </span>
            <p v-if="selectedDay.wfhPending" class="mt-2 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
              Work from home applied for this day — waiting for approval
            </p>
            <p v-else-if="selectedDay.status === 'wfh'" class="mt-2 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
              Approved work from home — counted as attended, no clock-in needed.
            </p>

            <dl class="mt-4 grid grid-cols-3 xl:grid-cols-1 gap-3">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-emerald-600 shrink-0">
                  <LogIn class="w-4 h-4" />
                </div>
                <div>
                  <dt class="text-[10px] text-slate-400 font-semibold uppercase">Check in</dt>
                  <dd class="text-xs font-bold font-mono text-slate-800 dark:text-slate-100">{{ selectedDay.checkIn || '—' }}</dd>
                </div>
              </div>
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-rose-500 shrink-0">
                  <LogOut class="w-4 h-4" />
                </div>
                <div>
                  <dt class="text-[10px] text-slate-400 font-semibold uppercase">Check out</dt>
                  <dd class="text-xs font-bold font-mono text-slate-800 dark:text-slate-100">
                    {{ selectedDay.checkOut || (selectedDay.checkIn && selectedDay.date === todayIso ? 'Working' : '—') }}
                  </dd>
                </div>
              </div>
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#1989d9] shrink-0">
                  <Clock class="w-4 h-4" />
                </div>
                <div>
                  <dt class="text-[10px] text-slate-400 font-semibold uppercase">Hours</dt>
                  <dd class="text-xs font-bold font-mono text-slate-800 dark:text-slate-100">{{ selectedDay.workHours != null ? `${selectedDay.workHours} h` : '—' }}</dd>
                </div>
              </div>
            </dl>

            <p v-if="selectedDay.status === 'not_marked'" class="mt-4 text-[11px] text-amber-700 dark:text-amber-400">
              You haven't clocked in today yet. Use “Clock In” above.
            </p>
            <p v-else-if="selectedDay.status === 'absent'" class="mt-4 text-[11px] text-rose-600 dark:text-rose-400">
              No attendance recorded. If this is wrong, request approval from your reporting authority.
            </p>

            <!-- Regularization -->
            <div v-if="requestForDay" class="mt-4 p-3 rounded-xl border text-[11px]"
              :class="requestForDay.status === 'Pending' ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
                : requestForDay.status === 'Approved' ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300'">
              <p class="font-bold flex items-center gap-1.5">
                <Hourglass v-if="requestForDay.status === 'Pending'" class="w-3.5 h-3.5" />
                Regularization {{ requestForDay.status.toLowerCase() }}
              </p>
              <p class="mt-0.5 font-mono">{{ requestForDay.correctedCheckIn || '—' }} – {{ requestForDay.correctedCheckOut || '—' }}</p>
            </div>
            <p v-if="formDone" class="mt-3 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">{{ formDone }}</p>

            <button
              v-if="canRequest && !showForm"
              class="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-[#1989d9] text-white hover:bg-[#1478c0] shadow-sm shadow-[#1989d9]/30 cursor-pointer"
              @click="openForm"
            >
              <FilePenLine class="w-4 h-4" />
              {{ requestForDay?.status === 'Rejected' ? 'Request again' : 'Request regularization' }}
            </button>

            <form v-if="showForm" class="mt-4 space-y-3" @submit.prevent="submitForm">
              <p class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Correct attendance</p>
              <div class="grid grid-cols-2 gap-2">
                <label class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Check in
                  <input v-model="form.checkIn" type="time"
                    class="mt-1 w-full px-2.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono cursor-pointer focus:outline-hidden focus:border-[#1989d9]" />
                </label>
                <label class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Check out
                  <input v-model="form.checkOut" type="time"
                    class="mt-1 w-full px-2.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono cursor-pointer focus:outline-hidden focus:border-[#1989d9]" />
                </label>
              </div>
              <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Reason
                <textarea v-model="form.reason" rows="3" maxlength="500" placeholder="e.g. Forgot to clock out after the client meeting"
                  class="mt-1 w-full px-2.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:outline-hidden focus:border-[#1989d9] resize-none"></textarea>
              </label>
              <p v-if="formError" class="text-[11px] font-semibold text-rose-600">{{ formError }}</p>
              <div class="flex gap-2">
                <button type="button" class="flex-1 px-3 py-2 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" @click="showForm = false">
                  Cancel
                </button>
                <button type="submit" :disabled="submitting" class="flex-1 px-3 py-2 rounded-lg text-xs font-bold bg-[#1989d9] text-white hover:bg-[#1478c0] disabled:opacity-50 cursor-pointer">
                  {{ submitting ? 'Sending…' : 'Send for approval' }}
                </button>
              </div>
            </form>
          </template>
          <p v-else class="text-xs text-slate-500 dark:text-slate-400">Select a day to see its details.</p>
        </aside>
      </div>
    </div>
  </div>
</template>
