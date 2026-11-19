<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Timer,
  UserCheck,
  Plus,
  X,
  Layers,
  CalendarDays,
  Check,
  XCircle,
  Users,
  Pencil,
  Trash2,
} from '@lucide/vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiQuery, useApiMutation, useAppSelector } from '@/redux/vueAdapter'
import type { AttendanceRecord, Shift, Employee } from '@/types/hrms'

const currentUser = useAppSelector((state) => state.auth.user)
const currentUserId = computed(() => currentUser.value?.employeeId || currentUser.value?.id || 'emp-1')
const currentUserName = computed(() => currentUser.value?.name || 'Sarah Connor')
const currentUserRole = computed(() => currentUser.value?.role || 'Super Admin')
const isSuperAdmin = computed(() => {
  const r = (currentUser.value?.role || '').toLowerCase()
  return !r || r.includes('admin') || r.includes('hr') || r === 'super admin' || r === 'hr manager'
})
const isDepartmentManager = computed(() => {
  const r = (currentUser.value?.role || '').toLowerCase()
  return r.includes('manager') && !isSuperAdmin.value
})

// Redux Queries & Mutations
const { data: attendance } = useApiQuery<AttendanceRecord[]>(hrmsApi.endpoints.getAttendance)
const { data: employees } = useApiQuery<Employee[]>(hrmsApi.endpoints.getEmployees)
const { data: shifts } = useApiQuery<Shift[]>(hrmsApi.endpoints.getShifts)

const [recordAttendance, { isLoading: isPunching }] = useApiMutation(hrmsApi.endpoints.recordAttendance)
const [addShift, { isLoading: isSavingShift }] = useApiMutation(hrmsApi.endpoints.addShift)
const [updateShift] = useApiMutation(hrmsApi.endpoints.updateShift)
const [deleteShift] = useApiMutation(hrmsApi.endpoints.deleteShift)

// Shift Modal State
const isShiftModalOpen = ref(false)
const isEditingShift = ref(false)
const editingShiftId = ref<string | null>(null)
const shiftName = ref('')
const shiftStartTime = ref('09:00 AM')
const shiftEndTime = ref('06:00 PM')
const shiftGraceMinutes = ref(15)
const shiftActiveDays = ref<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
const allWeekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const toggleShiftDay = (day: string) => {
  if (shiftActiveDays.value.includes(day)) {
    shiftActiveDays.value = shiftActiveDays.value.filter((d) => d !== day)
  } else {
    shiftActiveDays.value.push(day)
  }
}

const openAddShiftModal = () => {
  isEditingShift.value = false
  editingShiftId.value = null
  shiftName.value = ''
  shiftStartTime.value = '09:00 AM'
  shiftEndTime.value = '06:00 PM'
  shiftGraceMinutes.value = 15
  shiftActiveDays.value = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  isShiftModalOpen.value = true
}

const openEditShiftModal = (s: Shift) => {
  isEditingShift.value = true
  editingShiftId.value = s.id
  shiftName.value = s.name
  shiftStartTime.value = s.startTime
  shiftEndTime.value = s.endTime
  shiftGraceMinutes.value = s.graceMinutes
  shiftActiveDays.value = [...s.activeDays]
  isShiftModalOpen.value = true
}

const handleSaveShift = async () => {
  if (!shiftName.value.trim()) {
    showNotification('Shift name is required')
    return
  }
  if (shiftActiveDays.value.length === 0) {
    showNotification('Please select at least one active work day')
    return
  }

  if (isEditingShift.value && editingShiftId.value) {
    await updateShift({
      id: editingShiftId.value,
      updates: {
        name: shiftName.value.trim(),
        startTime: shiftStartTime.value,
        endTime: shiftEndTime.value,
        graceMinutes: shiftGraceMinutes.value,
        activeDays: shiftActiveDays.value,
      },
    })
    showNotification(`Shift "${shiftName.value}" updated successfully!`)
  } else {
    await addShift({
      name: shiftName.value.trim(),
      startTime: shiftStartTime.value,
      endTime: shiftEndTime.value,
      graceMinutes: shiftGraceMinutes.value,
      activeDays: shiftActiveDays.value,
    })
    showNotification(`New shift "${shiftName.value}" added successfully!`)
  }
  isShiftModalOpen.value = false
}

const handleDeleteShift = async (s: Shift) => {
  if (confirm(`Are you sure you want to delete shift template "${s.name}"?`)) {
    await deleteShift(s.id)
    showNotification(`Shift template "${s.name}" deleted.`)
  }
}

// Tabs & State
const activeTab = ref<'daily' | 'shifts'>('daily')
const notification = ref('')
const currentTime = ref(new Date().toLocaleTimeString())
let timer: any = null

onMounted(() => {
  timer = setInterval(() => {
    currentTime.value = new Date().toLocaleTimeString()
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const showNotification = (msg: string) => {
  notification.value = msg
  setTimeout(() => {
    notification.value = ''
  }, 3500)
}

const todayStr = new Date().toISOString().split('T')[0] ?? ''

const myRecordToday = computed(() => {
  return (attendance.value || []).find(
    (a) => a.employeeId === currentUserId.value && a.date === todayStr
  )
})

const handleClockAction = async () => {
  await recordAttendance({
    employeeId: currentUserId.value,
    employeeName: currentUserName.value,
  })
  showNotification(
    myRecordToday.value && !myRecordToday.value.checkOut
      ? 'Checked out successfully! Shift recorded.'
      : 'Checked in successfully! Shift started.'
  )
}

// Role-Based Attendance Scoping:
// Super Admin sees all company logs; Manager sees department/team logs; Employee sees personal logs only.
const scopedAttendance = computed(() => {
  const all = attendance.value || []
  if (isSuperAdmin.value) return all

  if (isDepartmentManager.value) {
    const dept = (currentUser.value?.department || '').toLowerCase()
    const managerName = (currentUser.value?.name || '').toLowerCase()
    const myId = currentUserId.value

    const teamEmployees = (employees.value || []).filter(
      (e) =>
        e.id === myId ||
        (dept && (e.department || '').toLowerCase() === dept) ||
        (managerName && (e.reportingManagerName || '').toLowerCase() === managerName)
    )
    const teamEmpIds = new Set(teamEmployees.map((e) => e.id))
    const teamNames = new Set(teamEmployees.map((e) => `${e.firstName || ''} ${e.lastName || ''}`.trim().toLowerCase()))

    return all.filter(
      (a) =>
        teamEmpIds.has(a.employeeId) ||
        teamNames.has((a.employeeName || '').trim().toLowerCase()) ||
        a.employeeId === myId
    )
  }

  // General Employee: ONLY show their own attendance log
  const myId = currentUserId.value
  const myName = (currentUserName.value || '').trim().toLowerCase()
  const userEmail = (currentUser.value?.email || '').toLowerCase()
  const emailPrefix = userEmail.split('@')[0] || ''

  return all.filter(
    (a) =>
      a.employeeId === myId ||
      (a.employeeName || '').trim().toLowerCase() === myName ||
      (emailPrefix && (a.employeeName || '').toLowerCase().includes(emailPrefix))
  )
})

// Summary Metrics
const presentCount = computed(() => scopedAttendance.value.filter((a) => a.date === todayStr && a.status === 'Present').length)
const lateCount = computed(() => scopedAttendance.value.filter((a) => a.date === todayStr && a.status === 'Late').length)
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Time & Attendance
        </h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Monitor daily clock-ins, multi-shift rosters, and biometric attendance records
        </p>
      </div>
    </div>

    <!-- Alert Banner -->
    <div
      v-if="notification"
      class="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-medium animate-fadeIn"
    >
      <CheckCircle2 class="w-5 h-5 text-emerald-500 shrink-0" />
      <span>{{ notification }}</span>
    </div>

    <!-- Live Clock Widget & Personal Punch Card -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Live Clock Card -->
      <div class="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
        <div>
          <div class="flex items-center gap-2 text-[#1989d9] dark:text-[#38a5e4] text-xs font-semibold uppercase tracking-wider">
            <Timer class="w-4 h-4" />
            <span>Real-time Office Clock</span>
          </div>
          <p class="text-3xl font-extrabold text-slate-900 dark:text-white mt-3 font-mono">
            {{ currentTime }}
          </p>
          <div class="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mt-1">
            <Calendar class="w-3.5 h-3.5" />
            <span>{{ new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) }}</span>
          </div>
        </div>

        <div class="pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Assigned Shift: <span class="font-bold text-slate-800 dark:text-slate-200">General Day (09:00 AM – 06:00 PM)</span>
          </p>
        </div>
      </div>

      <!-- Action Punch Card (AGAM Brand Oceanic Colors) -->
      <div class="md:col-span-2 p-6 rounded-3xl bg-gradient-to-br from-[#02293b] via-[#044663] to-[#0a4976] text-white shadow-xl shadow-[#044663]/20 flex flex-col justify-between relative overflow-hidden">
        <div class="absolute -right-12 -bottom-12 w-64 h-64 bg-[#1989d9]/20 rounded-full blur-3xl pointer-events-none"></div>

        <div class="flex items-start justify-between relative">
          <div>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-md bg-white/10 uppercase tracking-wider text-sky-200">
              Shift Operations
            </span>
            <h2 class="text-xl font-bold mt-2">
              {{ myRecordToday ? (myRecordToday.checkOut ? 'Shift Completed' : 'Clocked In') : 'Awaiting Check-in' }}
            </h2>
            <p class="text-xs text-sky-100 mt-1">
              Signed in as <span class="font-semibold text-white">{{ currentUserName }}</span> ({{ currentUserRole }})
            </p>
          </div>

          <div v-if="myRecordToday" class="text-right">
            <p class="text-xs text-sky-200">Clocked In</p>
            <p class="text-base font-bold text-emerald-400 font-mono">{{ myRecordToday.checkIn }}</p>
            <p v-if="myRecordToday.checkOut" class="text-xs text-sky-200 mt-1">Clocked Out</p>
            <p v-if="myRecordToday.checkOut" class="text-base font-bold text-amber-400 font-mono">{{ myRecordToday.checkOut }}</p>
          </div>
        </div>

        <div class="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative">
          <p class="text-xs text-sky-200/80">
            Synchronized with biometric devices and corporate IP geolocation.
          </p>

          <button
            @click="handleClockAction"
            :disabled="isPunching || (myRecordToday && !!myRecordToday.checkOut)"
            class="px-6 py-2.5 rounded-xl bg-[#1989d9] hover:bg-[#0e6db3] text-white font-bold text-xs shadow-lg shadow-[#1989d9]/30 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed self-start sm:self-auto cursor-pointer"
          >
            <span v-if="isPunching">Syncing...</span>
            <span v-else-if="!myRecordToday">Clock In Now</span>
            <span v-else-if="!myRecordToday.checkOut">Clock Out Shift</span>
            <span v-else>Done for Today</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
      <button
        @click="activeTab = 'daily'"
        :class="[
          'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer',
          activeTab === 'daily'
            ? 'bg-[#1989d9] text-white shadow-sm shadow-[#1989d9]/30'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
        ]"
      >
        <Clock class="w-4 h-4" />
        <span>Daily Attendance Logs ({{ scopedAttendance?.length || 0 }})</span>
      </button>

      <!-- Shift Templates: Only Admin can see -->
      <button
        v-if="isSuperAdmin"
        @click="activeTab = 'shifts'"
        :class="[
          'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer',
          activeTab === 'shifts'
            ? 'bg-[#1989d9] text-white shadow-sm shadow-[#1989d9]/30'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
        ]"
      >
        <Layers class="w-4 h-4" />
        <span>Shift Templates ({{ shifts?.length || 0 }})</span>
      </button>
    </div>

    <!-- TAB 1: DAILY ATTENDANCE LOGS -->
    <div v-if="activeTab === 'daily'" class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
      <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h2 class="text-base font-bold text-slate-900 dark:text-white">Daily Attendance Register</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {{ isSuperAdmin ? 'All organization records for ' + todayStr : isDepartmentManager ? 'Department team records for ' + todayStr : 'Your personal attendance records for ' + todayStr }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            {{ presentCount }} Present
          </span>
          <span class="text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            {{ lateCount }} Late
          </span>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th class="py-3.5 px-6">Employee</th>
              <th class="py-3.5 px-6">Shift Template</th>
              <th class="py-3.5 px-6">Clock In</th>
              <th class="py-3.5 px-6">Clock Out</th>
              <th class="py-3.5 px-6">Work Hours</th>
              <th class="py-3.5 px-6">Overtime</th>
              <th class="py-3.5 px-6 text-right">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
            <tr v-if="scopedAttendance.length === 0">
              <td colspan="7" class="py-12 text-center text-slate-400 text-xs">
                No attendance logs found for your profile today.
              </td>
            </tr>
            <tr
              v-for="record in scopedAttendance"
              :key="record.id"
              class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
            >
              <td class="py-4 px-6 font-semibold text-slate-900 dark:text-white text-xs">
                {{ record.employeeName }}
              </td>
              <td class="py-4 px-6 text-xs text-slate-500 dark:text-slate-400">
                {{ record.shift || 'General Day Shift' }}
              </td>
              <td class="py-4 px-6 text-xs font-medium text-slate-800 dark:text-slate-200 font-mono">
                {{ record.checkIn }}
              </td>
              <td class="py-4 px-6 text-xs text-slate-500 dark:text-slate-400 font-mono">
                {{ record.checkOut || 'Active' }}
              </td>
              <td class="py-4 px-6 text-xs text-slate-600 dark:text-slate-300 font-mono">
                {{ record.workHours ? `${record.workHours} hrs` : 'In progress' }}
              </td>
              <td class="py-4 px-6 text-xs font-mono font-medium text-[#0e6db3] dark:text-[#38a5e4]">
                {{ record.overtimeHours ? `+${record.overtimeHours} hrs` : '—' }}
              </td>
              <td class="py-4 px-6 text-right">
                <span
                  :class="[
                    'px-2.5 py-1 rounded-md text-xs font-semibold',
                    record.status === 'Present'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                      : record.status === 'Late'
                      ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                      : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                  ]"
                >
                  {{ record.status }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 2: SHIFT TEMPLATES (DYNAMIC CRUD) - Admin Only -->
    <div v-if="activeTab === 'shifts' && isSuperAdmin" class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h2 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock class="w-5 h-5 text-[#1989d9]" />
            <span>Shift Templates & Rosters</span>
          </h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Create, modify, and manage dynamic organizational shift timings and grace periods
          </p>
        </div>
        <button
          v-if="isSuperAdmin"
          @click="openAddShiftModal"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#044663] to-[#1989d9] hover:from-[#065578] hover:to-[#2298ea] text-white font-bold text-xs shadow-md shadow-[#1989d9]/20 active:scale-95 transition-all cursor-pointer"
        >
          <Plus class="w-4 h-4" />
          <span>Add Shift Template</span>
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          v-for="shift in shifts"
          :key="shift.id"
          class="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 hover:border-[#1989d9] transition-all group flex flex-col justify-between"
        >
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="p-2.5 rounded-xl bg-[#1989d9]/10 text-[#0e6db3] dark:text-[#38a5e4]">
                <Clock class="w-5 h-5" />
              </span>
              <div class="flex items-center gap-1.5">
                <span class="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Grace: {{ shift.graceMinutes }}m
                </span>
                <!-- Edit & Delete Shift Actions -->
                <button
                  v-if="isSuperAdmin"
                  @click="openEditShiftModal(shift)"
                  title="Edit Shift"
                  class="p-1.5 rounded-lg text-slate-400 hover:text-[#1989d9] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Pencil class="w-3.5 h-3.5" />
                </button>
                <button
                  v-if="isSuperAdmin"
                  @click="handleDeleteShift(shift)"
                  title="Delete Shift"
                  class="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <h3 class="text-base font-bold text-slate-900 dark:text-white">{{ shift.name }}</h3>
              <p class="text-sm font-extrabold text-[#0e6db3] dark:text-[#38a5e4] font-mono mt-1">
                {{ shift.startTime }} &rarr; {{ shift.endTime }}
              </p>
            </div>
          </div>

          <div class="pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <span class="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-2">Active Work Days</span>
            <div class="flex items-center gap-1.5 flex-wrap">
              <span
                v-for="day in shift.activeDays"
                :key="day"
                class="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#1989d9]/10 text-[#0e6db3] dark:text-[#38a5e4] border border-[#1989d9]/20"
              >
                {{ day }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL: ADD / EDIT SHIFT TEMPLATE -->
    <div
      v-if="isShiftModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
    >
      <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 space-y-5 animate-scaleUp">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">
              {{ isEditingShift ? 'Edit Shift Template' : 'Create New Shift Template' }}
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Configure working hours, grace period, and active schedule days
            </p>
          </div>
          <button
            @click="isShiftModalOpen = false"
            class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <form @submit.prevent="handleSaveShift" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Shift Name
            </label>
            <input
              v-model="shiftName"
              placeholder="e.g. Night Support Shift"
              required
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-hidden focus:border-[#1989d9]"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Start Time
              </label>
              <input
                v-model="shiftStartTime"
                placeholder="09:00 AM"
                required
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-semibold focus:outline-hidden focus:border-[#1989d9]"
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                End Time
              </label>
              <input
                v-model="shiftEndTime"
                placeholder="06:00 PM"
                required
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-semibold focus:outline-hidden focus:border-[#1989d9]"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Grace Period (Minutes)
            </label>
            <input
              type="number"
              v-model="shiftGraceMinutes"
              min="0"
              max="120"
              required
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-semibold focus:outline-hidden focus:border-[#1989d9]"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Active Business Days
            </label>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                v-for="day in allWeekDays"
                :key="day"
                @click="toggleShiftDay(day)"
                :class="[
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border',
                  shiftActiveDays.includes(day)
                    ? 'bg-[#1989d9] text-white border-[#1989d9] shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-[#1989d9]'
                ]"
              >
                {{ day }}
              </button>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              @click="isShiftModalOpen = false"
              class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isSavingShift"
              class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#044663] to-[#1989d9] hover:from-[#065578] hover:to-[#2298ea] text-white font-bold text-xs shadow-md shadow-[#1989d9]/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {{ isSavingShift ? 'Saving...' : (isEditingShift ? 'Update Shift' : 'Create Shift Template') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
