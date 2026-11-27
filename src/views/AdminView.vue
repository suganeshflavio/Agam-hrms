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
  Network,
} from '@lucide/vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiQuery, useApiMutation } from '@/redux/vueAdapter'
import type { CompanyInfo, Branch, Grade, RolePermission, ApprovalWorkflow, Employee, Department } from '@/types/hrms'
import type { ApiError } from '@/services/apiClient'
import { useMoney } from '@/composables/useMoney'
import { usePermissions } from '@/composables/usePermissions'
import { refreshSession } from '@/services/sessionSync'

const activeTab = ref<'company' | 'branches' | 'grades' | 'roles' | 'workflows' | 'departments'>('company')

// Access from Roles & Permissions: HR Administration row
// (Read = view, Write = add/edit, Delete = remove).
const { can } = usePermissions()
const canCreateAdmin = computed(() => can('admin', 'create'))
const canEditAdmin = computed(() => can('admin', 'edit'))
const canDeleteAdmin = computed(() => can('admin', 'delete'))

const { data: company } = useApiQuery<CompanyInfo>(hrmsApi.endpoints.getCompany)
const { formatMoney } = useMoney()
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
const [addWorkflow] = useApiMutation(hrmsApi.endpoints.addWorkflow)
const [updateWorkflow] = useApiMutation(hrmsApi.endpoints.updateWorkflow)
const [deleteWorkflow] = useApiMutation(hrmsApi.endpoints.deleteWorkflow)
const { data: departments } = useApiQuery<Department[]>(hrmsApi.endpoints.getDepartments)
const [addGrade] = useApiMutation(hrmsApi.endpoints.addGrade)
const [updateGrade] = useApiMutation(hrmsApi.endpoints.updateGrade)
const [deleteGrade] = useApiMutation(hrmsApi.endpoints.deleteGrade)
const [addDepartment] = useApiMutation(hrmsApi.endpoints.addDepartment)
const [updateDepartment] = useApiMutation(hrmsApi.endpoints.updateDepartment)
const [deleteDepartment] = useApiMutation(hrmsApi.endpoints.deleteDepartment)

// Shared error banner for grade / department actions
const adminError = ref('')
const showAdminError = (err: unknown) => {
  adminError.value = (err as ApiError)?.data || 'Something went wrong'
  setTimeout(() => (adminError.value = ''), 5000)
}

// ---- Company profile (view / edit)
const isEditingCompany = ref(false)
const companyForm = ref<Partial<CompanyInfo>>({})
const companyError = ref('')
const companyFields: { key: keyof CompanyInfo; label: string; placeholder?: string; mono?: boolean }[] = [
  { key: 'name', label: 'Company Name' },
  { key: 'legalName', label: 'Legal Entity Name', placeholder: 'e.g. Agam Technologies Pvt Ltd' },
  { key: 'taxId', label: 'Tax Identification Number', placeholder: 'e.g. GSTIN / EIN', mono: true },
  { key: 'registrationNumber', label: 'Registration Number', placeholder: 'e.g. CIN', mono: true },
  { key: 'industry', label: 'Industry Vertical', placeholder: 'e.g. IT Services' },
  { key: 'headquarters', label: 'Global Headquarters', placeholder: 'e.g. Coimbatore, India' },
]
const startEditCompany = () => {
  companyError.value = ''
  companyForm.value = { ...(company.value || {}) }
  isEditingCompany.value = true
}
const saveCompany = async () => {
  if (!companyForm.value.name?.trim()) return (companyError.value = 'Company name is required')
  const f = companyForm.value
  const { error } = await updateCompany({
    name: f.name?.trim(), legalName: f.legalName, taxId: f.taxId, registrationNumber: f.registrationNumber,
    industry: f.industry, headquarters: f.headquarters, currency: f.currency, fiscalYearStart: f.fiscalYearStart, website: f.website,
  })
  if (error) return (companyError.value = (error as ApiError).data || 'Could not save the company profile')
  isEditingCompany.value = false
  showRoleFeedback('Company profile updated')
}

// ---- Approval workflows (create / rename / activate / delete)
const workflowModules = ['Leave', 'WFH', 'Expense', 'Promotion', 'Resignation', 'Requisition'] as const
const isWorkflowModalOpen = ref(false)
const wfForm = ref({ id: '', name: '', module: 'Leave' as ApprovalWorkflow['module'], status: 'Active' as ApprovalWorkflow['status'], firstApprover: 'Reporting Manager' })
const wfError = ref('')
const openWorkflowModal = (wf?: ApprovalWorkflow) => {
  wfError.value = ''
  wfForm.value = wf
    ? { id: wf.id, name: wf.workflowName, module: wf.module, status: wf.status, firstApprover: '' }
    : { id: '', name: '', module: 'Leave', status: 'Active', firstApprover: 'Reporting Manager' }
  isWorkflowModalOpen.value = true
}
const saveWorkflow = async () => {
  const f = wfForm.value
  if (!f.name.trim()) return (wfError.value = 'Workflow name is required')
  const { error } = f.id
    ? await updateWorkflow({ id: f.id, updates: { workflowName: f.name.trim(), module: f.module, status: f.status } })
    : await addWorkflow({
        workflowName: f.name.trim(), module: f.module, status: f.status,
        levels: [{ level: 1, approverRole: f.firstApprover, description: `${f.firstApprover} verification and sign-off` }],
      })
  if (error) return (wfError.value = (error as ApiError).data || 'Could not save the workflow')
  isWorkflowModalOpen.value = false
  showRoleFeedback(`Workflow "${f.name.trim()}" saved`)
}
const toggleWorkflowStatus = async (wf: ApprovalWorkflow) => {
  const status = wf.status === 'Active' ? 'Draft' : 'Active'
  const { error } = await updateWorkflow({ id: wf.id, updates: { status } })
  if (error) return showAdminError(error)
  showRoleFeedback(`${wf.workflowName} is now ${status === 'Active' ? 'active' : 'a draft'}`)
}
const removeWorkflow = async (wf: ApprovalWorkflow) => {
  if (!confirm(`Delete the "${wf.workflowName}" workflow? Requests will use the default approval route.`)) return
  const { error } = await deleteWorkflow(wf.id)
  if (error) return showAdminError(error)
  showRoleFeedback(`Workflow "${wf.workflowName}" deleted`)
}

// ---- Salary grades (create / edit / delete)
const isGradeModalOpen = ref(false)
const gradeForm = ref({ id: '', name: '', level: 1, minSalary: 0, maxSalary: 0, benefits: '' })
const gradeFormError = ref('')
const openGradeModal = (grade?: Grade) => {
  gradeFormError.value = ''
  gradeForm.value = grade
    ? { id: grade.id, name: grade.name, level: grade.level, minSalary: grade.minSalary, maxSalary: grade.maxSalary, benefits: grade.benefits.join(', ') }
    : { id: '', name: '', level: (grades.value?.length ?? 0) + 1, minSalary: 0, maxSalary: 0, benefits: '' }
  isGradeModalOpen.value = true
}
const saveGrade = async () => {
  const f = gradeForm.value
  if (!f.name.trim()) return (gradeFormError.value = 'Grade name is required')
  if (Number(f.maxSalary) < Number(f.minSalary)) return (gradeFormError.value = 'Maximum salary must be at least the minimum')
  const body = {
    name: f.name.trim(), level: Number(f.level), minSalary: Number(f.minSalary), maxSalary: Number(f.maxSalary),
    benefits: f.benefits.split(',').map((b) => b.trim()).filter(Boolean),
  }
  const { error } = f.id ? await updateGrade({ id: f.id, updates: body }) : await addGrade(body)
  if (error) return (gradeFormError.value = (error as ApiError).data || 'Could not save the grade')
  isGradeModalOpen.value = false
  showRoleFeedback(`Salary grade "${body.name}" saved`)
}
const removeGrade = async (grade: Grade) => {
  if (!confirm(`Delete salary grade "${grade.name}"?`)) return
  const { error } = await deleteGrade(grade.id)
  if (error) return showAdminError(error)
  showRoleFeedback(`Salary grade "${grade.name}" deleted`)
}

// ---- Departments (create / edit / delete)
const isDeptModalOpen = ref(false)
const deptForm = ref({ id: '', name: '', code: '', head: '', budget: 0 })
const deptFormError = ref('')
const headOptions = computed(() =>
  (employees.value || []).filter((e) => e.isCurrent !== false).map((e) => `${e.firstName} ${e.lastName}`),
)
const openDeptModal = (dept?: Department) => {
  deptFormError.value = ''
  deptForm.value = dept
    ? { id: dept.id, name: dept.name, code: dept.code, head: dept.head, budget: dept.budget }
    : { id: '', name: '', code: '', head: '', budget: 0 }
  isDeptModalOpen.value = true
}
const saveDepartment = async () => {
  const f = deptForm.value
  if (!f.name.trim() || !f.code.trim()) return (deptFormError.value = 'Department name and code are required')
  const body = { name: f.name.trim(), code: f.code.trim().toUpperCase(), head: f.head, budget: Number(f.budget) || 0 }
  const { error } = f.id ? await updateDepartment({ id: f.id, updates: body }) : await addDepartment(body)
  if (error) return (deptFormError.value = (error as ApiError).data || 'Could not save the department')
  isDeptModalOpen.value = false
  showRoleFeedback(`Department "${body.name}" saved`)
}
const removeDepartment = async (dept: Department) => {
  if (!confirm(`Delete department "${dept.name}"?`)) return
  const { error } = await deleteDepartment(dept.id)
  if (error) return showAdminError(error)
  showRoleFeedback(`Department "${dept.name}" deleted`)
}

// Branch modal state
const isBranchModalOpen = ref(false)
const branchName = ref('')
const branchCode = ref('')
const branchCity = ref('')
const branchCountry = ref('')
const branchTimezone = ref('')

// Role editing state
const selectedRoleId = ref<string>('')
const activeRole = computed(() => {
  return (roles.value || []).find((r) => r.id === selectedRoleId.value) || (roles.value || [])[0]
})

const assignedRoleUsers = computed(() => {
  const role = activeRole.value
  if (!role) return []
  return (employees.value || []).filter((e) => e.roleIds?.includes(role.id) || e.role === role.roleName)
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

// Relationship-based approvers plus the company's real roles.
const approverRoleOptions = computed(() => [
  ...new Set(['Reporting Manager', 'Department Head', ...(roles.value || []).map((r) => r.roleName)]),
])

const openAddLevelModal = (wf: ApprovalWorkflow) => {
  selectedWfId.value = wf.id
  selectedWfName.value = wf.workflowName
  isEditingLevel.value = false
  editingLevelNumber.value = null
  levelApproverRole.value = 'Reporting Manager'
  levelDescription.value = ''
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
    address: '',
    city: branchCity.value,
    country: branchCountry.value,
    isHeadquarters: false,
    timezone: branchTimezone.value,
    activeEmployees: 0,
  })
  branchName.value = ''
  branchCode.value = ''
  branchCity.value = ''
  branchCountry.value = ''
  branchTimezone.value = ''
  isBranchModalOpen.value = false
}

// Toggle granular permission action
const handleTogglePermission = async (
  roleId: string,
  moduleName: string,
  field: 'read' | 'write' | 'delete' | 'approve',
  currentVal: boolean
) => {
  if (!canEditAdmin.value) {
    showRoleFeedback('Access restricted: your role cannot change role permissions.')
    return
  }

  const { error } = await updateRolePermission({
    roleId,
    moduleName,
    field,
    value: !currentVal,
  })
  if (error) return showAdminError(error)
  // The admin may have changed their own role: refresh their menu and buttons.
  void refreshSession()

  showRoleFeedback(`Updated ${field.toUpperCase()} permission for ${moduleName} under ${activeRole.value?.roleName}!`)
}

// Create new dynamic role
const handleCreateRole = async () => {
  if (!newRoleName.value) return
  if (!canEditAdmin.value) return
  // The five modules of Roles & Permissions, read-only to start.
  const standardModules = ['HR Administration', 'Employee Onboarding', 'Attendance', 'Leave Management', 'Payroll & Tax']

  const { error } = await addRole({
    roleName: newRoleName.value,
    description: newRoleDesc.value,
    usersCount: 0,
    permissions: standardModules.map((module) => ({
      module,
      read: true,
      write: false,
      delete: false,
      approve: false,
    })),
  })

  if (error) return showAdminError(error)
  void refreshSession()

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
          v-if="canEditAdmin"
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold"
        >
          <ShieldCheck class="w-3.5 h-3.5" />
          <span>Manage Access</span>
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
    <div class="scroll-row items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
      <button
        v-for="t in [
          { id: 'company', label: 'Company Profile', icon: Building },
          { id: 'branches', label: 'Branches & Locations', icon: MapPin },
          { id: 'grades', label: 'Salary Grades', icon: Award },
          { id: 'roles', label: 'Roles & Permissions', icon: ShieldCheck },
          { id: 'workflows', label: 'Approval Workflows', icon: GitBranch },
          { id: 'departments', label: 'Departments', icon: Network },
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
    <div v-if="activeTab === 'company'" class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-base font-bold text-slate-900 dark:text-white">Company Profile</h2>
        <div v-if="canEditAdmin" class="flex items-center gap-2">
          <template v-if="isEditingCompany">
            <button @click="isEditingCompany = false" class="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
            <button @click="saveCompany" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1989d9] hover:bg-[#0e6db3] text-white text-xs font-semibold">
              <Check class="w-3.5 h-3.5" /> Save Changes
            </button>
          </template>
          <button v-else @click="startEditCompany" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
            <Pencil class="w-3.5 h-3.5" /> Edit Profile
          </button>
        </div>
      </div>
      <p v-if="companyError" class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-xs text-rose-700" role="alert">{{ companyError }}</p>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="md:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <h3 class="text-base font-bold text-slate-900 dark:text-white">Organization Legal Details</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div v-for="field in companyFields" :key="field.key">
              <span class="text-slate-400">{{ field.label }}</span>
              <input
                v-if="isEditingCompany" v-model="companyForm[field.key]" :placeholder="field.placeholder"
                class="mt-1 w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-[#1989d9] focus:outline-hidden"
              />
              <p v-else class="font-semibold text-slate-800 dark:text-slate-100 mt-0.5" :class="field.mono ? 'font-mono' : ''">
                {{ company?.[field.key] || '—' }}
              </p>
            </div>
          </div>
        </div>

        <div class="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <h3 class="text-base font-bold text-slate-900 dark:text-white">Financial & Fiscal</h3>
          <div class="space-y-3 text-xs">
            <div>
              <span class="text-slate-400">Base Currency</span>
              <select
                v-if="isEditingCompany" v-model="companyForm.currency"
                class="mt-1 w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-[#1989d9] focus:outline-hidden"
              >
                <option v-for="c in ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD']" :key="c" :value="c">{{ c }}</option>
              </select>
              <p v-else class="font-bold text-slate-800 dark:text-slate-100 mt-0.5 font-mono">{{ company?.currency || '—' }}</p>
            </div>
            <div>
              <span class="text-slate-400">Fiscal Year Starts In</span>
              <select
                v-if="isEditingCompany" v-model="companyForm.fiscalYearStart"
                class="mt-1 w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-[#1989d9] focus:outline-hidden"
              >
                <option value="">Not set</option>
                <option v-for="m in ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']" :key="m" :value="m">{{ m }}</option>
              </select>
              <p v-else class="font-semibold text-slate-800 dark:text-slate-100 mt-0.5">{{ company?.fiscalYearStart || '—' }}</p>
            </div>
            <div>
              <span class="text-slate-400">Primary Domain / Website</span>
              <input
                v-if="isEditingCompany" v-model="companyForm.website" placeholder="e.g. agam.com"
                class="mt-1 w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-[#1989d9] focus:outline-hidden"
              />
              <p v-else class="font-semibold text-[#1989d9] mt-0.5">{{ company?.website || '—' }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. Branches Tab -->
    <div v-if="activeTab === 'branches'" class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-base font-bold text-slate-900 dark:text-white">Active Operational Branches</h2>
        <button
          v-if="canCreateAdmin"
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
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{{ [b.address, b.city, b.country].filter(Boolean).join(', ') || '—' }}</p>
          </div>
          <div class="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>Timezone: {{ b.timezone || '—' }}</span>
            <span class="font-semibold text-slate-800 dark:text-slate-200">{{ b.activeEmployees }} Staff</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. Grades Tab -->
    <div v-if="activeTab === 'grades'" class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-base font-bold text-slate-900 dark:text-white">Salary Grades & Bands</h2>
        <button
          v-if="canCreateAdmin"
          @click="openGradeModal()"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1989d9] hover:bg-[#0e6db3] text-white text-xs font-semibold cursor-pointer"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>Add Grade</span>
        </button>
      </div>
      <div class="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-semibold uppercase text-slate-400">
              <th class="py-3 px-6">Grade Name</th>
              <th class="py-3 px-6">Hierarchy Level</th>
              <th class="py-3 px-6">Salary Band</th>
              <th class="py-3 px-6">Executive Benefits</th>
              <th class="py-3 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80">
            <tr v-for="g in grades" :key="g.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
              <td class="py-4 px-6 font-bold text-slate-900 dark:text-white">{{ g.name }}</td>
              <td class="py-4 px-6 font-mono text-slate-600 dark:text-slate-300">Level {{ g.level }}</td>
              <td class="py-4 px-6 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                {{ formatMoney(g.minSalary) }} – {{ formatMoney(g.maxSalary) }}
              </td>
              <td class="py-4 px-6 text-slate-600 dark:text-slate-300">
                <span v-for="b in g.benefits" :key="b" class="inline-block mr-1.5 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px]">
                  {{ b }}
                </span>
              </td>
              <td class="py-4 px-6 text-right whitespace-nowrap">
                <button v-if="canEditAdmin" title="Edit grade" class="p-1.5 rounded-lg text-slate-400 hover:text-[#1989d9] hover:bg-slate-100 dark:hover:bg-slate-800" @click="openGradeModal(g)">
                  <Pencil class="w-4 h-4" />
                </button>
                <button v-if="canDeleteAdmin" title="Delete grade" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800" @click="removeGrade(g)">
                  <Trash2 class="w-4 h-4" />
                </button>
              </td>
            </tr>
            <tr v-if="!grades?.length">
              <td colspan="5" class="py-10 text-center text-slate-400">No salary grades yet. Add your first grade.</td>
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
          v-if="canEditAdmin"
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

          <div v-if="!canEditAdmin" class="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800">
            <Lock class="w-3.5 h-3.5" />
            <span>Your role can view but not change permissions</span>
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
                      :disabled="!canEditAdmin"
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
                      :disabled="!canEditAdmin"
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
                      :disabled="!canEditAdmin"
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
                      :disabled="!canEditAdmin"
                      @change="handleTogglePermission(activeRole.id, perm.module, 'approve', perm.approve)"
                      class="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    />
                  </label>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="text-[11px] text-slate-500 dark:text-slate-400">
          Changes apply to users within a few minutes, or when they return to the app — no re-login needed.
        </p>

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
              {{ activeRole?.usersCount || 0 }} assigned
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
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-base font-bold text-slate-900 dark:text-white">Approval Workflows</h2>
          <p class="text-xs text-slate-500">The active Leave workflow decides who approves leave requests.</p>
        </div>
        <button
          v-if="canEditAdmin" @click="openWorkflowModal()"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1989d9] hover:bg-[#0e6db3] text-white text-xs font-semibold cursor-pointer"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>Add Workflow</span>
        </button>
      </div>
      <div v-if="!workflows?.length" class="p-10 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-sm text-slate-400">
        No approval workflows yet. Add one to control who approves requests.
      </div>
      <div
        v-for="wf in workflows"
        :key="wf.id"
        class="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4"
      >
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div class="flex items-center gap-2">
              <h3 class="font-bold text-base text-slate-900 dark:text-white">{{ wf.workflowName }}</h3>
              <span
                class="px-2 py-0.5 rounded text-[10px] font-bold uppercase border"
                :class="wf.status === 'Active'
                  ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-200/50'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200'"
              >
                {{ wf.status }}
              </span>
            </div>
            <span class="text-xs text-[#0e6db3] dark:text-[#38a5e4] font-semibold">
              Module: {{ wf.module }} • {{ wf.levels.length }} Approval Tiers
            </span>
          </div>

          <div v-if="canEditAdmin || canDeleteAdmin" class="flex items-center gap-1.5 self-start sm:self-auto">
          <button v-if="canEditAdmin" title="Rename / change module" class="p-1.5 rounded-lg text-slate-400 hover:text-[#1989d9] hover:bg-slate-100 dark:hover:bg-slate-800" @click="openWorkflowModal(wf)">
            <Pencil class="w-4 h-4" />
          </button>
          <button
            v-if="canEditAdmin"
            class="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            @click="toggleWorkflowStatus(wf)"
          >
            {{ wf.status === 'Active' ? 'Move to Draft' : 'Activate' }}
          </button>
          <button v-if="canDeleteAdmin" title="Delete workflow" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800" @click="removeWorkflow(wf)">
            <Trash2 class="w-4 h-4" />
          </button>
          <!-- Add Approval Tier Action -->
          <button
            v-if="canEditAdmin"
            @click="openAddLevelModal(wf)"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#044663] to-[#1989d9] text-white text-xs font-bold hover:shadow-md transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>Add Level</span>
          </button>
          </div>
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
            <div v-if="canEditAdmin" class="flex items-center gap-1 shrink-0">
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
    <!-- Departments Tab -->
    <div v-if="activeTab === 'departments'" class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-base font-bold text-slate-900 dark:text-white">Departments</h2>
        <button
          v-if="canCreateAdmin"
          @click="openDeptModal()"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1989d9] hover:bg-[#0e6db3] text-white text-xs font-semibold cursor-pointer"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>Add Department</span>
        </button>
      </div>
      <div class="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-semibold uppercase text-slate-400">
              <th class="py-3 px-6">Department</th>
              <th class="py-3 px-6">Code</th>
              <th class="py-3 px-6">Head</th>
              <th class="py-3 px-6">Employees</th>
              <th class="py-3 px-6">Budget</th>
              <th class="py-3 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80">
            <tr v-for="d in departments" :key="d.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
              <td class="py-4 px-6 font-bold text-slate-900 dark:text-white">{{ d.name }}</td>
              <td class="py-4 px-6 font-mono text-slate-600 dark:text-slate-300">{{ d.code }}</td>
              <td class="py-4 px-6 text-slate-600 dark:text-slate-300">{{ d.head || '—' }}</td>
              <td class="py-4 px-6 text-slate-600 dark:text-slate-300">{{ d.totalEmployees }}</td>
              <td class="py-4 px-6 font-mono text-slate-600 dark:text-slate-300">{{ d.budget ? d.budget.toLocaleString() : '—' }}</td>
              <td class="py-4 px-6 text-right whitespace-nowrap">
                <button v-if="canEditAdmin" title="Edit department" class="p-1.5 rounded-lg text-slate-400 hover:text-[#1989d9] hover:bg-slate-100 dark:hover:bg-slate-800" @click="openDeptModal(d)">
                  <Pencil class="w-4 h-4" />
                </button>
                <button v-if="canDeleteAdmin" title="Delete department" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800" @click="removeDepartment(d)">
                  <Trash2 class="w-4 h-4" />
                </button>
              </td>
            </tr>
            <tr v-if="!departments?.length">
              <td colspan="6" class="py-10 text-center text-slate-400">No departments yet. Add your first department.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Error banner for grade / department actions -->
    <div v-if="adminError" class="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-rose-600 text-white text-sm shadow-lg" role="alert">
      {{ adminError }}
    </div>

    <!-- Modal: Add / Edit Approval Workflow -->
    <div v-if="isWorkflowModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
        <h3 class="text-base font-bold text-slate-900 dark:text-white">{{ wfForm.id ? 'Edit Workflow' : 'Add Approval Workflow' }}</h3>
        <div class="space-y-3 text-xs">
          <div>
            <label class="block text-slate-700 dark:text-slate-300 font-medium mb-1">Workflow Name</label>
            <input v-model="wfForm.name" placeholder="e.g. Leave Approval" class="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-[#1989d9] focus:outline-hidden" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-medium mb-1">Module</label>
              <select v-model="wfForm.module" class="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-[#1989d9] focus:outline-hidden">
                <option v-for="m in workflowModules" :key="m" :value="m">{{ m }}</option>
              </select>
            </div>
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-medium mb-1">Status</label>
              <select v-model="wfForm.status" class="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-[#1989d9] focus:outline-hidden">
                <option value="Active">Active</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
          </div>
          <div v-if="!wfForm.id">
            <label class="block text-slate-700 dark:text-slate-300 font-medium mb-1">First Approver (Level 1)</label>
            <select v-model="wfForm.firstApprover" class="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-[#1989d9] focus:outline-hidden">
              <option v-for="r in approverRoleOptions" :key="r" :value="r">{{ r }}</option>
            </select>
            <p class="mt-1 text-slate-400">Add more levels from the workflow card after saving.</p>
          </div>
          <p v-if="wfForm.module !== 'Leave'" class="text-amber-600">Only Leave workflows route approvals today; other modules are stored for later use.</p>
          <p v-if="wfError" class="text-rose-600 font-medium">{{ wfError }}</p>
        </div>
        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button @click="isWorkflowModalOpen = false" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600">Cancel</button>
          <button @click="saveWorkflow" class="px-4 py-2 rounded-xl bg-[#1989d9] text-white text-xs font-semibold">Save Workflow</button>
        </div>
      </div>
    </div>

    <!-- Modal: Add / Edit Salary Grade -->
    <div v-if="isGradeModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
        <h3 class="text-base font-bold text-slate-900 dark:text-white">{{ gradeForm.id ? 'Edit Salary Grade' : 'Add Salary Grade' }}</h3>
        <div class="space-y-3 text-xs">
          <div>
            <label class="block text-slate-700 dark:text-slate-300 font-medium mb-1">Grade Name</label>
            <input v-model="gradeForm.name" placeholder="e.g. Lead (L1-L2)" class="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-[#1989d9] focus:outline-hidden" />
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-medium mb-1">Level</label>
              <input v-model.number="gradeForm.level" type="number" min="1" class="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-[#1989d9] focus:outline-hidden" />
            </div>
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-medium mb-1">Min Salary</label>
              <input v-model.number="gradeForm.minSalary" type="number" min="0" class="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-[#1989d9] focus:outline-hidden" />
            </div>
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-medium mb-1">Max Salary</label>
              <input v-model.number="gradeForm.maxSalary" type="number" min="0" class="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-[#1989d9] focus:outline-hidden" />
            </div>
          </div>
          <div>
            <label class="block text-slate-700 dark:text-slate-300 font-medium mb-1">Benefits (comma separated)</label>
            <input v-model="gradeForm.benefits" placeholder="e.g. Health Insurance, Learning Allowance" class="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-[#1989d9] focus:outline-hidden" />
          </div>
          <p v-if="gradeFormError" class="text-rose-600 font-medium">{{ gradeFormError }}</p>
        </div>
        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button @click="isGradeModalOpen = false" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600">Cancel</button>
          <button @click="saveGrade" class="px-4 py-2 rounded-xl bg-[#1989d9] text-white text-xs font-semibold">Save Grade</button>
        </div>
      </div>
    </div>

    <!-- Modal: Add / Edit Department -->
    <div v-if="isDeptModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
        <h3 class="text-base font-bold text-slate-900 dark:text-white">{{ deptForm.id ? 'Edit Department' : 'Add Department' }}</h3>
        <div class="space-y-3 text-xs">
          <div class="grid grid-cols-3 gap-3">
            <div class="col-span-2">
              <label class="block text-slate-700 dark:text-slate-300 font-medium mb-1">Department Name</label>
              <input v-model="deptForm.name" placeholder="e.g. Engineering" class="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-[#1989d9] focus:outline-hidden" />
            </div>
            <div>
              <label class="block text-slate-700 dark:text-slate-300 font-medium mb-1">Code</label>
              <input v-model="deptForm.code" placeholder="e.g. ENG" class="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-[#1989d9] focus:outline-hidden uppercase" />
            </div>
          </div>
          <div>
            <label class="block text-slate-700 dark:text-slate-300 font-medium mb-1">Department Head</label>
            <select v-model="deptForm.head" class="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-[#1989d9] focus:outline-hidden">
              <option value="">Not assigned</option>
              <option v-for="name in headOptions" :key="name" :value="name">{{ name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-slate-700 dark:text-slate-300 font-medium mb-1">Annual Budget</label>
            <input v-model.number="deptForm.budget" type="number" min="0" class="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-[#1989d9] focus:outline-hidden" />
          </div>
          <p v-if="deptFormError" class="text-rose-600 font-medium">{{ deptFormError }}</p>
        </div>
        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button @click="isDeptModalOpen = false" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600">Cancel</button>
          <button @click="saveDepartment" class="px-4 py-2 rounded-xl bg-[#1989d9] text-white text-xs font-semibold">Save Department</button>
        </div>
      </div>
    </div>

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
          <div>
            <label class="block text-slate-700 dark:text-slate-300 font-medium mb-1">Country</label>
            <input v-model="branchCountry" placeholder="e.g. India" class="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-[#1989d9] focus:outline-hidden" />
          </div>
          <div>
            <label class="block text-slate-700 dark:text-slate-300 font-medium mb-1">Timezone (optional)</label>
            <input v-model="branchTimezone" placeholder="e.g. Asia/Kolkata — leave blank to use the company timezone" class="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-[#1989d9] focus:outline-hidden" />
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
