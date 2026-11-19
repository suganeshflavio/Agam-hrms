<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Building,
  MapPin,
  Award,
  ShieldCheck,
  GitBranch,
  Plus,
  CheckCircle2,
  Lock,
  Edit2,
  Check,
  X,
  AlertCircle,
  Users,
  Pencil,
  Trash2,
  UserCheck,
} from '@lucide/vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiQuery, useApiMutation, useAppSelector } from '@/redux/vueAdapter'
import type { CompanyInfo, Branch, Grade, RolePermission, ApprovalWorkflow, Employee } from '@/types/hrms'

const activeTab = ref<'company' | 'branches' | 'grades' | 'roles' | 'workflows'>('company')

const currentUser = useAppSelector((state) => state.auth.user)
const isSuperAdmin = computed(() => {
  const r = (currentUser.value?.role || '').toLowerCase()
  return !r || r.includes('admin') || r.includes('hr') || r === 'super admin' || r === 'hr manager'
})

const { data: company } = useApiQuery<CompanyInfo>(hrmsApi.endpoints.getCompany)
const { data: branches } = useApiQuery<Branch[]>(hrmsApi.endpoints.getBranches)
const { data: grades } = useApiQuery<Grade[]>(hrmsApi.endpoints.getGrades)
const { data: roles } = useApiQuery<RolePermission[]>(hrmsApi.endpoints.getRoles)
const { data: workflows } = useApiQuery<ApprovalWorkflow[]>(hrmsApi.endpoints.getWorkflows)
const { data: employees } = useApiQuery<Employee[]>(hrmsApi.endpoints.getEmployees)

const [updateCompany] = useApiMutation(hrmsApi.endpoints.updateCompany)
const [addBranch] = useApiMutation(hrmsApi.endpoints.addBranch)
const [updateRolePermission] = useApiMutation(hrmsApi.endpoints.updateRolePermission)
const [addRole] = useApiMutation(hrmsApi.endpoints.addRole)
const [addWorkflowLevel] = useApiMutation(hrmsApi.endpoints.addWorkflowLevel)
const [updateWorkflowLevel] = useApiMutation(hrmsApi.endpoints.updateWorkflowLevel)
const [deleteWorkflowLevel] = useApiMutation(hrmsApi.endpoints.deleteWorkflowLevel)

// Branch modal state
const isBranchModalOpen = ref(false)
const branchName = ref('')
const branchCode = ref('')
const branchCity = ref('')
const branchCountry = ref('')
const branchTimezone = ref('America/New_York')

// Role editing state
const selectedRoleId = ref<string>('role-1')
const activeRole = computed(() => {
  return (roles.value || []).find((r) => r.id === selectedRoleId.value) || (roles.value || [])[0]
})

const assignedRoleUsers = computed(() => {
  const roleName = activeRole.value?.roleName
  if (!roleName) return []
  return (employees.value || []).filter((e) => e.role === roleName)
})

const isAddRoleModalOpen = ref(false)
const newRoleName = ref('')
const newRoleDesc = ref('')
const roleFeedback = ref('')

// Workflow level editing state
const isLevelModalOpen = ref(false)
const selectedWfId = ref<string | null>(null)
const selectedWfName = ref('')
const isEditingLevel = ref(false)
const editingLevelNumber = ref<number | null>(null)
const levelApproverRole = ref('Reporting Manager')
const levelDescription = ref('')

const approverRoleOptions = [
  'Reporting Manager',
  'Department Head',
  'HR Manager',
  'HR Director',
  'Finance Manager',
  'Super Admin',
]

const openAddLevelModal = (wf: ApprovalWorkflow) => {
  selectedWfId.value = wf.id
  selectedWfName.value = wf.workflowName
  isEditingLevel.value = false
  editingLevelNumber.value = null
  levelApproverRole.value = 'Reporting Manager'
  levelDescription.value = 'Primary approval tier within 24 hours'
  isLevelModalOpen.value = true
}

const openEditLevelModal = (wf: ApprovalWorkflow, lvl: { level: number; approverRole: string; description: string }) => {
  selectedWfId.value = wf.id
  selectedWfName.value = wf.workflowName
  isEditingLevel.value = true
  editingLevelNumber.value = lvl.level
  levelApproverRole.value = lvl.approverRole
  levelDescription.value = lvl.description
  isLevelModalOpen.value = true
}

const handleSaveLevel = async () => {
  if (!selectedWfId.value) return
  if (isEditingLevel.value && editingLevelNumber.value !== null) {
    await updateWorkflowLevel({
      workflowId: selectedWfId.value,
      levelNumber: editingLevelNumber.value,
      updates: {
        approverRole: levelApproverRole.value,
        description: levelDescription.value,
      },
    })
    showRoleFeedback(`Workflow level ${editingLevelNumber.value} updated successfully!`)
  } else {
    await addWorkflowLevel({
      workflowId: selectedWfId.value,
      level: {
        approverRole: levelApproverRole.value,
        description: levelDescription.value || `${levelApproverRole.value} verification and sign-off`,
      },
    })
    showRoleFeedback(`New approval level added to ${selectedWfName.value}!`)
  }
  isLevelModalOpen.value = false
}

const handleDeleteLevel = async (wf: ApprovalWorkflow, levelNumber: number) => {
  if (confirm(`Are you sure you want to remove Level ${levelNumber} from ${wf.workflowName}?`)) {
    await deleteWorkflowLevel({ workflowId: wf.id, levelNumber })
    showRoleFeedback(`Level ${levelNumber} removed from ${wf.workflowName}.`)
  }
}

const showRoleFeedback = (msg: string) => {
  roleFeedback.value = msg
  setTimeout(() => {
    roleFeedback.value = ''
  }, 3500)
}

const handleCreateBranch = async () => {
  if (!branchName.value || !branchCode.value) return
  await addBranch({
    name: branchName.value,
    code: branchCode.value,
    address: '100 Business Park Blvd',
    city: branchCity.value || 'San Francisco',
    country: branchCountry.value || 'United States',
    isHeadquarters: false,
    timezone: branchTimezone.value,
    activeEmployees: 0,
  })
  branchName.value = ''
  branchCode.value = ''
  isBranchModalOpen.value = false
}

// Toggle granular permission action
const handleTogglePermission = async (
  roleId: string,
  moduleName: string,
  field: 'read' | 'write' | 'delete' | 'approve',
  currentVal: boolean
) => {
  if (!isSuperAdmin.value) {
    showRoleFeedback('Access Restricted: Only Super Admin can modify role permissions.')
    return
  }

  await updateRolePermission({
    roleId,
    moduleName,
    field,
    value: !currentVal,
  })

  showRoleFeedback(`Updated ${field.toUpperCase()} permission for ${moduleName} under ${activeRole.value?.roleName}!`)
}

// Create new dynamic role
const handleCreateRole = async () => {
  if (!newRoleName.value) return
  const standardModules = ['HR Administration', 'Employee Directory', 'Onboarding', 'Attendance', 'Leave Management', 'Payroll & Tax']
  
  await addRole({
    roleName: newRoleName.value,
    description: newRoleDesc.value || 'Custom user role with customized access privileges.',
    usersCount: 0,
    permissions: standardModules.map((module) => ({
      module,
      read: true,
      write: false,
      delete: false,
      approve: false,
    })),
  })

  newRoleName.value = ''
  newRoleDesc.value = ''
  isAddRoleModalOpen.value = false
  showRoleFeedback('New security role created successfully!')
}
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          HR Administration
        </h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Company profile, global branches, designations, salary grades, security roles, and approval workflows
        </p>
      </div>

      <!-- Super Admin Status Badge -->
      <div class="flex items-center gap-2">
        <span
          v-if="isSuperAdmin"
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold"
        >
          <ShieldCheck class="w-3.5 h-3.5" />
          <span>Super Admin Access</span>
        </span>
        <span
          v-else
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
        >
          <Lock class="w-3.5 h-3.5" />
          <span>Read-Only Mode</span>
        </span>
      </div>
    </div>

    <!-- Alert / Toast -->
    <div
      v-if="roleFeedback"
      class="flex items-center gap-2 p-3.5 rounded-xl bg-[#1989d9]/10 border border-[#1989d9]/30 text-[#044663] dark:text-[#38a5e4] text-xs font-medium animate-fadeIn"
    >
      <CheckCircle2 class="w-4 h-4 text-[#1989d9] shrink-0" />
      <span>{{ roleFeedback }}</span>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
      <button
        v-for="t in [
          { id: 'company', label: 'Company Profile', icon: Building },
          { id: 'branches', label: 'Branches & Locations', icon: MapPin },
          { id: 'grades', label: 'Salary Grades', icon: Award },
          { id: 'roles', label: 'Roles & Permissions', icon: ShieldCheck },
          { id: 'workflows', label: 'Approval Workflows', icon: GitBranch },
        ] as const"
        :key="t.id"
        @click="activeTab = t.id"
        :class="[
          'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer',
          activeTab === t.id
            ? 'bg-[#1989d9] text-white shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
        ]"
      >
        <component :is="t.icon" class="w-4 h-4" />
        <span>{{ t.label }}</span>
      </button>
    </div>

    <!-- 1. Company Profile Tab -->
    <div v-if="activeTab === 'company'" class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="md:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <h2 class="text-base font-bold text-slate-900 dark:text-white">Organization Legal Details</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span class="text-slate-400">Company Name</span>
            <p class="font-semibold text-slate-800 dark:text-slate-100 mt-0.5">{{ company?.name }}</p>
          </div>
          <div>
            <span class="text-slate-400">Legal Entity Name</span>
            <p class="font-semibold text-slate-800 dark:text-slate-100 mt-0.5">{{ company?.legalName }}</p>
          </div>
          <div>
            <span class="text-slate-400">Tax Identification Number</span>
            <p class="font-semibold text-slate-800 dark:text-slate-100 mt-0.5 font-mono">{{ company?.taxId }}</p>
          </div>
          <div>
            <span class="text-slate-400">Registration Number</span>
            <p class="font-semibold text-slate-800 dark:text-slate-100 mt-0.5 font-mono">{{ company?.registrationNumber }}</p>
          </div>
          <div>
            <span class="text-slate-400">Industry Vertical</span>
            <p class="font-semibold text-slate-800 dark:text-slate-100 mt-0.5">{{ company?.industry }}</p>
          </div>
          <div>
            <span class="text-slate-400">Global Headquarters</span>
            <p class="font-semibold text-slate-800 dark:text-slate-100 mt-0.5">{{ company?.headquarters }}</p>
          </div>
        </div>
      </div>

      <div class="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <h2 class="text-base font-bold text-slate-900 dark:text-white">Financial & Fiscal</h2>
        <div class="space-y-3 text-xs">
          <div>
            <span class="text-slate-400">Base Currency</span>
            <p class="font-bold text-slate-800 dark:text-slate-100 mt-0.5 font-mono">{{ company?.currency }}</p>
          </div>
          <div>
            <span class="text-slate-400">Fiscal Year Cycle</span>
            <p class="font-semibold text-slate-800 dark:text-slate-100 mt-0.5">Starts in {{ company?.fiscalYearStart }}</p>
          </div>
          <div>
            <span class="text-slate-400">Primary Domain</span>
            <p class="font-semibold text-[#1989d9] mt-0.5">{{ company?.website }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. Branches Tab -->
    <div v-if="activeTab === 'branches'" class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-base font-bold text-slate-900 dark:text-white">Active Operational Branches</h2>
        <button
          @click="isBranchModalOpen = true"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1989d9] hover:bg-[#0e6db3] text-white text-xs font-semibold cursor-pointer"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>Add Branch</span>
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          v-for="b in branches"
          :key="b.id"
          class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div class="flex items-center justify-between">
              <span class="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-[#1989d9]/10 text-[#0e6db3] dark:text-[#38a5e4]">
                {{ b.code }}
              </span>
              <span v-if="b.isHeadquarters" class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                HQ
              </span>
            </div>
            <h3 class="font-bold text-sm text-slate-900 dark:text-white mt-3">{{ b.name }}</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{{ b.address }}, {{ b.city }}, {{ b.country }}</p>
          </div>
          <div class="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>Timezone: {{ b.timezone }}</span>
            <span class="font-semibold text-slate-800 dark:text-slate-200">{{ b.activeEmployees }} Staff</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. Grades Tab -->
    <div v-if="activeTab === 'grades'" class="space-y-4">
      <div class="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-semibold uppercase text-slate-400">
              <th class="py-3 px-6">Grade Name</th>
              <th class="py-3 px-6">Hierarchy Level</th>
              <th class="py-3 px-6">Salary Band</th>
              <th class="py-3 px-6">Executive Benefits</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80">
            <tr v-for="g in grades" :key="g.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
              <td class="py-4 px-6 font-bold text-slate-900 dark:text-white">{{ g.name }}</td>
              <td class="py-4 px-6 font-mono text-slate-600 dark:text-slate-300">Level {{ g.level }}</td>
              <td class="py-4 px-6 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                ${{ g.minSalary.toLocaleString() }} – ${{ g.maxSalary.toLocaleString() }}
              </td>
              <td class="py-4 px-6 text-slate-600 dark:text-slate-300">
                <span v-for="b in g.benefits" :key="b" class="inline-block mr-1.5 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px]">
                  {{ b }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 4. Roles & Permissions Tab (Dynamic & Editable by Super Admin) -->
    <div v-if="activeTab === 'roles'" class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-base font-bold text-slate-900 dark:text-white">Security Roles & Dynamic Permissions</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure granular Read, Write, Delete, and Approve access per system module.
          </p>
        </div>

        <button
          v-if="isSuperAdmin"
          @click="isAddRoleModalOpen = true"
          class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#044663] hover:bg-[#065578] text-white text-xs font-semibold cursor-pointer shadow-xs"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>Add Custom Role</span>
        </button>
      </div>

      <!-- Role Selector Tabs -->
      <div class="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          v-for="r in roles"
          :key="r.id"
          @click="selectedRoleId = r.id"
          :class="[
            'px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2',
            (selectedRoleId === r.id || (!selectedRoleId && r.id === activeRole?.id))
              ? 'bg-[#1989d9] text-white shadow-md shadow-[#1989d9]/25'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-[#1989d9]'
          ]"
        >
          <ShieldCheck class="w-4 h-4" />
          <span>{{ r.roleName }}</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
            {{ r.usersCount }}
          </span>
        </button>
      </div>

      <!-- Active Role Detailed Permission Matrix -->
      <div v-if="activeRole" class="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ activeRole?.roleName }}</h3>
              <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#1989d9]/10 text-[#0e6db3] dark:text-[#38a5e4]">
                {{ activeRole?.usersCount || 0 }} Users Assigned
              </span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">{{ activeRole?.description }}</p>
          </div>

          <div v-if="!isSuperAdmin" class="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800">
            <Lock class="w-3.5 h-3.5" />
            <span>Only Super Admin can toggle checkboxes</span>
          </div>
        </div>

        <!-- Dynamic Permission Table with Read, Write, Delete, Approve Checkboxes -->
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-semibold uppercase text-slate-400">
                <th class="py-3 px-4">HRMS Core Module</th>
                <th class="py-3 px-4 text-center">Read (View)</th>
                <th class="py-3 px-4 text-center">Write (Create / Edit)</th>
                <th class="py-3 px-4 text-center">Delete (Remove)</th>
                <th class="py-3 px-4 text-center">Approve (Workflow)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80">
              <tr
                v-for="perm in (activeRole?.permissions || [])"
                :key="perm.module"
                class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <td class="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                  {{ perm.module }}
                </td>

                <!-- Read Action Checkbox -->
                <td class="py-3.5 px-4 text-center">
                  <label class="inline-flex items-center justify-center cursor-pointer">
                    <input
                      type="checkbox"
                      :checked="perm.read"
                      :disabled="!isSuperAdmin"
                      @change="handleTogglePermission(activeRole.id, perm.module, 'read', perm.read)"
                      class="w-4 h-4 rounded border-slate-300 text-[#1989d9] focus:ring-[#1989d9] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    />
                  </label>
                </td>

                <!-- Write Action Checkbox -->
                <td class="py-3.5 px-4 text-center">
                  <label class="inline-flex items-center justify-center cursor-pointer">
                    <input
                      type="checkbox"
                      :checked="perm.write"
                      :disabled="!isSuperAdmin"
                      @change="handleTogglePermission(activeRole.id, perm.module, 'write', perm.write)"
                      class="w-4 h-4 rounded border-slate-300 text-[#1989d9] focus:ring-[#1989d9] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    />
                  </label>
                </td>

                <!-- Delete Action Checkbox -->
                <td class="py-3.5 px-4 text-center">
                  <label class="inline-flex items-center justify-center cursor-pointer">
                    <input
                      type="checkbox"
                      :checked="perm.delete"
                      :disabled="!isSuperAdmin"
                      @change="handleTogglePermission(activeRole.id, perm.module, 'delete', perm.delete)"
                      class="w-4 h-4 rounded border-slate-300 text-rose-500 focus:ring-rose-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    />
                  </label>
                </td>

                <!-- Approve Action Checkbox -->
                <td class="py-3.5 px-4 text-center">
                  <label class="inline-flex items-center justify-center cursor-pointer">
                    <input
                      type="checkbox"
                      :checked="perm.approve"
                      :disabled="!isSuperAdmin"
                      @change="handleTogglePermission(activeRole.id, perm.module, 'approve', perm.approve)"
                      class="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    />
                  </label>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Assigned Users with this Role & Read/View Menu Access -->
        <div class="pt-5 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Users class="w-4 h-4 text-[#1989d9]" />
                <span>Users with Role "{{ activeRole?.roleName }}" (Menu & View Access)</span>
              </h4>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Only users assigned this role can see the active read-enabled menu items
              </p>
            </div>
            <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {{ assignedRoleUsers.length }} active users
            </span>
          </div>

          <div v-if="assignedRoleUsers.length === 0" class="py-6 text-center text-slate-400 text-xs">
            No employees currently assigned to this role.
          </div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            <div
              v-for="user in assignedRoleUsers"
              :key="user.id"
              class="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2.5"
            >
              <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#044663] to-[#1989d9] text-white flex items-center justify-center font-bold text-xs shrink-0">
                {{ user.firstName[0] }}{{ user.lastName[0] }}
              </div>
              <div class="min-w-0">
                <p class="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {{ user.firstName }} {{ user.lastName }}
                </p>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {{ user.designation }} • {{ user.department }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 5. Approval Workflows Tab (Dynamic Leave Levels & Hierarchies) -->
    <div v-if="activeTab === 'workflows'" class="space-y-4">
      <div
        v-for="wf in workflows"
        :key="wf.id"
        class="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4"
      >
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div class="flex items-center gap-2">
              <h3 class="font-bold text-base text-slate-900 dark:text-white">{{ wf.workflowName }}</h3>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50">
                {{ wf.status }}
              </span>
            </div>
            <span class="text-xs text-[#0e6db3] dark:text-[#38a5e4] font-semibold">
              Module: {{ wf.module }} • {{ wf.levels.length }} Approval Tiers
            </span>
          </div>

          <!-- Add Approval Tier Action -->
          <button
            v-if="isSuperAdmin"
            @click="openAddLevelModal(wf)"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#044663] to-[#1989d9] text-white text-xs font-bold hover:shadow-md transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>Add Level</span>
          </button>
        </div>

        <!-- Levels List (Dynamic Add, Edit, Delete) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div
            v-for="lvl in wf.levels"
            :key="lvl.level"
            class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-3 text-xs group hover:border-[#1989d9] transition-colors"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#044663] to-[#1989d9] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                L{{ lvl.level }}
              </div>
              <div class="min-w-0">
                <p class="font-bold text-slate-800 dark:text-slate-200 truncate">{{ lvl.approverRole }}</p>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate">{{ lvl.description }}</p>
              </div>
            </div>

            <!-- Edit and Delete Level Buttons -->
            <div v-if="isSuperAdmin" class="flex items-center gap-1 shrink-0">
              <button
                @click="openEditLevelModal(wf, lvl)"
                title="Edit Level"
                class="p-1 rounded-lg text-slate-400 hover:text-[#1989d9] hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <Pencil class="w-3.5 h-3.5" />
              </button>
              <button
                v-if="wf.levels.length > 1"
                @click="handleDeleteLevel(wf, lvl.level)"
                title="Remove Level"
                class="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Add Branch -->
    <div
      v-if="isBranchModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
        <h3 class="text-base font-bold text-slate-900 dark:text-white">Add Global Branch</h3>
        <div class="space-y-3 text-xs">
          <div>
            <label class="block text-slate-700 dark:text-slate-300 font-medium mb-1">Branch Name</label>
            <input v-model="branchName" placeholder="e.g. London Office" class="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-[#1989d9] focus:outline-hidden" />
          </div>
          <div>
            <label class="block text-slate-700 dark:text-slate-300 font-medium mb-1">Branch Code</label>
            <input v-model="branchCode" placeholder="e.g. LON-UK" class="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-[#1989d9] focus:outline-hidden" />
          </div>
          <div>
            <label class="block text-slate-700 dark:text-slate-300 font-medium mb-1">City</label>
            <input v-model="branchCity" placeholder="e.g. London" class="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-[#1989d9] focus:outline-hidden" />
          </div>
        </div>
        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button @click="isBranchModalOpen = false" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600">Cancel</button>
          <button @click="handleCreateBranch" class="px-4 py-2 rounded-xl bg-[#1989d9] text-white text-xs font-semibold">Save Branch</button>
        </div>
      </div>
    </div>

    <!-- Modal: Add Custom Role -->
    <div
      v-if="isAddRoleModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
        <h3 class="text-base font-bold text-slate-900 dark:text-white">Create Security Role</h3>
        <p class="text-xs text-slate-500">Define a custom organizational role with specific module permissions.</p>
        <div class="space-y-3 text-xs">
          <div>
            <label class="block text-slate-700 dark:text-slate-300 font-medium mb-1">Role Title</label>
            <input v-model="newRoleName" placeholder="e.g. Compliance Auditor" class="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-[#1989d9] focus:outline-hidden" />
          </div>
          <div>
            <label class="block text-slate-700 dark:text-slate-300 font-medium mb-1">Role Description</label>
            <textarea v-model="newRoleDesc" rows="2" placeholder="Responsibilities and scope..." class="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-[#1989d9] focus:outline-hidden"></textarea>
          </div>
        </div>
        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button @click="isAddRoleModalOpen = false" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600">Cancel</button>
          <button @click="handleCreateRole" class="px-4 py-2 rounded-xl bg-[#044663] text-white text-xs font-semibold">Create Role</button>
        </div>
      </div>
    </div>

    <!-- Modal: Dynamic Approval Workflow Tier / Level -->
    <div
      v-if="isLevelModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
    >
      <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-scaleUp">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">
              {{ isEditingLevel ? `Edit Approval Level ${editingLevelNumber}` : 'Add Approval Level' }}
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">{{ selectedWfName }}</p>
          </div>
          <button @click="isLevelModalOpen = false" class="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-3.5 text-xs">
          <div>
            <label class="block font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
              <UserCheck class="w-4 h-4 text-[#1989d9]" />
              <span>Approver Role / Authority</span>
            </label>
            <select
              v-model="levelApproverRole"
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-[#1989d9] text-xs font-semibold focus:outline-hidden"
            >
              <option v-for="roleOpt in approverRoleOptions" :key="roleOpt" :value="roleOpt">
                {{ roleOpt }}
              </option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-slate-800 dark:text-slate-200 mb-1">
              Description / SLA Scope
            </label>
            <input
              v-model="levelDescription"
              placeholder="e.g. Manager validation within 24 business hours"
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-[#1989d9] text-xs font-semibold focus:outline-hidden"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button @click="isLevelModalOpen = false" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600">
            Cancel
          </button>
          <button
            @click="handleSaveLevel"
            class="px-5 py-2 rounded-xl bg-gradient-to-r from-[#044663] to-[#1989d9] hover:from-[#065578] hover:to-[#2298ea] text-white text-xs font-bold shadow-md shadow-[#1989d9]/20 transition-all cursor-pointer"
          >
            {{ isEditingLevel ? 'Save Changes' : 'Append Level' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
