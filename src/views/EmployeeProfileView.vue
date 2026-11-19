<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import {
  ArrowLeft,
  Building,
  Briefcase,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Shield,
  FileText,
  UploadCloud,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  CreditCard,
  UserCheck,
  Award,
  DollarSign,
  ChevronRight,
  Plus,
  X,
  ExternalLink,
  Landmark,
} from '@lucide/vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiQuery, useApiMutation } from '@/redux/vueAdapter'
import type { Employee, Department, Designation, Grade, EmployeeDocument } from '@/types/hrms'
import FormInput from '@/components/forms/FormInput.vue'
import FormSelect from '@/components/forms/FormSelect.vue'

const route = useRoute()
const router = useRouter()
const employeeId = computed(() => route.params.id as string)

// Redux API Queries & Mutations
const { data: employees } = useApiQuery<Employee[]>(hrmsApi.endpoints.getEmployees)
const { data: departments } = useApiQuery<Department[]>(hrmsApi.endpoints.getDepartments)
const { data: designations } = useApiQuery<Designation[]>(hrmsApi.endpoints.getDesignations)
const { data: grades } = useApiQuery<Grade[]>(hrmsApi.endpoints.getGrades)

const [recordTransferPromotion, { isLoading: isPromoting }] = useApiMutation(hrmsApi.endpoints.recordTransferPromotion)
const [addEmployeeDocument, { isLoading: isUploadingDoc }] = useApiMutation(hrmsApi.endpoints.addEmployeeDocument)
const [verifyEmployeeDocument] = useApiMutation(hrmsApi.endpoints.verifyEmployeeDocument)

// Current Employee
const employee = computed(() => {
  return (employees.value || []).find((e) => e.id === employeeId.value)
})

// Tab State
type ProfileTab = 'overview' | 'personal' | 'employment' | 'compensation' | 'documents' | 'lifecycle'
const activeTab = ref<ProfileTab>('overview')

// Modals & Feedback
const isLifecycleModalOpen = ref(false)
const isDocModalOpen = ref(false)
const feedbackMessage = ref('')
const feedbackType = ref<'success' | 'error'>('success')

const showFeedback = (msg: string, type: 'success' | 'error' = 'success') => {
  feedbackMessage.value = msg
  feedbackType.value = type
  setTimeout(() => {
    feedbackMessage.value = ''
  }, 3500)
}

// Promotion / Transfer Form Setup (Zod + VeeValidate)
const transferSchema = z.object({
  type: z.enum(['Promotion', 'Transfer'] as const),
  newRole: z.string().min(2, 'Role must be at least 2 characters'),
  newDepartment: z.string().min(2, 'Department is required'),
  newSalary: z.number().min(30000, 'Salary must be at least $30,000'),
  notes: z.string().optional(),
})

type TransferFormValues = z.infer<typeof transferSchema>

const { handleSubmit: handleTransferSubmit, resetForm: resetTransferForm } = useForm<TransferFormValues>({
  validationSchema: toTypedSchema(transferSchema),
  initialValues: {
    type: 'Promotion',
    newRole: '',
    newDepartment: '',
    newSalary: 100000,
    notes: '',
  },
})

const onTransferSubmit = handleTransferSubmit(async (values) => {
  if (!employee.value) return
  try {
    await recordTransferPromotion({
      employeeId: employee.value.id,
      payload: {
        type: values.type,
        newRole: values.newRole,
        newDepartment: values.newDepartment,
        newSalary: values.newSalary,
      },
    })
    showFeedback(`${values.type} recorded successfully!`)
    isLifecycleModalOpen.value = false
    resetTransferForm()
  } catch (err: any) {
    showFeedback(err?.message || 'Failed to update lifecycle event', 'error')
  }
})

// Document Upload State
const docTitle = ref('')
const docCategory = ref<EmployeeDocument['category']>('Contract')
const docFileSize = ref('1.8 MB')

const handleDocUpload = async () => {
  if (!docTitle.value.trim() || !employee.value) return
  try {
    await addEmployeeDocument({
      employeeId: employee.value.id,
      doc: {
        title: docTitle.value.trim(),
        category: docCategory.value,
        fileSize: docFileSize.value,
      },
    })
    showFeedback(`Document "${docTitle.value}" uploaded successfully!`)
    docTitle.value = ''
    isDocModalOpen.value = false
  } catch (err: any) {
    showFeedback(err?.message || 'Failed to upload document', 'error')
  }
}

const handleVerifyDoc = async (docId: string, status: 'Verified' | 'Rejected') => {
  if (!employee.value) return
  await verifyEmployeeDocument({
    employeeId: employee.value.id,
    documentId: docId,
    status,
  })
  showFeedback(`Document marked as ${status}`)
}

// Formatting & Helpers
const emergencyContactInfo = computed(() => {
  const contact = employee.value?.emergencyContact
  if (!contact) {
    return { name: 'Jane Connor (Spouse)', relation: 'Spouse / Partner', phone: '+1 (555) 345-6789' }
  }
  if (typeof contact === 'string') {
    return { name: contact, relation: 'Emergency Contact', phone: '+1 (555) 345-6789' }
  }
  return contact
})

const tenureDisplay = computed(() => {
  if (!employee.value?.joiningDate) return '1 Year'
  const start = new Date(employee.value.joiningDate)
  const now = new Date()
  const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  if (diffMonths < 1) return 'Just joined'
  if (diffMonths < 12) return `${diffMonths} mos`
  const years = Math.floor(diffMonths / 12)
  const remainingMonths = diffMonths % 12
  return remainingMonths > 0 ? `${years}y ${remainingMonths}m` : `${years} years`
})

const formatCurrency = (val?: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0)
}

const monthlyGross = computed(() => Math.round((employee.value?.salary || 0) / 12))
const monthlyBasic = computed(() => Math.round(monthlyGross.value * 0.5))
const monthlyHra = computed(() => Math.round(monthlyGross.value * 0.25))
const monthlyAllowance = computed(() => monthlyGross.value - (monthlyBasic.value + monthlyHra.value))
const estimatedTds = computed(() => Math.round(monthlyGross.value * 0.15))
const estimatedPf = computed(() => Math.round(monthlyBasic.value * 0.12))
const estimatedNetPay = computed(() => monthlyGross.value - (estimatedTds.value + estimatedPf.value))
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto">
    <!-- Back Navigation & Top Bar -->
    <div class="flex items-center justify-between gap-4">
      <button
        @click="router.push('/employees')"
        class="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
      >
        <ArrowLeft class="w-4 h-4" />
        <span>Back to Employee Directory</span>
      </button>

      <div class="flex items-center gap-2">
        <button
          @click="isLifecycleModalOpen = true"
          class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
        >
          <TrendingUp class="w-3.5 h-3.5" />
          <span>Promotion / Transfer</span>
        </button>
        <button
          @click="isDocModalOpen = true"
          class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs transition-colors"
        >
          <UploadCloud class="w-3.5 h-3.5" />
          <span>Upload Document</span>
        </button>
      </div>
    </div>

    <!-- Alert / Feedback Banner -->
    <div
      v-if="feedbackMessage"
      :class="[
        'flex items-center gap-2 p-3.5 rounded-xl border text-sm font-medium animate-fadeIn',
        feedbackType === 'success'
          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
          : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
      ]"
    >
      <CheckCircle2 v-if="feedbackType === 'success'" class="w-5 h-5 text-emerald-500 shrink-0" />
      <XCircle v-else class="w-5 h-5 text-rose-500 shrink-0" />
      <span>{{ feedbackMessage }}</span>
    </div>

    <!-- If Employee Not Found -->
    <div v-if="!employee" class="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      <Shield class="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
      <h3 class="text-base font-bold text-slate-800 dark:text-slate-200">Employee record not found</h3>
      <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
        The requested employee profile does not exist or has been archived.
      </p>
      <button
        @click="router.push('/employees')"
        class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
      >
        Return to Directory
      </button>
    </div>

    <div v-else class="space-y-6">
      <!-- 360-Degree Header Card -->
      <div class="p-6 md:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
        <div class="absolute -right-12 -bottom-12 w-64 h-64 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
          <!-- Profile Left Details -->
          <div class="flex items-start md:items-center gap-5">
            <div class="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-2xl shadow-xl shadow-indigo-500/20 shrink-0">
              {{ (employee.firstName || 'E')[0] }}{{ (employee.lastName || 'M')[0] }}
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2.5">
                <h1 class="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  {{ employee.firstName }} {{ employee.lastName }}
                </h1>
                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800">
                  {{ employee.employeeCode }}
                </span>
                <span
                  :class="[
                    'px-2.5 py-0.5 rounded-full text-[11px] font-bold',
                    employee.status === 'Active'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                      : employee.status === 'On Leave'
                      ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                      : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                  ]"
                >
                  {{ employee.status }}
                </span>
              </div>

              <p class="text-sm font-medium text-slate-700 dark:text-slate-300 mt-1 flex items-center gap-2">
                <span>{{ employee.designation }}</span>
                <span class="text-slate-300 dark:text-slate-600">•</span>
                <span class="text-indigo-600 dark:text-indigo-400 font-semibold">{{ employee.department }}</span>
              </p>

              <div class="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-2.5">
                <span class="flex items-center gap-1.5">
                  <Mail class="w-3.5 h-3.5 text-slate-400" />
                  {{ employee.email }}
                </span>
                <span class="flex items-center gap-1.5">
                  <Phone class="w-3.5 h-3.5 text-slate-400" />
                  {{ employee.phone }}
                </span>
                <span class="flex items-center gap-1.5">
                  <MapPin class="w-3.5 h-3.5 text-slate-400" />
                  {{ employee.branch || 'San Francisco HQ' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Quick Stats Pill Badges -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-center">
              <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Tenure</span>
              <span class="text-sm font-extrabold text-slate-800 dark:text-slate-100 mt-0.5 block">{{ tenureDisplay }}</span>
            </div>
            <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-center">
              <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Annual Base</span>
              <span class="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5 block">{{ formatCurrency(employee.salary) }}</span>
            </div>
            <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-center col-span-2 sm:col-span-1">
              <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Grade</span>
              <span class="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">{{ employee.grade || 'Lead P2' }}</span>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex items-center gap-1 sm:gap-2 mt-8 pt-4 border-t border-slate-100 dark:border-slate-800/80 overflow-x-auto">
          <button
            v-for="tab in [
              { key: 'overview', label: '360° Overview' },
              { key: 'personal', label: 'Personal Info' },
              { key: 'employment', label: 'Employment' },
              { key: 'compensation', label: 'Compensation & Bank' },
              { key: 'documents', label: `Documents (${employee.documents?.length || 0})` },
              { key: 'lifecycle', label: `Lifecycle & History (${employee.history?.length || 0})` },
            ]"
            :key="tab.key"
            @click="activeTab = tab.key as ProfileTab"
            :class="[
              'px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all',
              activeTab === tab.key
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
            ]"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <!-- Tab Content 1: 360° Overview -->
      <div v-if="activeTab === 'overview'" class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Reporting Hierarchy Card -->
        <div class="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Reporting Hierarchy</h3>
            <UserCheck class="w-4 h-4 text-indigo-500" />
          </div>

          <div class="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
            <span class="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">Direct Manager</span>
            <p class="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
              {{ employee.reportingManagerName || 'Sarah Connor (VP of Engineering)' }}
            </p>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">manager@agam.internal</p>
          </div>

          <div class="space-y-3 pt-2 text-xs">
            <div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span class="text-slate-500">Employment Type</span>
              <span class="font-bold text-slate-800 dark:text-slate-200">{{ employee.employmentType }}</span>
            </div>
            <div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span class="text-slate-500">Joining Date</span>
              <span class="font-bold text-slate-800 dark:text-slate-200">{{ employee.joiningDate }}</span>
            </div>
            <div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span class="text-slate-500">Work Location</span>
              <span class="font-bold text-slate-800 dark:text-slate-200">{{ employee.branch || 'San Francisco HQ' }}</span>
            </div>
            <div class="flex justify-between py-1.5">
              <span class="text-slate-500">Probation Period</span>
              <span class="font-bold text-emerald-600 dark:text-emerald-400">Completed (Permanent)</span>
            </div>
          </div>
        </div>

        <!-- Emergency & Health Contacts -->
        <div class="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Emergency Contact</h3>
            <Shield class="w-4 h-4 text-emerald-500" />
          </div>

          <div class="space-y-4 text-xs">
            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-2">
              <div class="flex items-center justify-between">
                <span class="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  {{ emergencyContactInfo.name }}
                </span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
                  Primary
                </span>
              </div>
              <p class="text-slate-500">Relationship: {{ emergencyContactInfo.relation }}</p>
              <p class="text-slate-500">Contact Number: {{ emergencyContactInfo.phone }}</p>
            </div>

            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-2">
              <div class="flex items-center justify-between">
                <span class="font-bold text-slate-800 dark:text-slate-100 text-sm">Medical & Group Health</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                  Active
                </span>
              </div>
              <p class="text-slate-500">Policy: Cigna Global Comprehensive (PPO)</p>
              <p class="text-slate-500">Policy Member ID: AGM-INS-88231</p>
            </div>
          </div>
        </div>

        <!-- Career Highlights & Quick Actions -->
        <div class="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Lifecycle Actions</h3>
            <Award class="w-4 h-4 text-purple-500" />
          </div>

          <div class="space-y-3">
            <button
              @click="isLifecycleModalOpen = true"
              class="w-full text-left p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 transition-colors flex items-center justify-between"
            >
              <div>
                <p class="text-xs font-bold text-slate-900 dark:text-white">Record Promotion / Transfer</p>
                <p class="text-[11px] text-slate-500 dark:text-slate-400">Update title, department, or compensation grade</p>
              </div>
              <ChevronRight class="w-4 h-4 text-indigo-500 shrink-0" />
            </button>

            <button
              @click="isDocModalOpen = true"
              class="w-full text-left p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 transition-colors flex items-center justify-between"
            >
              <div>
                <p class="text-xs font-bold text-slate-900 dark:text-white">Attach Formal Document</p>
                <p class="text-[11px] text-slate-500 dark:text-slate-400">Passport, employment contract, NDA, certificate</p>
              </div>
              <ChevronRight class="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            <button
              @click="activeTab = 'compensation'"
              class="w-full text-left p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 transition-colors flex items-center justify-between"
            >
              <div>
                <p class="text-xs font-bold text-slate-900 dark:text-white">Direct Deposit & Banking</p>
                <p class="text-[11px] text-slate-500 dark:text-slate-400">Check payroll account numbers and tax routing</p>
              </div>
              <ChevronRight class="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          </div>
        </div>
      </div>

      <!-- Tab Content 2: Personal Info -->
      <div v-if="activeTab === 'personal'" class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 md:p-8 space-y-6">
        <div>
          <h2 class="text-base font-bold text-slate-900 dark:text-white">Personal Information</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Demographics, contact info, and legal resident status</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div class="space-y-1">
            <span class="text-slate-400 font-medium">First Name</span>
            <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">{{ employee.firstName }}</p>
          </div>
          <div class="space-y-1">
            <span class="text-slate-400 font-medium">Last Name</span>
            <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">{{ employee.lastName }}</p>
          </div>
          <div class="space-y-1">
            <span class="text-slate-400 font-medium">Date of Birth</span>
            <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">October 14, 1991</p>
          </div>
          <div class="space-y-1">
            <span class="text-slate-400 font-medium">Gender</span>
            <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">Prefer to state</p>
          </div>
          <div class="space-y-1">
            <span class="text-slate-400 font-medium">Nationality</span>
            <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">United States</p>
          </div>
          <div class="space-y-1">
            <span class="text-slate-400 font-medium">Marital Status</span>
            <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">Married</p>
          </div>
        </div>

        <div class="pt-6 border-t border-slate-100 dark:border-slate-800">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Contact Details</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div class="space-y-1">
              <span class="text-slate-400 font-medium">Work Email</span>
              <p class="font-bold text-indigo-600 dark:text-indigo-400 text-sm">{{ employee.email }}</p>
            </div>
            <div class="space-y-1">
              <span class="text-slate-400 font-medium">Personal Email</span>
              <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">{{ (employee.firstName || 'user').toLowerCase() }}.personal@gmail.com</p>
            </div>
            <div class="space-y-1">
              <span class="text-slate-400 font-medium">Mobile Phone</span>
              <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">{{ employee.phone }}</p>
            </div>
          </div>
        </div>

        <div class="pt-6 border-t border-slate-100 dark:border-slate-800">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Residential Address</h3>
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <p class="font-bold text-slate-800 dark:text-slate-100 text-sm">742 Evergreen Terrace</p>
            <p>San Francisco, CA 94107, United States</p>
            <p class="text-[11px] text-slate-400">Proof of residence verified via Utility Bill on file</p>
          </div>
        </div>
      </div>

      <!-- Tab Content 3: Employment Details -->
      <div v-if="activeTab === 'employment'" class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 md:p-8 space-y-6">
        <div>
          <h2 class="text-base font-bold text-slate-900 dark:text-white">Employment & Organizational Assignment</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Corporate affiliation, job grade, and reporting structures</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div class="space-y-1">
            <span class="text-slate-400 font-medium">Employee Code</span>
            <p class="font-bold text-indigo-600 dark:text-indigo-400 text-sm">{{ employee.employeeCode }}</p>
          </div>
          <div class="space-y-1">
            <span class="text-slate-400 font-medium">Department</span>
            <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">{{ employee.department }}</p>
          </div>
          <div class="space-y-1">
            <span class="text-slate-400 font-medium">Designation</span>
            <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">{{ employee.designation }}</p>
          </div>
          <div class="space-y-1">
            <span class="text-slate-400 font-medium">Salary Grade Band</span>
            <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">{{ employee.grade || 'Professional / Lead (P1-P3)' }}</p>
          </div>
          <div class="space-y-1">
            <span class="text-slate-400 font-medium">Assigned Branch / Location</span>
            <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">{{ employee.branch || 'San Francisco HQ' }}</p>
          </div>
          <div class="space-y-1">
            <span class="text-slate-400 font-medium">Employment Type</span>
            <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">{{ employee.employmentType }}</p>
          </div>
          <div class="space-y-1">
            <span class="text-slate-400 font-medium">Official Joining Date</span>
            <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">{{ employee.joiningDate }}</p>
          </div>
          <div class="space-y-1">
            <span class="text-slate-400 font-medium">Reporting Manager</span>
            <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">{{ employee.reportingManagerName || 'Sarah Connor' }}</p>
          </div>
          <div class="space-y-1">
            <span class="text-slate-400 font-medium">Shift Assignment</span>
            <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">General Day Shift (09:00 AM - 06:00 PM)</p>
          </div>
        </div>
      </div>

      <!-- Tab Content 4: Compensation & Bank Details -->
      <div v-if="activeTab === 'compensation'" class="space-y-6">
        <!-- Salary Breakdown Card -->
        <div class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 md:p-8 space-y-6">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-base font-bold text-slate-900 dark:text-white">Annual Compensation & Structure</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Breakdown of base earnings and standard payroll withholdings</p>
            </div>
            <div class="text-right">
              <span class="text-xs text-slate-400 block">Total Annual CTC</span>
              <span class="text-xl font-black text-indigo-600 dark:text-indigo-400">{{ formatCurrency(employee.salary) }}</span>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Monthly Gross</span>
              <p class="text-base font-extrabold text-slate-900 dark:text-white mt-1">{{ formatCurrency(monthlyGross) }}</p>
              <p class="text-[10px] text-slate-400 mt-0.5">Calculated as Base / 12</p>
            </div>
            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Basic Pay (50%)</span>
              <p class="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{{ formatCurrency(monthlyBasic) }}</p>
              <p class="text-[10px] text-slate-400 mt-0.5">Statutory base rate</p>
            </div>
            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">HRA & Allowances</span>
              <p class="text-base font-extrabold text-purple-600 dark:text-purple-400 mt-1">{{ formatCurrency(monthlyHra + monthlyAllowance) }}</p>
              <p class="text-[10px] text-slate-400 mt-0.5">Housing + Special stipend</p>
            </div>
            <div class="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/50">
              <span class="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">Estimated Monthly Net</span>
              <p class="text-base font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">{{ formatCurrency(estimatedNetPay) }}</p>
              <p class="text-[10px] text-indigo-500/80 mt-0.5">After tax & deductions</p>
            </div>
          </div>
        </div>

        <!-- Bank & Direct Deposit Card -->
        <div class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 md:p-8 space-y-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
                <Landmark class="w-6 h-6" />
              </div>
              <div>
                <h2 class="text-base font-bold text-slate-900 dark:text-white">Bank Account & Direct Deposit</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Configured payroll account for automated direct deposit</p>
              </div>
            </div>
            <span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
              Active Deposit Account
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div class="space-y-1">
              <span class="text-slate-400 font-medium">Bank Name</span>
              <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">
                {{ employee.bankDetails?.bankName || 'JPMorgan Chase & Co.' }}
              </p>
            </div>
            <div class="space-y-1">
              <span class="text-slate-400 font-medium">Account Holder</span>
              <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">
                {{ employee.bankDetails?.accountName || `${employee.firstName} ${employee.lastName}` }}
              </p>
            </div>
            <div class="space-y-1">
              <span class="text-slate-400 font-medium">Account Number</span>
              <p class="font-bold text-slate-800 dark:text-slate-200 text-sm font-mono">
                {{ employee.bankDetails?.accountNumber || '•••••••• 4892' }}
              </p>
            </div>
            <div class="space-y-1">
              <span class="text-slate-400 font-medium">Routing Number (ACH / SWIFT)</span>
              <p class="font-bold text-slate-800 dark:text-slate-200 text-sm font-mono">
                {{ employee.bankDetails?.routingCode || '021000021' }}
              </p>
            </div>
            <div class="space-y-1">
              <span class="text-slate-400 font-medium">Account Classification</span>
              <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">
                {{ employee.bankDetails?.accountType || 'Checking (Direct Deposit)' }}
              </p>
            </div>
            <div class="space-y-1">
              <span class="text-slate-400 font-medium">Verification Method</span>
              <p class="font-bold text-emerald-600 dark:text-emerald-400 text-sm">Automated Micro-Deposit Verified</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab Content 5: Documents Repository -->
      <div v-if="activeTab === 'documents'" class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 md:p-8 space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-base font-bold text-slate-900 dark:text-white">Employee Document Vault</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Legal, contractual, and identity compliance files</p>
          </div>
          <button
            @click="isDocModalOpen = true"
            class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all self-start"
          >
            <Plus class="w-4 h-4" />
            <span>Upload New Document</span>
          </button>
        </div>

        <div v-if="!employee.documents || employee.documents.length === 0" class="p-12 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700">
          <FileText class="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p class="text-xs font-semibold text-slate-700 dark:text-slate-300">No documents uploaded yet</p>
          <p class="text-[11px] text-slate-400 mt-0.5">Upload verified identification or contracts for this employee.</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="doc in employee.documents"
            :key="doc.id"
            class="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex items-center justify-between gap-4"
          >
            <div class="flex items-center gap-3.5 min-w-0">
              <div class="p-2.5 rounded-xl bg-indigo-100/60 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                <FileText class="w-5 h-5" />
              </div>
              <div class="min-w-0">
                <p class="font-bold text-slate-800 dark:text-slate-100 text-xs truncate">{{ doc.title }}</p>
                <div class="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                  <span class="px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-700 font-medium text-slate-600 dark:text-slate-300">{{ doc.category }}</span>
                  <span>{{ doc.fileSize }}</span>
                  <span>•</span>
                  <span>{{ doc.uploadDate }}</span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <span
                :class="[
                  'px-2 py-0.5 rounded-md text-[10px] font-bold',
                  doc.status === 'Verified'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                    : doc.status === 'Pending'
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                ]"
              >
                {{ doc.status }}
              </span>

              <div v-if="doc.status === 'Pending'" class="flex items-center gap-1">
                <button
                  @click="handleVerifyDoc(doc.id, 'Verified')"
                  title="Verify Document"
                  class="p-1 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-600 hover:bg-emerald-200 transition-colors"
                >
                  <CheckCircle2 class="w-3.5 h-3.5" />
                </button>
                <button
                  @click="handleVerifyDoc(doc.id, 'Rejected')"
                  title="Reject Document"
                  class="p-1 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-600 hover:bg-rose-200 transition-colors"
                >
                  <XCircle class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab Content 6: Lifecycle & History Timeline -->
      <div v-if="activeTab === 'lifecycle'" class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 md:p-8 space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-base font-bold text-slate-900 dark:text-white">Career Lifecycle Timeline</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Chronological record of promotions, transfers, and designations</p>
          </div>
          <button
            @click="isLifecycleModalOpen = true"
            class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all self-start"
          >
            <Plus class="w-4 h-4" />
            <span>Initiate Promotion / Transfer</span>
          </button>
        </div>

        <div class="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          <!-- Current Role Indicator -->
          <div class="relative">
            <div class="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-indigo-600 border-4 border-white dark:border-slate-900 shadow-xs"></div>
            <div class="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 space-y-1">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-indigo-600 dark:text-indigo-400">Current Position</span>
                <span class="text-[10px] text-slate-400">Present</span>
              </div>
              <p class="text-sm font-extrabold text-slate-900 dark:text-white">{{ employee.designation }}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400">{{ employee.department }} • {{ formatCurrency(employee.salary) }}/yr</p>
            </div>
          </div>

          <!-- History Events -->
          <div
            v-for="event in employee.history || []"
            :key="event.id"
            class="relative"
          >
            <div class="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-700 border-4 border-white dark:border-slate-900"></div>
            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
              <div class="flex items-center justify-between">
                <span
                  :class="[
                    'text-[10px] font-bold px-2 py-0.5 rounded',
                    event.type === 'Promotion'
                      ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400'
                      : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                  ]"
                >
                  {{ event.type }}
                </span>
                <span class="text-[10px] text-slate-400">{{ event.effectiveDate }}</span>
              </div>
              <p class="text-sm font-bold text-slate-800 dark:text-slate-100">
                {{ event.previousRole }} &rarr; {{ event.newRole }}
              </p>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Department: {{ event.previousDepartment }} &rarr; {{ event.newDepartment }}
              </p>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Compensation: {{ formatCurrency(event.previousSalary) }} &rarr; {{ formatCurrency(event.newSalary) }}
              </p>
              <p class="text-[10px] text-slate-400 mt-1 italic">Approved by {{ event.approvedBy }}</p>
            </div>
          </div>

          <!-- Initial Joining Date Milestone -->
          <div class="relative">
            <div class="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white dark:border-slate-900"></div>
            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  Joined Agam Technologies
                </span>
                <span class="text-[10px] text-slate-400">{{ employee.joiningDate }}</span>
              </div>
              <p class="text-xs text-slate-600 dark:text-slate-300">
                Initial employment contract executed as {{ employee.designation }} in {{ employee.department }}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal 1: Initiate Promotion / Transfer Dialog -->
    <div
      v-if="isLifecycleModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 animate-scaleUp">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">Record Promotion or Transfer</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Updates employee profile and appends to the immutable lifecycle audit log.
            </p>
          </div>
          <button
            @click="isLifecycleModalOpen = false"
            class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <form @submit="onTransferSubmit" class="space-y-4 mt-6">
          <FormSelect
            name="type"
            label="Event Type"
            :options="[
              { value: 'Promotion', label: 'Promotion (Title / Grade / Salary)' },
              { value: 'Transfer', label: 'Departmental / Lateral Transfer' },
            ]"
            required
          />

          <FormInput
            name="newRole"
            label="New Designation / Role"
            :placeholder="employee?.designation || 'e.g. Lead Engineer'"
            required
          />

          <FormSelect
            name="newDepartment"
            label="New Department"
            :options="departments ? departments.map(d => ({ value: d.name, label: d.name })) : []"
            required
          />

          <FormInput
            name="newSalary"
            type="number"
            label="New Annual Salary (USD)"
            placeholder="125000"
            required
          />

          <FormInput
            name="notes"
            label="Approval Justification / Notes"
            placeholder="e.g. Annual appraisal cycle performance rating exceed expectations"
          />

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              @click="isLifecycleModalOpen = false"
              class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isPromoting"
              class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all"
            >
              {{ isPromoting ? 'Recording...' : 'Commit Event' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal 2: Upload Document Dialog -->
    <div
      v-if="isDocModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 animate-scaleUp">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">Upload Compliance Document</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Attach identity or contract file</p>
          </div>
          <button
            @click="isDocModalOpen = false"
            class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <form @submit.prevent="handleDocUpload" class="space-y-4 mt-6">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Document Title</label>
            <input
              v-model="docTitle"
              type="text"
              placeholder="e.g. Passport_Scan_2026.pdf"
              required
              class="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Category</label>
            <select
              v-model="docCategory"
              class="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 dark:text-slate-200"
            >
              <option value="Contract">Employment Contract / Offer</option>
              <option value="ID Proof">Government ID / Passport</option>
              <option value="Degree">Educational Degree / Transcript</option>
              <option value="Tax Form">W-4 / Tax Exemption Form</option>
              <option value="Certification">Professional Certification</option>
              <option value="Other">Other Document</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Simulated File Size</label>
            <input
              v-model="docFileSize"
              type="text"
              placeholder="e.g. 2.4 MB"
              class="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div class="p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center bg-slate-50/50 dark:bg-slate-800/20">
            <UploadCloud class="w-8 h-8 text-indigo-500 mx-auto mb-2" />
            <p class="text-xs font-semibold text-slate-700 dark:text-slate-300">File Selected for Encryption</p>
            <p class="text-[10px] text-slate-400 mt-0.5">Encrypted at rest using AES-256 vault standard</p>
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              @click="isDocModalOpen = false"
              class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isUploadingDoc"
              class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all"
            >
              {{ isUploadingDoc ? 'Uploading...' : 'Save Document' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
