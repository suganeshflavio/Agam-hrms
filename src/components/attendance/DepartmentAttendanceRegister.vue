<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronDown, ChevronRight, Users } from '@lucide/vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiQuery } from '@/redux/vueAdapter'
import type { AttendanceRegister, AttendanceDayStatus, Department } from '@/types/hrms'
import { STATUS_BADGE, STATUS_LABELS } from './statusStyles'

// Super Admin / HR: every employee's status for a day, grouped by department.
const localToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const date = ref(localToday())
const department = ref('All')
const collapsed = ref<Record<string, boolean>>({})

const { data: departments } = useApiQuery<Department[]>(hrmsApi.endpoints.getDepartments)
const { data: register, isLoading, error } = useApiQuery<AttendanceRegister>(
  hrmsApi.endpoints.getAttendanceRegister,
  () => ({ date: date.value, department: department.value === 'All' ? undefined : department.value }),
)

const totals = computed(() => {
  const groups = register.value?.departments || []
  return {
    total: groups.reduce((sum, g) => sum + g.total, 0),
    present: groups.reduce((sum, g) => sum + g.present, 0),
    absent: groups.reduce((sum, g) => sum + (g.counts.absent || 0), 0),
    notMarked: groups.reduce((sum, g) => sum + (g.counts.not_marked || 0), 0),
    onLeave: groups.reduce((sum, g) => sum + (g.counts.on_leave || 0), 0),
  }
})

const chipOrder: AttendanceDayStatus[] = ['present', 'late', 'half_day', 'absent', 'not_marked', 'on_leave', 'holiday', 'weekly_off']
const toggle = (name: string) => (collapsed.value[name] = !collapsed.value[name])
</script>

<template>
  <div class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
    <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div>
        <h2 class="text-base font-bold text-slate-900 dark:text-white">Department Attendance Register</h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {{ totals.present }} of {{ totals.total }} present
          <span v-if="totals.absent"> · {{ totals.absent }} absent</span>
          <span v-if="totals.notMarked"> · {{ totals.notMarked }} not marked</span>
          <span v-if="totals.onLeave"> · {{ totals.onLeave }} on leave</span>
        </p>
      </div>
      <div class="flex flex-wrap items-end gap-3 text-xs">
        <label class="flex flex-col gap-1">
          <span class="text-slate-500">Date</span>
          <input v-model="date" type="date" :max="localToday()" class="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" />
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-slate-500">Department</span>
          <select v-model="department" class="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 min-w-44">
            <option value="All">All departments</option>
            <option v-for="d in departments" :key="d.id" :value="d.name">{{ d.name }}</option>
          </select>
        </label>
      </div>
    </div>

    <div v-if="isLoading" class="p-10 text-center text-sm text-slate-400">Loading attendance…</div>
    <div v-else-if="error" class="p-10 text-center text-sm text-rose-600">{{ error?.data || 'Could not load attendance' }}</div>
    <div v-else-if="!register?.departments.length" class="p-10 text-center text-sm text-slate-400">No employees found for this date.</div>

    <div v-else class="divide-y divide-slate-100 dark:divide-slate-800">
      <section v-for="group in register.departments" :key="group.department">
        <button
          type="button"
          class="w-full flex flex-wrap items-center gap-3 px-6 py-4 text-left hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
          @click="toggle(group.department)"
        >
          <component :is="collapsed[group.department] ? ChevronRight : ChevronDown" class="w-4 h-4 text-slate-400" />
          <Users class="w-4 h-4 text-[#1989d9]" />
          <span class="font-bold text-sm text-slate-900 dark:text-white">{{ group.department }}</span>
          <span class="text-xs text-slate-500">{{ group.present }}/{{ group.total }} present</span>
          <span class="flex flex-wrap gap-1.5 ml-auto">
            <template v-for="status in chipOrder" :key="status">
              <span v-if="group.counts[status]" class="px-2 py-0.5 rounded-md text-[11px] font-semibold" :class="STATUS_BADGE[status]">
                {{ STATUS_LABELS[status] }} {{ group.counts[status] }}
              </span>
            </template>
          </span>
        </button>

        <div v-if="!collapsed[group.department]" class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th class="py-2.5 px-6">Employee</th>
                <th class="py-2.5 px-6">Shift</th>
                <th class="py-2.5 px-6">Check In</th>
                <th class="py-2.5 px-6">Check Out</th>
                <th class="py-2.5 px-6">Hours</th>
                <th class="py-2.5 px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
              <tr v-for="row in group.employees" :key="row.employeeId" class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                <td class="py-3 px-6">
                  <p class="font-semibold text-slate-900 dark:text-white">{{ row.employeeName }}</p>
                  <p class="text-[11px] text-slate-400">{{ row.employeeCode }} · {{ row.designation }}</p>
                </td>
                <td class="py-3 px-6 text-slate-500">{{ row.shift || '—' }}</td>
                <td class="py-3 px-6 font-mono text-slate-700 dark:text-slate-200">{{ row.checkIn || '—' }}</td>
                <td class="py-3 px-6 font-mono text-slate-500">{{ row.checkOut || (row.checkIn ? 'Working' : '—') }}</td>
                <td class="py-3 px-6 font-mono text-slate-500">{{ row.workHours != null ? `${row.workHours} hrs` : '—' }}</td>
                <td class="py-3 px-6 text-right">
                  <span class="px-2.5 py-1 rounded-md font-semibold" :class="STATUS_BADGE[row.status]">
                    {{ STATUS_LABELS[row.status] }}<template v-if="row.leaveType"> · {{ row.leaveType }}</template>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>
