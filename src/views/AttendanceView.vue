<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
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
  ClipboardCheck,
} from '@lucide/vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiQuery, useApiMutation, useAppSelector } from '@/redux/vueAdapter'
import type { AttendanceRecord, Shift, Employee, RegularizationRequest } from '@/types/hrms'
import DepartmentAttendanceRegister from '@/components/attendance/DepartmentAttendanceRegister.vue'
import AttendanceCalendar from '@/components/attendance/AttendanceCalendar.vue'
import RegularizationRequests from '@/components/attendance/RegularizationRequests.vue'
import { usePermissions } from '@/composables/usePermissions'

const currentUser = useAppSelector((state) => state.auth.user)
// Logins without an employee profile cannot punch attendance.
const currentUserId = computed(() => currentUser.value?.employeeId || '')
const currentUserName = computed(() => currentUser.value?.name || '')
const currentUserRole = computed(() => currentUser.value?.role || '—')
const hasEmployeeProfile = computed(() => !!currentUser.value?.employeeId)
const noProfileHint = "Your login isn't linked to an employee profile. Add yourself as an employee with your login email."
// Whose attendance the user sees comes from their role (data scope):
// Super Admin / HR -> everyone, Managers -> their team, General Employee -> only their own calendar.
// Shift templates are company-wide, so only Super Admin / HR manage them.
const { can } = usePermissions()
const dataScope = computed(() => currentUser.value?.dataScope || 'own')
const showRegister = computed(() => dataScope.value === 'all' || dataScope.value === 'team')
const canViewAll = computed(() => dataScope.value === 'all')
const registerLabel = computed(() => (dataScope.value === 'all' ? 'Department Register' : 'Team Register'))

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
const shiftStartTime = ref('')
const shiftEndTime = ref('')
const shiftGraceMinutes = ref(0)
const shiftActiveDays = ref<string[]>([])
const allWeekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const toggleShiftDay = (day: string) => {
  if (shiftActiveDays.value.includes(day)) {
    shiftActiveDays.value = shiftActiveDays.value.filter((d) => d !== day)
  } else {
    shiftActiveDays.value.push(day)
  }
}

// <input type="time"> uses 24-hour "HH:MM"; the API returns "09:00 AM".
const to24h = (value: string) => {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec((value || '').trim())
  if (!m) return ''
  let h = Number(m[1]) % 12
  if (!m[3]) h = Number(m[1])
  else if (m[3].toUpperCase() === 'PM') h += 12
  return `${String(h).padStart(2, '0')}:${m[2]}`
}

const openAddShiftModal = () => {
  isEditingShift.value = false
  editingShiftId.value = null
  shiftName.value = ''
  shiftStartTime.value = '09:00'
  shiftEndTime.value = '18:00'
  shiftGraceMinutes.value = 0
  shiftActiveDays.value = []
  isShiftModalOpen.value = true
}

const openEditShiftModal = (s: Shift) => {
  isEditingShift.value = true
  editingShiftId.value = s.id
  shiftName.value = s.name
  shiftStartTime.value = to24h(s.startTime)
  shiftEndTime.value = to24h(s.endTime)
  shiftGraceMinutes.value = s.graceMinutes
  shiftActiveDays.value = [...s.activeDays]
  isShiftModalOpen.value = true
}

const handleSaveShift = async () => {
  if (!shiftName.value.trim()) {
    showNotification('Shift name is required')
    return
  }
  if (!shiftStartTime.value.trim() || !shiftEndTime.value.trim()) {
    showNotification('Start and end times are required')
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

// Regularization requests: own, plus team (managers) / everyone (Super Admin, HR).
const { data: regularizations } = useApiQuery<RegularizationRequest[]>(hrmsApi.endpoints.getRegularizations)
const showRegularizations = computed(() => hasEmployeeProfile.value || showRegister.value)
const regularizationsWaiting = computed(() => (regularizations.value || []).filter((r) => r.canAct && r.status === 'Pending').length)

// Tabs & State
const activeTab = ref<'daily' | 'calendar' | 'regularizations' | 'shifts'>(showRegister.value ? 'daily' : 'calendar')
watch(showRegister, (show) => {
  if (!show && activeTab.value !== 'calendar') activeTab.value = 'calendar'
})
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

// The signed-in employee's assigned shift (from their employee record + shift templates).
const myShift = computed(() => {
  const me = (employees.value || []).find((e) => e.id === currentUserId.value)
  const name = me?.shift
  if (!name) return null
  return (shifts.value || []).find((s) => s.name === name) || { name, startTime: '', endTime: '' }
})

const handleClockAction = async () => {
  if (!hasEmployeeProfile.value) {
    showNotification(noProfileHint)
    return
  }
  const wasCheckedIn = Boolean(myRecordToday.value && !myRecordToday.value.checkOut)
  const { error } = await recordAttendance({
    employeeId: currentUserId.value,
    employeeName: currentUserName.value,
  })
  if (error) {
    showNotification(error?.data || 'Could not record attendance')
    return
  }
  showNotification(wasCheckedIn ? 'Checked out successfully! Shift recorded.' : 'Checked in successfully! Shift started.')
}


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
          Monitor daily clock-ins, shift rosters, and attendance records
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
            Assigned Shift: <span class="font-bold text-slate-800 dark:text-slate-200">{{ myShift ? (myShift.startTime ? `${myShift.name} (${myShift.startTime} – ${myShift.endTime})` : myShift.name) : '—' }}</span>
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
              Signed in as <span class="font-semibold text-white">{{ currentUserName || '—' }}</span> ({{ currentUserRole }})
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
            <template v-if="!hasEmployeeProfile">{{ noProfileHint }}</template>
          </p>

          <button
            @click="handleClockAction"
            :disabled="!hasEmployeeProfile || isPunching || (myRecordToday && !!myRecordToday.checkOut)"
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
    <div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
      <button
        v-if="hasEmployeeProfile"
        @click="activeTab = 'calendar'"
        :class="[
          'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap',
          activeTab === 'calendar'
            ? 'bg-[#1989d9] text-white shadow-sm shadow-[#1989d9]/30'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
        ]"
      >
        <CalendarDays class="w-4 h-4" />
        <span>My Attendance Calendar</span>
      </button>

      <button
        v-if="showRegister"
        @click="activeTab = 'daily'"
        :class="[
          'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap',
          activeTab === 'daily'
            ? 'bg-[#1989d9] text-white shadow-sm shadow-[#1989d9]/30'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
        ]"
      >
        <Clock class="w-4 h-4" />
        <span>{{ registerLabel }}</span>
      </button>

      <button
        v-if="showRegularizations"
        @click="activeTab = 'regularizations'"
        :class="[
          'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap',
          activeTab === 'regularizations'
            ? 'bg-[#1989d9] text-white shadow-sm shadow-[#1989d9]/30'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
        ]"
      >
        <ClipboardCheck class="w-4 h-4" />
        <span>Regularizations</span>
        <span v-if="regularizationsWaiting" class="min-w-5 h-5 px-1.5 rounded-full bg-amber-400 text-white text-[10px] flex items-center justify-center">{{ regularizationsWaiting }}</span>
      </button>

      <!-- Shift Templates: Only Admin can see -->
      <button
        v-if="canViewAll"
        @click="activeTab = 'shifts'"
        :class="[
          'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap',
          activeTab === 'shifts'
            ? 'bg-[#1989d9] text-white shadow-sm shadow-[#1989d9]/30'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
        ]"
      >
        <Layers class="w-4 h-4" />
        <span>Shift Templates ({{ shifts?.length || 0 }})</span>
      </button>
    </div>

    <!-- TAB 1: Super Admin / HR see a department-wise register; everyone else sees their own calendar -->
    <div v-if="activeTab === 'daily' && showRegister">
      <DepartmentAttendanceRegister />
    </div>
    <div v-if="activeTab === 'regularizations' && showRegularizations">
      <RegularizationRequests />
    </div>
    <div v-if="activeTab === 'calendar'">
      <AttendanceCalendar v-if="hasEmployeeProfile" />
      <div v-else class="p-10 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-sm text-slate-500">
        {{ noProfileHint }}
      </div>
    </div>

    <!-- TAB 2: SHIFT TEMPLATES (DYNAMIC CRUD) - Admin Only -->
    <div v-if="activeTab === 'shifts' && canViewAll" class="space-y-6">
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
          v-if="can('attendance', 'create')"
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
                  v-if="can('attendance', 'edit')"
                  @click="openEditShiftModal(shift)"
                  title="Edit Shift"
                  class="p-1.5 rounded-lg text-slate-400 hover:text-[#1989d9] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Pencil class="w-3.5 h-3.5" />
                </button>
                <button
                  v-if="can('attendance', 'delete')"
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
                type="time"
                required
                class="w-full cursor-pointer px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-semibold focus:outline-hidden focus:border-[#1989d9]"
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                End Time
              </label>
              <input
                v-model="shiftEndTime"
                type="time"
                required
                class="w-full cursor-pointer px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-semibold focus:outline-hidden focus:border-[#1989d9]"
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
