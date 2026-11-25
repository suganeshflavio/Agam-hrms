<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  UserPlus,
  Search,
  Filter,
  Trash2,
  KeyRound,
  Copy,
  Mail,
  Phone,
  Building,
  Briefcase,
  CheckCircle2,
  Eye,
  Download,
  MapPin,
  Award,
  ShieldCheck,
  Pencil,
} from '@lucide/vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiQuery, useApiMutation } from '@/redux/vueAdapter'
import { apiRequest, type ApiError } from '@/services/apiClient'
import type { Employee, Department, Branch } from '@/types/hrms'
import AddEmployeeWizard from '@/components/employees/AddEmployeeWizard.vue'
import { useMoney } from '@/composables/useMoney'
import { usePermissions } from '@/composables/usePermissions'

const router = useRouter()
const { formatMoney } = useMoney()
// Access follows HR Administration -> Roles & Permissions ("Employee Onboarding" row).
const { user: currentUser, can } = usePermissions()
const canViewAll = computed(() => can('employees', 'view'))

// Redux API Queries & Mutations
const { data: employees, isLoading } = useApiQuery<Employee[]>(hrmsApi.endpoints.getEmployees)
const { data: departments } = useApiQuery<Department[]>(hrmsApi.endpoints.getDepartments)
const { data: branches } = useApiQuery<Branch[]>(hrmsApi.endpoints.getBranches)
const [deleteEmployee] = useApiMutation(hrmsApi.endpoints.deleteEmployee)

// Filters & Modal State
const searchQuery = ref('')
const selectedDepartment = ref('All')
const selectedStatus = ref('All')
const selectedBranch = ref('All')
const isModalOpen = ref(false)
// Edit: the same wizard, pre-filled with the chosen employee.
const editingEmployee = ref<Employee | null>(null)
const successMessage = ref('')
const onEmployeeSaved = (employee: Employee) => {
  successMessage.value = `${employee.firstName} ${employee.lastName}'s details were updated`
  setTimeout(() => (successMessage.value = ''), 3500)
}

const onEmployeeCreated = (employee: Employee) => {
  successMessage.value = `${employee.firstName} ${employee.lastName} added successfully!`
  setTimeout(() => {
    successMessage.value = ''
  }, 3500)
}

// Read access on "Employee Onboarding" shows everyone; otherwise the user
// sees themself and the people who report to them.
const roleScopedEmployees = computed(() => {
  const all = employees.value || []
  if (canViewAll.value) return all
  const myId = currentUser.value?.employeeId
  if (!myId) return []
  return all.filter((e) => e.id === myId || e.reportingManagerId === myId)
})

const filteredEmployees = computed(() => {
  const source = roleScopedEmployees.value
  const q = (searchQuery.value || '').toLowerCase().trim()
  return source.filter((emp) => {
    if (!emp) return false
    const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase()
    const matchesSearch =
      q === '' ||
      fullName.includes(q) ||
      (emp.email || '').toLowerCase().includes(q) ||
      (emp.employeeCode || '').toLowerCase().includes(q) ||
      (emp.designation || '').toLowerCase().includes(q)

    const matchesDept =
      selectedDepartment.value === 'All' || emp.department === selectedDepartment.value

    const matchesStatus =
      selectedStatus.value === 'All' || emp.status === selectedStatus.value

    const matchesBranch =
      selectedBranch.value === 'All' || emp.branch === selectedBranch.value

    return matchesSearch && matchesDept && matchesStatus && matchesBranch
  })
})

// Password reset needs user-management rights (HR Administration -> Write)
const canManageAccounts = computed(() => can('admin', 'create'))
const resetResult = ref<{ name: string; email: string; password: string; emailSent: boolean } | null>(null)
const resetError = ref('')
const resettingId = ref<string | null>(null)
const copied = ref(false)

const handleResetPassword = async (emp: Employee) => {
  const name = `${emp.firstName} ${emp.lastName}`
  if (!confirm(`Reset the password for ${name}?\n\nA new temporary password will be emailed to them and shown to you once. Their current password stops working immediately.`)) return
  resetError.value = ''
  resettingId.value = emp.id
  try {
    const res = await apiRequest<{ email: string; emailSent: boolean; temporaryPassword: string }>(
      `/app/employees/${emp.id}/account/resend`,
      { method: 'POST' },
    )
    copied.value = false
    resetResult.value = { name, email: res.email, password: res.temporaryPassword, emailSent: res.emailSent }
  } catch (err) {
    resetError.value = (err as ApiError).data || 'Password could not be reset'
    setTimeout(() => (resetError.value = ''), 5000)
  } finally {
    resettingId.value = null
  }
}

const copyPassword = async () => {
  if (!resetResult.value) return
  try {
    await navigator.clipboard.writeText(resetResult.value.password)
    copied.value = true
  } catch {
    copied.value = false
  }
}

const handleDelete = async (id: string, name: string) => {
  if (confirm(`Are you sure you want to delete ${name}?`)) {
    await deleteEmployee(id)
  }
}

const exportToCsv = () => {
  const list = filteredEmployees.value
  if (!list.length) return

  const headers = ['Employee Code', 'First Name', 'Last Name', 'Email', 'Phone', 'Department', 'Designation', 'Grade', 'Branch', 'Type', 'Status', 'Joining Date', 'Salary']
  const rows = list.map((e) => [
    `"${e.employeeCode}"`,
    `"${e.firstName}"`,
    `"${e.lastName}"`,
    `"${e.email}"`,
    `"${e.phone}"`,
    `"${e.department}"`,
    `"${e.designation}"`,
    `"${e.grade || ''}"`,
    `"${e.branch || ''}"`,
    `"${e.employmentType}"`,
    `"${e.status}"`,
    `"${e.joiningDate}"`,
    `"${e.salary}"`,
  ])

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const encodedUri = encodeURI(csvContent)
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute('download', `agam_employees_directory_${new Date().toISOString().split('T')[0]}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Employee Onboarding
        </h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Manage 360° employee profiles, organizational hierarchies, documents, and promotions
        </p>
      </div>

      <div class="flex items-center gap-2">
        <!-- Scope Badge -->
        <span
          v-if="canViewAll"
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold"
        >
          <ShieldCheck class="w-3.5 h-3.5" />
          <span>All Company Data</span>
        </span>
        <span
          v-else
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-[#0e6db3] dark:text-[#38a5e4] border border-blue-200 dark:border-blue-800 text-xs font-semibold"
        >
          <Building class="w-3.5 h-3.5" />
          <span>My Team Only</span>
        </span>

        <button
          v-if="can('employees', 'export')"
          @click="exportToCsv"
          class="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
        >
          <Download class="w-4 h-4" />
          <span>Export CSV</span>
        </button>
        <button
          v-if="can('employees', 'create')"
          @click="isModalOpen = true"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1989d9] hover:bg-[#0e6db3] text-white font-semibold text-xs shadow-md shadow-[#1989d9]/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <UserPlus class="w-4 h-4" />
          <span>Add Employee</span>
        </button>
      </div>
    </div>

    <!-- Feedback notification -->
    <div
      v-if="successMessage"
      class="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-medium animate-fadeIn"
    >
      <CheckCircle2 class="w-5 h-5 text-emerald-500 shrink-0" />
      <span>{{ successMessage }}</span>
    </div>

    <!-- Filters & Search Toolbar -->
    <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
      <div class="relative w-full md:w-72">
        <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by name, ID, or title..."
          class="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 dark:text-slate-200"
        />
      </div>

      <div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
        <!-- Department Filter -->
        <select
          v-model="selectedDepartment"
          class="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-hidden"
        >
          <option value="All">All Departments</option>
          <option v-for="dept in departments" :key="dept.id" :value="dept.name">
            {{ dept.name }}
          </option>
        </select>

        <!-- Branch Filter -->
        <select
          v-model="selectedBranch"
          class="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-hidden"
        >
          <option value="All">All Locations</option>
          <option v-for="branch in branches" :key="branch.id" :value="branch.name">
            {{ branch.name }}
          </option>
        </select>

        <!-- Status Filter -->
        <select
          v-model="selectedStatus"
          class="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-hidden"
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="On Leave">On Leave</option>
          <option value="Probation">Probation</option>
          <option value="Terminated">Terminated</option>
        </select>
      </div>
    </div>

    <!-- Employees Table -->
    <div class="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th class="py-3.5 px-6">Employee</th>
              <th class="py-3.5 px-6">Department & Role</th>
              <th class="py-3.5 px-6">Location & Grade</th>
              <th class="py-3.5 px-6">Status</th>
              <th class="py-3.5 px-6">Compensation</th>
              <th class="py-3.5 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
            <tr v-if="isLoading">
              <td colspan="6" class="py-12 text-center text-slate-400 text-sm">
                <div class="flex items-center justify-center gap-2">
                  <div class="w-5 h-5 border-2 border-[#1989d9] border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading employees directory...</span>
                </div>
              </td>
            </tr>
            <tr v-else-if="filteredEmployees.length === 0">
              <td colspan="6" class="py-12 text-center text-slate-400 text-sm">
                No employees found matching the specified filters.
              </td>
            </tr>
            <tr
              v-for="emp in filteredEmployees"
              :key="emp.id"
              class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group"
            >
              <td class="py-4 px-6">
                <div class="flex items-center gap-3">
                  <div
                    @click="router.push(`/employees/${emp.id}`)"
                    class="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-xs shrink-0 cursor-pointer hover:scale-105 transition-transform"
                  >
                    {{ (emp.firstName || '').charAt(0) }}{{ (emp.lastName || '').charAt(0) }}
                  </div>
                  <div>
                    <button
                      @click="router.push(`/employees/${emp.id}`)"
                      class="font-semibold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 text-left transition-colors flex items-center gap-1.5"
                    >
                      <span>{{ emp.firstName }} {{ emp.lastName }}</span>
                      <Eye class="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-indigo-500 transition-opacity" />
                    </button>
                    <p class="text-xs text-slate-500 dark:text-slate-400">
                      {{ emp.employeeCode }} • {{ emp.email }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="py-4 px-6">
                <p class="font-medium text-slate-900 dark:text-slate-100 text-xs">{{ emp.designation }}</p>
                <p class="text-xs text-slate-500 dark:text-slate-400">{{ emp.department }}</p>
              </td>
              <td class="py-4 px-6">
                <p class="text-xs font-medium text-slate-800 dark:text-slate-200">{{ emp.branch || '—' }}</p>
                <p class="text-[11px] text-slate-400 truncate max-w-[150px]">{{ emp.grade || '—' }}</p>
              </td>
              <td class="py-4 px-6">
                <span
                  :class="[
                    'px-2.5 py-1 rounded-md text-xs font-semibold',
                    emp.status === 'Active'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                      : emp.status === 'On Leave'
                      ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                      : emp.status === 'Probation'
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                      : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                  ]"
                >
                  {{ emp.status }}
                </span>
              </td>
              <td class="py-4 px-6 text-xs font-bold text-slate-800 dark:text-slate-200">
                {{ emp.salary ? `${formatMoney(emp.salary)}/yr` : '—' }}
              </td>
              <td class="py-4 px-6 text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    @click="router.push(`/employees/${emp.id}`)"
                    title="View 360° Profile"
                    class="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors"
                  >
                    <Eye class="w-4 h-4" />
                  </button>
                  <button
                    v-if="can('employees', 'edit')"
                    @click="editingEmployee = emp"
                    title="Edit Employee"
                    class="p-1.5 rounded-lg text-slate-400 hover:text-[#1989d9] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Pencil class="w-4 h-4" />
                  </button>
                  <button
                    v-if="canManageAccounts && emp.hasLogin && emp.id !== currentUser?.employeeId"
                    :disabled="resettingId === emp.id"
                    @click="handleResetPassword(emp)"
                    title="Reset Password"
                    class="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
                  >
                    <KeyRound class="w-4 h-4" />
                  </button>
                  <button
                    v-if="can('employees', 'delete')"
                    @click="handleDelete(emp.id, `${emp.firstName} ${emp.lastName}`)"
                    title="Remove Employee"
                    class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Password reset error -->
    <div v-if="resetError" class="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-rose-600 text-white text-sm shadow-lg" role="alert">
      {{ resetError }}
    </div>

    <!-- Password reset result: the temporary password is shown once -->
    <div v-if="resetResult" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40"><KeyRound class="w-5 h-5 text-amber-600" /></div>
          <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">Password reset</h2>
            <p class="text-xs text-slate-500">{{ resetResult.name }} · {{ resetResult.email }}</p>
          </div>
        </div>
        <div>
          <p class="text-xs text-slate-500 mb-1.5">Temporary password</p>
          <div class="flex items-center gap-2">
            <code class="flex-1 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-base font-mono tracking-wide select-all">{{ resetResult.password }}</code>
            <button class="flex items-center gap-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold" @click="copyPassword">
              <Copy class="w-3.5 h-3.5" /> {{ copied ? 'Copied' : 'Copy' }}
            </button>
          </div>
        </div>
        <ul class="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc pl-4">
          <li v-if="resetResult.emailSent">Also emailed to {{ resetResult.email }}.</li>
          <li v-else class="text-amber-700">The email could not be sent — share this password with the employee directly.</li>
          <li>They must set a new password when they sign in. It expires in 7 days.</li>
          <li>This password won't be shown again.</li>
        </ul>
        <div class="flex justify-end">
          <button class="px-5 py-2.5 rounded-xl bg-[#1989d9] text-white text-xs font-semibold" @click="resetResult = null">Done</button>
        </div>
      </div>
    </div>

    <!-- Add Employee: multi-step onboarding wizard -->
    <AddEmployeeWizard v-if="isModalOpen" @close="isModalOpen = false" @created="onEmployeeCreated" />
    <AddEmployeeWizard
      v-if="editingEmployee" :employee="editingEmployee"
      @close="editingEmployee = null" @saved="onEmployeeSaved"
    />
  </div>
</template>
