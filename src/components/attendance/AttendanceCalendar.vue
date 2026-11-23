<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiQuery } from '@/redux/vueAdapter'
import type { AttendanceCalendar, AttendanceDayStatus } from '@/types/hrms'
import { STATUS_LABELS } from './statusStyles'

// The signed-in employee's month: green = attendance recorded, red = missed.
const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth()) // 0-based
const monthKey = computed(() => `${year.value}-${String(month.value + 1).padStart(2, '0')}`)
const monthLabel = computed(() => new Date(year.value, month.value, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))
const isCurrentMonth = computed(() => year.value === now.getFullYear() && month.value === now.getMonth())

const { data: calendar, isLoading, error } = useApiQuery<AttendanceCalendar>(
  hrmsApi.endpoints.getAttendanceCalendar,
  () => ({ month: monthKey.value }),
)

const shiftMonth = (delta: number) => {
  const d = new Date(year.value, month.value + delta, 1)
  year.value = d.getFullYear()
  month.value = d.getMonth()
  selectedDate.value = ''
}

// Monday-first grid with leading blanks.
const cells = computed(() => {
  const days = calendar.value?.days || []
  const firstWeekday = (new Date(year.value, month.value, 1).getDay() + 6) % 7
  const blanks: null[] = Array.from({ length: firstWeekday }, () => null)
  return [...blanks, ...days]
})

const CELL: Record<AttendanceDayStatus, string> = {
  present: 'bg-emerald-500 text-white border-emerald-500',
  late: 'bg-emerald-500 text-white border-emerald-500',
  half_day: 'bg-emerald-400 text-white border-emerald-400',
  absent: 'bg-rose-500 text-white border-rose-500',
  on_leave: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-900',
  holiday: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-900',
  weekly_off: 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700',
  not_marked: 'bg-white text-slate-700 border-amber-400 border-2 dark:bg-slate-900 dark:text-slate-200',
  upcoming: 'bg-white text-slate-400 border-slate-200 dark:bg-slate-900 dark:border-slate-800',
}

const legend: { label: string; cls: string }[] = [
  { label: 'Attendance marked', cls: 'bg-emerald-500' },
  { label: 'Not marked / absent', cls: 'bg-rose-500' },
  { label: 'Today (not yet marked)', cls: 'bg-white border-2 border-amber-400' },
  { label: 'On leave', cls: 'bg-violet-200' },
  { label: 'Holiday', cls: 'bg-sky-200' },
  { label: 'Weekly off', cls: 'bg-slate-200' },
]

const summary = computed(() => {
  const s = calendar.value?.summary || {}
  return {
    marked: (s.present || 0) + (s.late || 0) + (s.half_day || 0),
    missed: s.absent || 0,
    late: s.late || 0,
    leave: s.on_leave || 0,
  }
})

const selectedDate = ref('')
const selectedDay = computed(() => calendar.value?.days.find((d) => d.date === selectedDate.value))
const dayNumber = (iso: string) => Number(iso.slice(8, 10))
const tooltip = (d: { date: string; status: AttendanceDayStatus; checkIn?: string; checkOut?: string; leaveType?: string }) =>
  [STATUS_LABELS[d.status], d.leaveType, d.checkIn && `In ${d.checkIn}`, d.checkOut && `Out ${d.checkOut}`].filter(Boolean).join(' · ')
</script>

<template>
  <div class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs p-6 space-y-5">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h2 class="text-base font-bold text-slate-900 dark:text-white">My Attendance</h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {{ summary.marked }} day(s) marked<span v-if="summary.late"> ({{ summary.late }} late)</span> ·
          {{ summary.missed }} missed<span v-if="summary.leave"> · {{ summary.leave }} on leave</span>
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button class="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800" title="Previous month" @click="shiftMonth(-1)">
          <ChevronLeft class="w-4 h-4" />
        </button>
        <span class="min-w-36 text-center text-sm font-bold text-slate-800 dark:text-slate-100">{{ monthLabel }}</span>
        <button
          class="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
          title="Next month" :disabled="isCurrentMonth" @click="shiftMonth(1)"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>

    <div v-if="error" class="p-8 text-center text-sm text-rose-600">{{ error?.data || 'Could not load your attendance' }}</div>
    <template v-else>
      <div class="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold uppercase text-slate-400">
        <span v-for="d in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']" :key="d">{{ d }}</span>
      </div>
      <div class="grid grid-cols-7 gap-1.5" :class="isLoading ? 'opacity-50' : ''">
        <template v-for="(cell, i) in cells" :key="i">
          <div v-if="!cell" class="aspect-square"></div>
          <button
            v-else
            type="button"
            class="aspect-square rounded-xl border flex flex-col items-center justify-center text-sm font-bold transition-transform hover:scale-105"
            :class="[CELL[cell.status], selectedDate === cell.date ? 'ring-2 ring-offset-1 ring-[#1989d9]' : '']"
            :title="tooltip(cell)"
            @click="selectedDate = cell.date"
          >
            {{ dayNumber(cell.date) }}
            <span v-if="cell.status === 'late'" class="text-[9px] font-semibold opacity-90">Late</span>
            <span v-else-if="cell.status === 'half_day'" class="text-[9px] font-semibold opacity-90">Half</span>
          </button>
        </template>
      </div>

      <div v-if="selectedDay" class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-xs flex flex-wrap gap-x-6 gap-y-1">
        <span class="font-bold text-slate-800 dark:text-slate-100">
          {{ new Date(`${selectedDay.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' }) }}
        </span>
        <span>Status: <strong>{{ STATUS_LABELS[selectedDay.status] }}</strong><template v-if="selectedDay.leaveType"> ({{ selectedDay.leaveType }})</template></span>
        <span>Check in: <strong class="font-mono">{{ selectedDay.checkIn || '—' }}</strong></span>
        <span>Check out: <strong class="font-mono">{{ selectedDay.checkOut || '—' }}</strong></span>
        <span>Hours: <strong class="font-mono">{{ selectedDay.workHours != null ? selectedDay.workHours : '—' }}</strong></span>
      </div>

      <div class="flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-slate-500">
        <span v-for="item in legend" :key="item.label" class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded" :class="item.cls"></span>{{ item.label }}
        </span>
      </div>
    </template>
  </div>
</template>
