<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  UserPlus,
  Search,
  Filter,
  Trash2,
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
} from '@lucide/vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiQuery, useApiMutation, useAppSelector } from '@/redux/vueAdapter'
import type { Employee, Department, Branch } from '@/types/hrms'
import AddEmployeeWizard from '@/components/employees/AddEmployeeWizard.vue'

const router = useRouter()
const currentUser = useAppSelector((state) => state.auth.user)
const isSuperAdmin = computed(() => {
  const r = (currentUser.value?.role || '').toLowerCase()
  return (
    !r ||
    r.includes('admin') ||
    r.includes('hr') ||
    r === 'super admin' ||
    r === 'hr manager' ||
    r === 'hr super admin' ||
    r === 'recruiter' ||
    r === 'payroll specialist'
  )
})
const isDepartmentManager = computed(() => {
  const r = (currentUser.value?.role || '').toLowerCase()
  return r.includes('manager') && !isSuperAdmin.value
})

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
const successMessage = ref('')

const onEmployeeCreated = (employee: Employee) => {
  successMessage.value = `${employee.firstName} ${employee.lastName} added successfully!`
  setTimeout(() => {
    successMessage.value = ''
  }, 3500)
}

// Role-Based Access Scoping:
// Super Admin / HR can see ALL employees across the organization.
// Next role-based users (Department Managers) see their department employees.
// General Employees see their department/team or fallback to directory.
const roleScopedEmployees = computed(() => {
  const all = employees.value || []
  if (!all.length) return []

  if (isSuperAdmin.value) {
    return all
  }
  if (isDepartmentManager.value) {
    const dept = (currentUser.value?.department || '').toLowerCase()
    const managerName = (currentUser.value?.name || '').toLowerCase()
    const scoped = all.filter(
      (e) =>
        (dept && (e.department || '').toLowerCase() === dept) ||
        (managerName && (e.reportingManagerName || '').toLowerCase() === managerName)
    )
    return scoped.length > 0 ? scoped : all
  }
  const myId = currentUser.value?.employeeId || currentUser.value?.id
  const myDept = (currentUser.value?.department || '').toLowerCase()
  const myMatches = all.filter(
    (e) =>
      (myId && (e.id === myId || e.employeeCode === myId)) ||
      (myDept && (e.department || '').toLowerCase() === myDept)
  )
  return myMatches.length > 0 ? myMatches : all
})

const filteredEmployees = computed(() => {
  const source = roleScopedEmployees.value.length > 0 ? roleScopedEmployees.value : (employees.value || [])
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
      selectedBranch.value === 'All' || (emp.branch || 'San Francisco HQ') === selectedBranch.value

    return matchesSearch && matchesDept && matchesStatus && matchesBranch
  })
})

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
    `"${e.branch || 'San Francisco HQ'}"`,
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
          Employee Directory
        </h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Manage 360° employee profiles, organizational hierarchies, documents, and promotions
        </p>
      </div>

      <div class="flex items-center gap-2">
        <!-- Scope Badge -->
        <span
          v-if="isSuperAdmin"
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
          <span>{{ currentUser?.department }} Team Only</span>
        </span>

        <button
          @click="exportToCsv"
          class="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
        >
          <Download class="w-4 h-4" />
          <span>Export CSV</span>
        </button>
        <button
          @click="isModalOpen = true"
          :disabled="!isSuperAdmin"
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
                    {{ (emp.firstName || 'E')[0] }}{{ (emp.lastName || 'M')[0] }}
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
                <p class="text-xs font-medium text-slate-800 dark:text-slate-200">{{ emp.branch || 'San Francisco HQ' }}</p>
                <p class="text-[11px] text-slate-400 truncate max-w-[150px]">{{ emp.grade || 'Lead P2' }}</p>
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
                ${{ (emp.salary || 0).toLocaleString() }}/yr
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

    <!-- Add Employee: multi-step onboarding wizard -->
    <AddEmployeeWizard v-if="isModalOpen" @close="isModalOpen = false" @created="onEmployeeCreated" />
  </div>
</template>
