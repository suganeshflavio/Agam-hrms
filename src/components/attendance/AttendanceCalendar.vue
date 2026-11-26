<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue'
import { useRouter } from 'vue-router'
import {
  AlarmClock,
  CalendarCheck2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FilePenLine,
  Home,
  Hourglass,
  LogIn,
  LogOut,
  PartyPopper,
  Plane,
  Sparkles,
  Timer,
  TrendingUp,
  X,
  XCircle,
} from '@lucide/vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiMutation, useApiQuery } from '@/redux/vueAdapter'
import { usePermissions } from '@/composables/usePermissions'
import type { ApiError } from '@/services/apiClient'
import type { AttendanceCalendar, AttendanceDayStatus, RegularizationRequest } from '@/types/hrms'
import { STATUS_BADGE, STATUS_LABELS } from './statusStyles'
import { to24h } from './time'

// A month of attendance: summary cards, a calendar with a status icon per day,
// and a side panel with the selected day's details (and regularization),
// a legend and quick actions.
const props = withDefaults(
  defineProps<{ employeeId?: string; title?: string; regularizeDate?: string }>(),
  { employeeId: undefined, title: 'My Attendance', regularizeDate: undefined },
)
const router = useRouter()

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

// ---- Look of each status: a soft cell tint and a solid icon chip.
interface StatusLook { cell: string; chip?: string; icon?: Component; text?: string }
const LOOK: Record<AttendanceDayStatus, StatusLook> = {
  present: { cell: 'bg-emerald-50/70 dark:bg-emerald-950/25', chip: 'bg-emerald-500', icon: Check },
  late: { cell: 'bg-amber-50/70 dark:bg-amber-950/25', chip: 'bg-amber-500', icon: Clock },
  half_day: { cell: 'bg-teal-50/70 dark:bg-teal-950/25', chip: 'bg-teal-500', text: '½' },
  absent: { cell: 'bg-rose-50/80 dark:bg-rose-950/25', chip: 'bg-rose-500', icon: X },
  wfh: { cell: 'bg-sky-50/80 dark:bg-sky-950/25', chip: 'bg-sky-500', icon: Home },
  on_leave: { cell: 'bg-violet-50/80 dark:bg-violet-950/25', chip: 'bg-violet-500', icon: Plane },
  holiday: { cell: 'bg-cyan-50/70 dark:bg-cyan-950/25', chip: 'bg-cyan-500', icon: PartyPopper },
  weekly_off: { cell: 'bg-slate-50 dark:bg-slate-800/40' },
  not_marked: { cell: 'bg-amber-50/40 dark:bg-amber-950/20', chip: 'bg-white dark:bg-slate-900 !text-amber-500 ring-2 ring-amber-400 ring-dashed', icon: AlarmClock },
  upcoming: { cell: 'bg-white dark:bg-slate-900' },
}

const legend: { label: string; status: AttendanceDayStatus }[] = [
  { label: 'Present', status: 'present' },
  { label: 'Late', status: 'late' },
  { label: 'Half day', status: 'half_day' },
  { label: 'Work from home', status: 'wfh' },
  { label: 'On leave', status: 'on_leave' },
  { label: 'Missed', status: 'absent' },
  { label: 'Holiday', status: 'holiday' },
  { label: 'Today, not marked', status: 'not_marked' },
]

// ---- Month summary
const summary = computed(() => {
  const s = calendar.value?.summary || {}
  const marked = (s.present || 0) + (s.late || 0) + (s.half_day || 0)
  const missed = s.absent || 0
  const wfh = s.wfh || 0
  const working = marked + wfh + missed
  return {
    marked,
    missed,
    wfh,
    attended: marked + wfh,
    working,
    late: s.late || 0,
    leave: s.on_leave || 0,
    rate: working ? Math.round(((marked + wfh) / working) * 100) : null,
  }
})

const stats = computed(() => [
  {
    label: 'Days present', value: `${summary.value.attended} / ${summary.value.working}`, icon: CalendarCheck2,
    badge: summary.value.rate !== null ? `${summary.value.rate}%` : '',
    card: 'from-sky-50 to-blue-100/70 dark:from-sky-950/40 dark:to-blue-950/30 border-sky-100 dark:border-sky-900/50',
    iconCls: 'bg-white/80 text-[#1989d9] dark:bg-slate-900/60',
  },
  {
    label: 'Work from home', value: summary.value.wfh, icon: Home, badge: '',
    card: 'from-cyan-50 to-sky-100/60 dark:from-cyan-950/40 dark:to-sky-950/30 border-cyan-100 dark:border-cyan-900/50',
    iconCls: 'bg-white/80 text-sky-600 dark:bg-slate-900/60',
  },
  {
    label: 'Leave days', value: summary.value.leave, icon: Plane, badge: '',
    card: 'from-violet-50 to-purple-100/60 dark:from-violet-950/40 dark:to-purple-950/30 border-violet-100 dark:border-violet-900/50',
    iconCls: 'bg-white/80 text-violet-600 dark:bg-slate-900/60',
  },
  {
    label: 'Late arrivals', value: summary.value.late, icon: Timer, badge: '',
    card: 'from-amber-50 to-orange-100/60 dark:from-amber-950/40 dark:to-orange-950/30 border-amber-100 dark:border-amber-900/50',
    iconCls: 'bg-white/80 text-amber-600 dark:bg-slate-900/60',
  },
  {
    label: 'Days missed', value: summary.value.missed, icon: XCircle, badge: '',
    card: 'from-rose-50 to-pink-100/60 dark:from-rose-950/40 dark:to-pink-950/30 border-rose-100 dark:border-rose-900/50',
    iconCls: 'bg-white/80 text-rose-600 dark:bg-slate-900/60',
  },
])

// Encouragement under the calendar, from the month's attendance rate.
const banner = computed(() => {
  const rate = summary.value.rate
  if (rate === null) return null
  const who = ownCalendar.value ? 'You have' : 'This employee has'
  if (rate >= 90) return { title: 'Great job!', text: `${who} maintained ${rate}% attendance this month.`, cls: 'from-emerald-50 to-teal-50 border-emerald-100 dark:from-emerald-950/40 dark:to-teal-950/30 dark:border-emerald-900/50', iconCls: 'bg-emerald-500', icon: CheckCircle2 }
  if (rate >= 75) return { title: 'Keep it up', text: `${who} ${rate}% attendance this month — a few more marked days gets you to 90%.`, cls: 'from-sky-50 to-blue-50 border-sky-100 dark:from-sky-950/40 dark:to-blue-950/30 dark:border-sky-900/50', iconCls: 'bg-[#1989d9]', icon: TrendingUp }
  return { title: 'Let’s get back on track', text: `${who} ${rate}% attendance this month. Missed a punch? Request a regularization for that day.`, cls: 'from-amber-50 to-orange-50 border-amber-100 dark:from-amber-950/40 dark:to-orange-950/30 dark:border-amber-900/50', iconCls: 'bg-amber-500', icon: Sparkles }
})

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

// ---- Quick actions (own calendar)
const applyLeave = () => router.push('/leaves')
const applyWfh = () => router.push({ path: '/self-service', query: { tab: 'wfh' } })
const regularizeSelected = () => {
  if (canRequest.value) openForm()
}
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1989d9] to-[#044663] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#1989d9]/30">
          <CalendarDays class="w-5 h-5" />
        </div>
        <div class="min-w-0">
          <h2 class="text-lg font-bold text-slate-900 dark:text-white">{{ title }}</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">{{ summary.marked }} day(s) marked · {{ summary.missed }} missed this month</p>
        </div>
      </div>
      <div class="flex items-center gap-2 self-stretch sm:self-auto">
        <div class="flex flex-1 sm:flex-none items-center gap-1 p-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <button class="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" title="Previous month" @click="shiftMonth(-1)">
            <ChevronLeft class="w-4 h-4" />
          </button>
          <span class="flex-1 sm:flex-none sm:min-w-36 text-center text-sm font-bold text-slate-800 dark:text-slate-100">{{ monthLabel }}</span>
          <button
            class="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Next month" :disabled="isCurrentMonth" @click="shiftMonth(1)"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>
        <button
          v-if="!isCurrentMonth"
          class="px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-[#1989d9] text-white hover:bg-[#1478c0] shadow-sm shadow-[#1989d9]/30 cursor-pointer"
          @click="goToToday"
        >
          Today
        </button>
      </div>
    </div>

    <div v-if="error" class="p-10 rounded-3xl border border-rose-200 bg-white dark:bg-slate-900 text-center text-sm text-rose-600">
      {{ error?.data || 'Could not load attendance' }}
    </div>

    <template v-else>
      <!-- Summary cards -->
      <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        <div
          v-for="s in stats" :key="s.label"
          class="relative overflow-hidden p-4 rounded-2xl border bg-gradient-to-br shadow-xs"
          :class="s.card"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shadow-xs shrink-0" :class="s.iconCls">
              <component :is="s.icon" class="w-5 h-5" />
            </div>
            <span v-if="s.badge" class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/80 dark:bg-slate-900/60 text-emerald-600">
              {{ s.badge }}
            </span>
          </div>
          <p class="mt-3 text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-none">{{ s.value }}</p>
          <p class="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">{{ s.label }}</p>
          <div class="pointer-events-none absolute -right-6 -bottom-8 w-24 h-24 rounded-full bg-white/40 dark:bg-white/5"></div>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_20rem] gap-5">
        <!-- Calendar -->
        <div class="min-w-0 space-y-5">
          <div class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div class="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30">
              <span
                v-for="(d, i) in weekdays" :key="i"
                class="py-2.5 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wide"
                :class="i >= 5 ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'"
              >
                <span class="sm:hidden">{{ d.short }}</span><span class="hidden sm:inline">{{ d.long }}</span>
              </span>
            </div>

            <!-- Loading skeleton -->
            <div v-if="isLoading && !cells.length" class="grid grid-cols-7">
              <div v-for="i in 35" :key="i" class="h-14 sm:h-24 border-b border-r border-slate-100 dark:border-slate-800 animate-pulse bg-slate-50 dark:bg-slate-800/40"></div>
            </div>

            <div v-else class="grid grid-cols-7" :class="isLoading ? 'opacity-60' : ''">
              <template v-for="(cell, i) in cells" :key="i">
                <div v-if="!cell" class="h-14 sm:h-24 border-b border-r border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40"></div>
                <button
                  v-else
                  type="button"
                  :data-status="cell.status"
                  class="group relative h-14 sm:h-24 p-1 sm:p-2 border-b border-r border-slate-100 dark:border-slate-800 flex flex-col items-center sm:items-stretch justify-between text-left transition-colors cursor-pointer focus:outline-hidden hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  :class="[LOOK[cell.status].cell, selectedDate === cell.date ? '!bg-[#1989d9]/10 ring-2 ring-inset ring-[#1989d9]' : '']"
                  :title="tooltip(cell)"
                  @click="selectedDate = cell.date"
                >
                  <div class="flex items-center justify-between w-full">
                    <span
                      class="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full text-[11px] sm:text-sm font-bold"
                      :class="cell.date === todayIso
                        ? 'bg-[#1989d9] text-white shadow-sm shadow-[#1989d9]/40'
                        : cell.status === 'upcoming' || cell.status === 'weekly_off' ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'"
                    >{{ dayNumber(cell.date) }}</span>
                    <span class="hidden sm:block text-[9px] font-semibold uppercase tracking-wide text-slate-400 truncate">
                      {{ cell.status === 'weekly_off' ? 'Off' : '' }}
                    </span>
                  </div>

                  <!-- Status chip -->
                  <span
                    v-if="LOOK[cell.status].chip"
                    class="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-white text-[10px] font-extrabold shadow-xs shrink-0"
                    :class="LOOK[cell.status].chip"
                  >
                    <component :is="LOOK[cell.status].icon" v-if="LOOK[cell.status].icon" class="w-3 h-3 sm:w-3.5 sm:h-3.5" stroke-width="3" />
                    <template v-else>{{ LOOK[cell.status].text }}</template>
                  </span>
                  <span v-else class="h-5 sm:h-6"></span>

                  <!-- Times / labels on larger screens -->
                  <span class="hidden sm:block w-full text-[10px] leading-tight font-semibold text-slate-500 dark:text-slate-400 truncate">
                    <template v-if="cell.checkIn">{{ cell.checkIn }}<template v-if="cell.checkOut"> – {{ cell.checkOut }}</template></template>
                    <template v-else-if="cell.leaveType">{{ cell.leaveType }}</template>
                    <template v-else-if="cell.status === 'wfh'">Work from home</template>
                    <template v-else-if="cell.status === 'holiday'">Holiday</template>
                    <template v-else-if="cell.status === 'not_marked'">Not marked yet</template>
                  </span>

                  <!-- Pending markers -->
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
                </button>
              </template>
            </div>
          </div>

          <!-- Encouragement -->
          <div v-if="banner" class="flex items-center gap-4 p-4 sm:p-5 rounded-3xl border bg-gradient-to-r" :class="banner.cls">
            <div class="w-11 h-11 rounded-full text-white flex items-center justify-center shrink-0 shadow-md" :class="banner.iconCls">
              <component :is="banner.icon" class="w-6 h-6" />
            </div>
            <div class="min-w-0">
              <p class="text-sm sm:text-base font-bold text-slate-900 dark:text-white">{{ banner.title }}</p>
              <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-300">{{ banner.text }}</p>
            </div>
          </div>
        </div>

        <!-- Side panel -->
        <div class="space-y-5 min-w-0">
          <!-- Day details -->
          <aside class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 sm:p-5">
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

          <!-- Legend -->
          <section class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 sm:p-5">
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">Legend</h3>
            <ul class="mt-3 grid grid-cols-2 xl:grid-cols-1 gap-x-3 gap-y-2.5">
              <li v-for="l in legend" :key="l.status" class="flex items-center gap-2.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                <span class="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[9px] font-extrabold shrink-0" :class="LOOK[l.status].chip">
                  <component :is="LOOK[l.status].icon" v-if="LOOK[l.status].icon" class="w-3 h-3" stroke-width="3" />
                  <template v-else>{{ LOOK[l.status].text }}</template>
                </span>
                {{ l.label }}
              </li>
              <li class="flex items-center gap-2.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                <span class="w-5 flex justify-center"><span class="w-2 h-2 rounded-full bg-amber-400"></span></span> Regularization pending
              </li>
              <li class="flex items-center gap-2.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                <span class="w-5 flex justify-center"><span class="w-2 h-2 rounded-full bg-sky-400"></span></span> WFH pending approval
              </li>
            </ul>
          </section>

          <!-- Quick actions -->
          <section v-if="ownCalendar" class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 sm:p-5">
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">Quick actions</h3>
            <div class="mt-3 grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-2">
              <button class="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-violet-50 hover:border-violet-200 dark:hover:bg-violet-950/30 transition-colors cursor-pointer" @click="applyLeave">
                <Plane class="w-4 h-4 text-violet-500" /> Apply leave
              </button>
              <button class="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-sky-50 hover:border-sky-200 dark:hover:bg-sky-950/30 transition-colors cursor-pointer" @click="applyWfh">
                <Home class="w-4 h-4 text-sky-500" /> Apply work from home
              </button>
              <button
                class="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-amber-50 hover:border-amber-200 dark:hover:bg-amber-950/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                :disabled="!canRequest" :title="canRequest ? '' : 'Select a past or today’s working day without a pending request'"
                @click="regularizeSelected"
              >
                <FilePenLine class="w-4 h-4 text-amber-500" /> Regularize selected day
              </button>
            </div>
          </section>
        </div>
      </div>
    </template>
  </div>
</template>
