<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import {
  UserPlus,
  CheckCircle2,
  Clock,
  Laptop,
  FileCheck,
  ShieldCheck,
  CalendarCheck,
  UserCheck,
  Plus,
  X,
  ExternalLink,
  ArrowRight,
  Upload,
  Lock,
  FileText,
  Trash2,
  Award,
  GitBranch,
} from '@lucide/vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiQuery, useApiMutation, useAppSelector } from '@/redux/vueAdapter'
import type { OnboardingCandidate, Department, Grade, RolePermission, ApprovalWorkflow, EmployeeDocument, Shift, Employee } from '@/types/hrms'
import FormInput from '@/components/forms/FormInput.vue'
import FormSelect from '@/components/forms/FormSelect.vue'

const router = useRouter()
const currentUser = useAppSelector((state) => state.auth.user)
const isSuperAdmin = computed(() => {
  const r = (currentUser.value?.role || '').toLowerCase()
  return !r || r.includes('admin') || r.includes('hr') || r === 'super admin' || r === 'hr manager'
})

// Redux API Queries & Mutations
const { data: candidates, isLoading } = useApiQuery<OnboardingCandidate[]>(
  hrmsApi.endpoints.getOnboardingCandidates
)
const { data: departments } = useApiQuery<Department[]>(hrmsApi.endpoints.getDepartments)
const { data: grades } = useApiQuery<Grade[]>(hrmsApi.endpoints.getGrades)
const { data: roles } = useApiQuery<RolePermission[]>(hrmsApi.endpoints.getRoles)
const { data: workflows } = useApiQuery<ApprovalWorkflow[]>(hrmsApi.endpoints.getWorkflows)
const { data: shifts } = useApiQuery<Shift[]>(hrmsApi.endpoints.getShifts)
const { data: employees } = useApiQuery<Employee[]>(hrmsApi.endpoints.getEmployees)

const [toggleTask] = useApiMutation(hrmsApi.endpoints.toggleOnboardingTask)
const [addOnboardingCandidate, { isLoading: isAddingCand }] = useApiMutation(hrmsApi.endpoints.addOnboardingCandidate)
const [convertOnboardingCandidate, { isLoading: isConverting }] = useApiMutation(hrmsApi.endpoints.convertOnboardingCandidate)
const [addOnboardingDocument] = useApiMutation(hrmsApi.endpoints.addOnboardingDocument)

// Modal & Filter State
const isModalOpen = ref(false)
const selectedFilter = ref<'All' | 'In Progress' | 'Completed'>('All')
const feedbackMessage = ref('')
const newlyCreatedEmployee = ref<{ id: string; name: string } | null>(null)

// Super Admin Onboarding Conversion Modal State
const isOnboardingConversionModalOpen = ref(false)
const selectedCandidate = ref<OnboardingCandidate | null>(null)
const conversionRole = ref('General Employee')
const conversionShift = ref('General Day Shift')
const conversionManager = ref('Sarah Connor')
const conversionGrade = ref('Professional / Lead (P1-P3)')
const conversionWorkflow = ref('Standard 2-Tier Leave & Expense Approval')
const conversionSalary = ref(105000)
const uploadedCandidateDocs = ref<Array<{ title: string; category: 'ID Proof' | 'Educational' | 'Contract' | 'Tax'; fileSize: string }>>([
  { title: 'National_ID_Passport.pdf', category: 'ID Proof', fileSize: '2.1 MB' },
  { title: 'Signed_Employment_Agreement.pdf', category: 'Contract', fileSize: '1.4 MB' },
])

const showFeedback = (msg: string) => {
  feedbackMessage.value = msg
  setTimeout(() => {
    feedbackMessage.value = ''
  }, 4500)
}

// Pre-boarding Form Schema (VeeValidate + Zod)
const preboardSchema = z.object({
  candidateName: z.string().min(2, 'Candidate name is required'),
  email: z.string().email('Please enter a valid email address'),
  jobTitle: z.string().min(2, 'Job title is required'),
  department: z.string().min(1, 'Please select a department'),
  joiningDate: z.string().min(1, 'Joining date is required'),
  assignedBuddy: z.string().min(2, 'Assigned onboarding mentor is required'),
})

type PreboardFormValues = z.infer<typeof preboardSchema>

const { handleSubmit, resetForm } = useForm<PreboardFormValues>({
  validationSchema: toTypedSchema(preboardSchema),
  initialValues: {
    candidateName: '',
    email: '',
    jobTitle: '',
    department: 'Engineering',
    joiningDate: new Date().toISOString().split('T')[0],
    assignedBuddy: 'Sarah Connor',
  },
})

const onPreboardSubmit = handleSubmit(async (values) => {
  if (!isSuperAdmin.value) {
    showFeedback('Access Denied: Only Super Admin can initiate onboarding records.')
    return
  }
  await addOnboardingCandidate(values)
  showFeedback(`Candidate ${values.candidateName} added to pre-boarding queue!`)
  resetForm()
  isModalOpen.value = false
})

const handleTaskToggle = async (candidateId: string, taskId: string) => {
  if (!isSuperAdmin.value) {
    showFeedback('Access Denied: Only Super Admin can mark checklist tasks completed.')
    return
  }
  await toggleTask({ candidateId, taskId })
}

// Open Super Admin Conversion Modal
const openConversionModal = (cand: OnboardingCandidate) => {
  if (!isSuperAdmin.value) {
    showFeedback('Access Denied: Only Super Admin has authorization to upload documents, assign roles, and onboard active employees.')
    return
  }
  selectedCandidate.value = cand
  conversionRole.value = cand.assignedRole || 'General Employee'
  conversionShift.value = cand.shiftTiming || (shifts.value?.[0]?.name || 'General Day Shift')
  conversionManager.value = cand.reportingManager || cand.assignedBuddy || (employees.value?.[0]?.firstName ? `${employees.value[0].firstName} ${employees.value[0].lastName}` : 'Sarah Connor')
  conversionGrade.value = cand.salaryGrade || 'Professional / Lead (P1-P3)'
  conversionWorkflow.value = cand.approvalWorkflow || 'Standard 2-Tier Leave & Expense Approval'
  conversionSalary.value = cand.salary || 105000
  isOnboardingConversionModalOpen.value = true
}

// Add simulated document upload
const newDocTitle = ref('')
const newDocCategory = ref<'ID Proof' | 'Educational' | 'Contract' | 'Tax'>('Educational')

const handleAddDocument = () => {
  if (!newDocTitle.value) return
  uploadedCandidateDocs.value.push({
    title: newDocTitle.value.endsWith('.pdf') ? newDocTitle.value : `${newDocTitle.value}.pdf`,
    category: newDocCategory.value,
    fileSize: '1.8 MB',
  })
  newDocTitle.value = ''
}

const handleRemoveDoc = (index: number) => {
  uploadedCandidateDocs.value.splice(index, 1)
}

// Super Admin Complete Onboarding
const handleCompleteOnboarding = async () => {
  if (!selectedCandidate.value || !isSuperAdmin.value) return

  try {
    const formattedDocs: EmployeeDocument[] = uploadedCandidateDocs.value.map((d, i) => ({
      id: `doc-${Date.now()}-${i}`,
      title: d.title,
      category: d.category,
      uploadDate: new Date().toISOString().split('T')[0] ?? '',
      fileSize: d.fileSize,
      status: 'Verified',
    }))

    const res = await convertOnboardingCandidate({
      candidateId: selectedCandidate.value.id,
      role: conversionRole.value,
      shift: conversionShift.value,
      reportingManagerName: conversionManager.value,
      grade: conversionGrade.value,
      approvalWorkflow: conversionWorkflow.value,
      salary: conversionSalary.value,
      documents: formattedDocs,
    })

    if (res.data) {
      newlyCreatedEmployee.value = {
        id: res.data.id,
        name: `${res.data.firstName} ${res.data.lastName}`,
      }
      showFeedback(`Successfully onboarded ${selectedCandidate.value.candidateName} as Active Employee (${res.data.employeeCode}) under Manager "${conversionManager.value}" on "${conversionShift.value}"!`)
      isOnboardingConversionModalOpen.value = false
    }
  } catch (err: any) {
    showFeedback(err?.message || 'Failed to complete onboarding conversion')
  }
}

const filteredCandidates = computed(() => {
  return (candidates.value || []).filter((c) => {
    if (selectedFilter.value === 'All') return true
    return c.status === selectedFilter.value
  })
})
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
          Super Admin joining checklist, compliance document verification, role assignment, and active ID generation
        </p>
      </div>

      <div class="flex items-center gap-3">
        <!-- Super Admin Indicator -->
        <span
          v-if="isSuperAdmin"
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold"
        >
          <ShieldCheck class="w-3.5 h-3.5" />
          <span>Super Admin Onboarding Access</span>
        </span>
        <span
          v-else
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold"
        >
          <Lock class="w-3.5 h-3.5" />
          <span>View Only (Super Admin Restricted)</span>
        </span>

        <button
          @click="isModalOpen = true"
          :disabled="!isSuperAdmin"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1989d9] hover:bg-[#0e6db3] text-white font-semibold text-xs shadow-md shadow-[#1989d9]/25 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <UserPlus class="w-4 h-4" />
          <span>Add Pre-boarding Candidate</span>
        </button>
      </div>
    </div>

    <!-- Alert Banner -->
    <div
      v-if="feedbackMessage"
      class="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-medium animate-fadeIn"
    >
      <CheckCircle2 class="w-5 h-5 text-emerald-500 shrink-0" />
      <span>{{ feedbackMessage }}</span>
    </div>

    <!-- Success Link to newly created Employee profile -->
    <div
      v-if="newlyCreatedEmployee"
      class="p-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white flex items-center justify-between shadow-lg"
    >
      <div class="flex items-center gap-3">
        <UserCheck class="w-6 h-6" />
        <div>
          <p class="font-bold text-sm">Active Employee Created: {{ newlyCreatedEmployee.name }}</p>
          <p class="text-xs text-emerald-100">Profile, documents, role, and salary grade fully configured in directory.</p>
        </div>
      </div>
      <RouterLink
        :to="`/employees/${newlyCreatedEmployee.id}`"
        class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-emerald-800 font-bold text-xs shadow-xs hover:bg-emerald-50 transition-colors"
      >
        <span>Open 360° Profile</span>
        <ArrowRight class="w-4 h-4" />
      </RouterLink>
    </div>

    <!-- Candidate Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div
        v-for="cand in filteredCandidates"
        :key="cand.id"
        class="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4"
      >
        <div>
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-base font-bold text-slate-900 dark:text-white">{{ cand.candidateName }}</h3>
                <span
                  :class="[
                    'text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider',
                    cand.status === 'Completed'
                      ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                      : 'bg-[#1989d9]/10 text-[#0e6db3] dark:text-[#38a5e4]'
                  ]"
                >
                  {{ cand.status }}
                </span>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{{ cand.jobTitle }} • {{ cand.department }}</p>
            </div>

            <div class="text-right">
              <span class="text-xs font-mono font-bold text-[#1989d9]">{{ cand.progressPercentage }}%</span>
              <p class="text-[10px] text-slate-400">Orientation</p>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-3 overflow-hidden">
            <div
              class="bg-gradient-to-r from-[#044663] to-[#1989d9] h-2 rounded-full transition-all duration-300"
              :style="{ width: `${cand.progressPercentage}%` }"
            ></div>
          </div>

          <!-- Checklist Tasks -->
          <div class="mt-4 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
            <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Joining Tasks</p>
            <div
              v-for="task in cand.tasks"
              :key="task.id"
              class="flex items-center justify-between text-xs py-1"
            >
              <label class="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  :checked="task.completed"
                  :disabled="!isSuperAdmin"
                  @change="handleTaskToggle(cand.id, task.id)"
                  class="rounded border-slate-300 text-[#1989d9] focus:ring-[#1989d9] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                />
                <span :class="task.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200 font-medium'">
                  {{ task.taskName }}
                </span>
              </label>
              <span class="text-[10px] text-slate-400">{{ task.category }}</span>
            </div>
          </div>
        </div>

        <!-- Super Admin Conversion Button -->
        <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div class="text-xs text-slate-400">
            Assigned Buddy: <span class="font-semibold text-slate-700 dark:text-slate-200">{{ cand.assignedBuddy }}</span>
          </div>

          <button
            v-if="cand.status !== 'Completed'"
            @click="openConversionModal(cand)"
            :disabled="!isSuperAdmin"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <ShieldCheck class="w-3.5 h-3.5" />
            <span>Onboard as Active Employee</span>
          </button>
          <span v-else class="text-xs font-bold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 class="w-3.5 h-3.5" />
            <span>Active Employee Provisioned</span>
          </span>
        </div>
      </div>
    </div>

    <!-- Modal 1: Super Admin Complete Onboarding & Role/Grade Assignment -->
    <div
      v-if="isOnboardingConversionModalOpen && selectedCandidate"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
    >
      <div class="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-scaleUp">
        <div class="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-1">
              Super Admin Authorization
            </div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">
              Onboard Active Employee: {{ selectedCandidate.candidateName }}
            </h2>
            <p class="text-xs text-slate-500 mt-0.5">Upload compliance documents, assign system role, salary grade, and approval workflow.</p>
          </div>
          <button @click="isOnboardingConversionModalOpen = false" class="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-5 text-xs">
          <!-- 1. Document Upload Section -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
            <div class="flex items-center justify-between">
              <span class="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <FileText class="w-4 h-4 text-[#1989d9]" />
                <span>Candidate Compliance Documents</span>
              </span>
              <span class="text-[10px] text-slate-400">{{ uploadedCandidateDocs.length }} Attached</span>
            </div>

            <!-- Uploaded docs list -->
            <div class="space-y-1.5">
              <div
                v-for="(doc, idx) in uploadedCandidateDocs"
                :key="idx"
                class="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700"
              >
                <div class="flex items-center gap-2">
                  <CheckCircle2 class="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span class="font-medium text-slate-800 dark:text-slate-200">{{ doc.title }}</span>
                  <span class="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-[10px] text-slate-500">{{ doc.category }}</span>
                </div>
                <button @click="handleRemoveDoc(idx)" class="text-slate-400 hover:text-rose-500">
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <!-- Add document inputs -->
            <div class="flex gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
              <input
                v-model="newDocTitle"
                placeholder="Document title (e.g. Degree_Certificate)"
                class="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-hidden"
              />
              <select
                v-model="newDocCategory"
                class="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-hidden"
              >
                <option value="ID Proof">ID Proof</option>
                <option value="Educational">Educational</option>
                <option value="Contract">Contract</option>
                <option value="Tax">Tax Form</option>
              </select>
              <button
                type="button"
                @click="handleAddDocument"
                class="px-3 py-1.5 rounded-xl bg-[#044663] text-white text-xs font-bold hover:bg-[#065578]"
              >
                Add
              </button>
            </div>
          </div>

          <!-- 2. Role Assignment -->
          <div>
            <label class="block font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
              <ShieldCheck class="w-4 h-4 text-[#1989d9]" />
              <span>Assign System Access Role</span>
            </label>
            <select
              v-model="conversionRole"
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-hidden"
            >
              <option value="Super Admin">Super Admin (Full Organization Access)</option>
              <option value="HR Manager">HR Manager</option>
              <option value="Department Manager">Department Manager (Team Scoped View)</option>
              <option value="Payroll Specialist">Payroll Specialist</option>
              <option value="General Employee">General Employee (Self-Service ESS)</option>
              <option v-for="r in (roles || []).filter(r => !['Super Admin', 'HR Manager', 'Department Manager', 'Payroll Specialist', 'General Employee'].includes(r.roleName))" :key="r.id" :value="r.roleName">
                {{ r.roleName }} (Custom Role)
              </option>
            </select>
          </div>

          <!-- 3. Shift Timing Selection -->
          <div>
            <label class="block font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
              <Clock class="w-4 h-4 text-[#1989d9]" />
              <span>Shift Timing & Template</span>
            </label>
            <select
              v-model="conversionShift"
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-hidden"
            >
              <option v-for="sh in shifts" :key="sh.id" :value="sh.name">
                {{ sh.name }} ({{ sh.startTime }} – {{ sh.endTime }})
              </option>
            </select>
          </div>

          <!-- 4. Reporting Manager ("Under Which Manager") -->
          <div>
            <label class="block font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
              <UserCheck class="w-4 h-4 text-[#1989d9]" />
              <span>Under Which Manager (Reporting Line)</span>
            </label>
            <select
              v-model="conversionManager"
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-hidden"
            >
              <option
                v-for="mgr in (employees || [])"
                :key="mgr.id"
                :value="`${mgr.firstName} ${mgr.lastName}`"
              >
                {{ mgr.firstName }} {{ mgr.lastName }} ({{ mgr.designation }} • {{ mgr.department }})
              </option>
            </select>
          </div>

          <!-- 5. Salary Grade & Band -->
          <div>
            <label class="block font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
              <Award class="w-4 h-4 text-[#1989d9]" />
              <span>Select Salary Grade Band</span>
            </label>
            <select
              v-model="conversionGrade"
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-hidden"
            >
              <option v-for="g in grades" :key="g.id" :value="g.name">
                {{ g.name }} (Level {{ g.level }} • ${{ g.minSalary.toLocaleString() }} – ${{ g.maxSalary.toLocaleString() }})
              </option>
            </select>
          </div>

          <!-- 6. Approval Workflow -->
          <div>
            <label class="block font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
              <GitBranch class="w-4 h-4 text-[#1989d9]" />
              <span>Approval Workflow Hierarchy</span>
            </label>
            <select
              v-model="conversionWorkflow"
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-hidden"
            >
              <option v-for="wf in workflows" :key="wf.id" :value="wf.workflowName">
                {{ wf.workflowName }} ({{ wf.module }} • {{ wf.levels.length }} Levels)
              </option>
            </select>
          </div>

          <!-- 5. Base Annual Compensation -->
          <div>
            <label class="block font-bold text-slate-800 dark:text-slate-200 mb-1">
              Base Annual Salary (USD)
            </label>
            <input
              type="number"
              v-model="conversionSalary"
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold focus:outline-hidden"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            @click="isOnboardingConversionModalOpen = false"
            class="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="handleCompleteOnboarding"
            :disabled="isConverting"
            class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            {{ isConverting ? 'Provisioning...' : 'Confirm & Generate Active Employee' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal 2: Add Preboarding Candidate -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 space-y-6 animate-scaleUp">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 class="text-base font-bold text-slate-900 dark:text-white">Initiate Pre-boarding</h2>
            <p class="text-xs text-slate-500 mt-0.5">Queue a new candidate for documents & joining checklists</p>
          </div>
          <button @click="isModalOpen = false" class="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X class="w-5 h-5" />
          </button>
        </div>

        <form @submit="onPreboardSubmit" class="space-y-4">
          <FormInput name="candidateName" label="Candidate Full Name" placeholder="e.g. Jessica Taylor" required />
          <FormInput name="email" type="email" label="Personal / Pre-boarding Email" placeholder="jessica@example.com" required />
          <FormInput name="jobTitle" label="Job Title" placeholder="Senior Product Designer" required />

          <FormSelect
            name="department"
            label="Department"
            :options="(departments || []).map(d => ({ value: d.name, label: d.name }))"
            required
          />

          <div class="grid grid-cols-2 gap-3">
            <FormInput name="joiningDate" type="date" label="Anticipated Joining Date" required />
            <FormInput name="assignedBuddy" label="Onboarding Mentor" placeholder="e.g. Sarah Connor" required />
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              @click="isModalOpen = false"
              class="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isAddingCand"
              class="px-5 py-2.5 rounded-xl bg-[#1989d9] hover:bg-[#0e6db3] text-white font-bold text-xs shadow-md shadow-[#1989d9]/25 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {{ isAddingCand ? 'Submitting...' : 'Queue Candidate' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
