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
  Pencil,
  CreditCard,
  UserCheck,
  Award,
  DollarSign,
  ChevronRight,
  Plus,
  X,
  ExternalLink,
  Landmark,
  Eye,
  Camera,
  Trash2,
} from '@lucide/vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiQuery, useApiMutation, useAppDispatch } from '@/redux/vueAdapter'
import { apiBlob, apiRequest, type ApiError } from '@/services/apiClient'
import AddEmployeeWizard from '@/components/employees/AddEmployeeWizard.vue'
import EmployeeBackground from '@/components/employees/EmployeeBackground.vue'
import EmployeeAvatar from '@/components/common/EmployeeAvatar.vue'
import type { Employee, Department, Designation, Grade, EmployeeDocument, Payslip, CompanyInfo } from '@/types/hrms'
import { useMoney } from '@/composables/useMoney'
import { usePermissions } from '@/composables/usePermissions'
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
const { data: payslips } = useApiQuery<Payslip[]>(hrmsApi.endpoints.getPayslips)
const { data: company } = useApiQuery<CompanyInfo>(hrmsApi.endpoints.getCompany)
const { formatMoney, currencySymbol } = useMoney()

const [recordTransferPromotion, { isLoading: isPromoting }] = useApiMutation(hrmsApi.endpoints.recordTransferPromotion)
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

// Login account (temporary password emailed by the backend)
const dispatch = useAppDispatch()
// Access follows HR Administration -> Roles & Permissions.
const { can, user } = usePermissions()
const isSelf = computed(() => !!employee.value && user.value?.employeeId === employee.value.id)
const canEditBackground = computed(() => can('employees', 'edit') || isSelf.value)

// Profile photo: the employee themself or HR.
const [uploadEmployeePhoto, { isLoading: isPhotoUploading }] = useApiMutation(hrmsApi.endpoints.uploadEmployeePhoto)
const [removeEmployeePhoto] = useApiMutation(hrmsApi.endpoints.removeEmployeePhoto)
const photoInput = ref<HTMLInputElement | null>(null)
const onPhotoChosen = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !employee.value) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return showFeedback('Choose a JPG, PNG or WebP image', 'error')
  if (file.size > 2 * 1048576) return showFeedback('The photo must be smaller than 2 MB', 'error')
  const { error } = await uploadEmployeePhoto({ employeeId: employee.value.id, file })
  showFeedback(error ? (error as ApiError).data || 'Could not upload the photo' : 'Photo updated', error ? 'error' : 'success')
}
const removePhoto = async () => {
  if (!employee.value || !confirm('Remove the profile photo?')) return
  const { error } = await removeEmployeePhoto(employee.value.id)
  showFeedback(error ? (error as ApiError).data || 'Could not remove the photo' : 'Photo removed', error ? 'error' : 'success')
}
const canManageAccounts = computed(() => can('admin', 'create'))
const canEditEmployee = computed(() => can('employees', 'edit'))
// Edit details: the onboarding wizard, pre-filled with this employee.
const isEditOpen = ref(false)
const canUploadDocuments = computed(() => can('employees', 'create') || can('employees', 'edit'))
const canVerifyDocuments = computed(() => can('employees', 'approve'))
const isAccountBusy = ref(false)

const accountRequest = async (path: string, success: string) => {
  if (!employee.value) return
  isAccountBusy.value = true
  try {
    const res = await apiRequest<{ emailSent?: boolean; account?: { emailSent: boolean } }>(`/app/employees/${employee.value.id}/${path}`, {
      method: 'POST',
      body: { loginRole: 'General Employee' },
    })
    const sent = res?.emailSent ?? res?.account?.emailSent
    showFeedback(sent === false ? 'Login saved, but the email could not be sent' : success, sent === false ? 'error' : 'success')
    dispatch(hrmsApi.util.invalidateTags(['Employees']))
  } catch (err) {
    showFeedback((err as ApiError).data || 'Request failed', 'error')
  } finally {
    isAccountBusy.value = false
  }
}
const createLogin = () => accountRequest('account', 'Login created and details emailed')
const resendLogin = () => accountRequest('account/resend', 'New login details emailed')

// Promotion / Transfer Form Setup (Zod + VeeValidate)
const transferSchema = z.object({
  type: z.enum(['Promotion', 'Transfer'] as const),
  newRole: z.string().min(2, 'Role must be at least 2 characters'),
  newDepartment: z.string().min(2, 'Department is required'),
  newSalary: z.number().min(1, 'Enter the new annual salary'),
  notes: z.string().optional(),
})

type TransferFormValues = z.infer<typeof transferSchema>

const { handleSubmit: handleTransferSubmit, resetForm: resetTransferForm } = useForm<TransferFormValues>({
  validationSchema: toTypedSchema(transferSchema),
  initialValues: {
    type: 'Promotion',
    newRole: '',
    newDepartment: '',
    newSalary: 0,
    notes: '',
  },
})

// Prefill the lifecycle form from the employee's current record.
const openLifecycleModal = () => {
  resetTransferForm({
    values: {
      type: 'Promotion',
      newRole: '',
      newDepartment: employee.value?.department || '',
      newSalary: employee.value?.salary || 0,
      notes: '',
    },
  })
  isLifecycleModalOpen.value = true
}

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

// Document Upload State (real file upload to the backend)
const docTitle = ref('')
const docCategory = ref<EmployeeDocument['category']>('Contract')
const docFile = ref<File | null>(null)
const docError = ref('')
const isUploadingDoc = ref(false)
const ALLOWED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

const humanSize = (bytes: number) =>
  bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

const onDocFileChange = (event: Event) => {
  docError.value = ''
  const file = (event.target as HTMLInputElement).files?.[0] || null
  if (file && !ALLOWED_DOC_TYPES.includes(file.type)) {
    docError.value = 'Only PDF, JPG or PNG files are allowed'
    docFile.value = null
    return
  }
  if (file && file.size > 10 * 1048576) {
    docError.value = 'Files must be smaller than 10 MB'
    docFile.value = null
    return
  }
  docFile.value = file
  if (file && !docTitle.value.trim()) docTitle.value = file.name
}

const handleDocUpload = async () => {
  if (!employee.value) return
  if (!docFile.value) {
    docError.value = 'Choose a file to upload'
    return
  }
  if (!docTitle.value.trim()) {
    docError.value = 'Enter a document title'
    return
  }
  isUploadingDoc.value = true
  try {
    const body = new FormData()
    body.append('doc[title]', docTitle.value.trim())
    body.append('doc[category]', docCategory.value)
    body.append('doc[fileSize]', humanSize(docFile.value.size))
    body.append('file', docFile.value)
    await apiRequest(`/app/employees/${employee.value.id}/documents`, { method: 'POST', body })
    dispatch(hrmsApi.util.invalidateTags(['Employees']))
    showFeedback(`Document "${docTitle.value}" uploaded successfully!`)
    docTitle.value = ''
    docFile.value = null
    isDocModalOpen.value = false
  } catch (err) {
    docError.value = (err as ApiError).data || 'Failed to upload document'
  } finally {
    isUploadingDoc.value = false
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

// Opens the document in a new tab. The file is fetched with the user's token,
// so access follows the same rules as the backend (HR or the employee themself).
const viewingDocId = ref('')
const handleViewDoc = async (docId: string) => {
  if (!employee.value) return
  docError.value = ''
  viewingDocId.value = docId
  const tab = window.open('', '_blank') // opened now so the browser doesn't block it as a pop-up
  try {
    const blob = await apiBlob(`/employees/employees/${employee.value.id}/documents/${docId}/download`, { disposition: 'inline' })
    const url = URL.createObjectURL(blob)
    if (tab) tab.location.href = url
    else window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (err) {
    tab?.close()
    docError.value = (err as ApiError).data || 'Could not open the document'
    showFeedback(docError.value)
  } finally {
    viewingDocId.value = ''
  }
}

// Formatting & Helpers
const formatDate = (value?: string) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'

const addressLines = computed(() => {
  const d = employee.value?.addressDetails
  const line = d?.line || employee.value?.address
  const rest = [d?.city, [d?.state, d?.postalCode].filter(Boolean).join(' '), d?.country].filter(Boolean).join(', ')
  return [line, rest].filter(Boolean) as string[]
})

const permanentLines = computed(() => {
  const d = employee.value?.permanentAddress
  if (!d) return []
  const rest = [d.city, [d.state, d.postalCode].filter(Boolean).join(' '), d.country].filter(Boolean).join(', ')
  return [d.line, rest].filter(Boolean) as string[]
})

const emergencyContactInfo = computed(() => {
  const contact = employee.value?.emergencyContact
  if (!contact) {
    return { name: 'Not provided', relation: '—', phone: '—' }
  }
  if (typeof contact === 'string') {
    return { name: contact, relation: 'Emergency Contact', phone: '—' }
  }
  return contact
})

const tenureDisplay = computed(() => {
  if (!employee.value?.joiningDate) return '—'
  const start = new Date(employee.value.joiningDate)
  const now = new Date()
  const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  if (diffMonths < 1) return 'Just joined'
  if (diffMonths < 12) return `${diffMonths} mos`
  const years = Math.floor(diffMonths / 12)
  const remainingMonths = diffMonths % 12
  return remainingMonths > 0 ? `${years}y ${remainingMonths}m` : `${years} years`
})

const formatCurrency = (val?: number) => (val ? formatMoney(val) : '—')

// Compensation figures come from the employee's latest payslip (no client-side estimates).
const latestPayslip = computed(() => {
  const mine = (payslips.value || []).filter((p) => p.employeeId === employee.value?.id)
  return [...mine].sort((a, b) => (b.paymentDate || '').localeCompare(a.paymentDate || ''))[0]
})

const reportingManager = computed(() =>
  (employees.value || []).find((e) => e.id === employee.value?.reportingManagerId),
)

const probationLabel = computed(() => {
  const e = employee.value
  if (!e) return '—'
  if (e.status === 'Probation') return e.probationEndDate ? `In probation until ${e.probationEndDate}` : 'In probation'
  if (e.probationEndDate) return `Completed on ${e.probationEndDate}`
  return '—'
})
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
        <span>Back to Employee Onboarding</span>
      </button>

      <div class="flex flex-wrap items-center gap-2">
        <button
          v-if="canEditEmployee"
          @click="isEditOpen = true"
          class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-xs active:scale-95 transition-all"
        >
          <Pencil class="w-3.5 h-3.5" />
          <span>Edit Profile</span>
        </button>
        <button
          v-if="canEditEmployee"
          @click="openLifecycleModal"
          class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
        >
          <TrendingUp class="w-3.5 h-3.5" />
          <span>Promotion / Transfer</span>
        </button>
        <button
          v-if="canUploadDocuments"
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
            <div class="relative shrink-0 group" data-photo>
              <EmployeeAvatar
                :url="employee.avatarUrl" :name="`${employee.firstName} ${employee.lastName}`"
                size="w-20 h-20 text-2xl" rounded="rounded-2xl shadow-xl shadow-indigo-500/20"
              />
              <template v-if="canEditBackground">
                <input ref="photoInput" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="onPhotoChosen" />
                <button
                  type="button" :disabled="isPhotoUploading" :title="employee.avatarUrl ? 'Change photo' : 'Add photo'"
                  class="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 shadow cursor-pointer disabled:opacity-50"
                  @click="photoInput?.click()"
                >
                  <Camera class="w-3.5 h-3.5" />
                </button>
                <button
                  v-if="employee.avatarUrl" type="button" title="Remove photo"
                  class="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-500 shadow opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                  @click="removePhoto"
                >
                  <Trash2 class="w-3 h-3" />
                </button>
              </template>
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
                    ['Active', 'Confirmed'].includes(employee.status)
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                      : ['On Leave', 'Probation', 'Notice Period', 'Offer Released', 'Pre-Joining'].includes(employee.status)
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
                  {{ employee.branch || '—' }}
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
              <span class="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">{{ employee.grade || '—' }}</span>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="scroll-row items-center gap-1 sm:gap-2 mt-8 pt-4 border-t border-slate-100 dark:border-slate-800/80">
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
              {{ employee.reportingManagerName || 'Not assigned' }}
            </p>
            <p v-if="reportingManager?.email" class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{{ reportingManager.email }}</p>
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
              <span class="font-bold text-slate-800 dark:text-slate-200">{{ employee.branch || '—' }}</span>
            </div>
            <div class="flex justify-between py-1.5">
              <span class="text-slate-500">Probation Period</span>
              <span class="font-bold text-slate-800 dark:text-slate-200">{{ probationLabel }}</span>
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
              v-if="canEditEmployee"
          @click="openLifecycleModal"
              class="w-full text-left p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 transition-colors flex items-center justify-between"
            >
              <div>
                <p class="text-xs font-bold text-slate-900 dark:text-white">Record Promotion / Transfer</p>
                <p class="text-[11px] text-slate-500 dark:text-slate-400">Update title, department, or compensation grade</p>
              </div>
              <ChevronRight class="w-4 h-4 text-indigo-500 shrink-0" />
            </button>

            <button
              v-if="canUploadDocuments"
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
            <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">{{ formatDate(employee.dateOfBirth) }}</p>
          </div>
          <div class="space-y-1">
            <span class="text-slate-400 font-medium">Gender</span>
            <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">{{ employee.gender || '—' }}</p>
          </div>
          <div class="space-y-1">
            <span class="text-slate-400 font-medium">Nationality</span>
            <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">{{ employee.nationality || '—' }}</p>
          </div>
          <div class="space-y-1">
            <span class="text-slate-400 font-medium">Marital Status</span>
            <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">{{ employee.maritalStatus || '—' }}</p>
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
              <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">{{ employee.personalEmail || '—' }}</p>
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
            <template v-if="addressLines.length">
              <p class="font-bold text-slate-800 dark:text-slate-100 text-sm">{{ addressLines[0] }}</p>
              <p v-if="addressLines[1]">{{ addressLines[1] }}</p>
            </template>
            <p v-else class="text-slate-400">No address on file</p>
          </div>
        </div>

        <div class="pt-6 border-t border-slate-100 dark:border-slate-800">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Permanent Address</h3>
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <template v-if="permanentLines.length">
              <p class="font-bold text-slate-800 dark:text-slate-100 text-sm">{{ permanentLines[0] }}</p>
              <p v-if="permanentLines[1]">{{ permanentLines[1] }}</p>
            </template>
            <p v-else class="text-slate-400">Same as residential address</p>
          </div>
        </div>

        <EmployeeBackground :employee="employee" :can-edit="canEditBackground" @saved="(m) => showFeedback(m)" />
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
            <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">{{ employee.grade || '—' }}</p>
          </div>
          <div class="space-y-1">
            <span class="text-slate-400 font-medium">Assigned Branch / Location</span>
            <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">{{ employee.branch || '—' }}</p>
          </div>
          <div class="space-y-1">
            <span class="text-slate-400 font-medium">Employment Type</span>
            <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">{{ employee.employmentType }}</p>
          </div>
          <div class="space-y-1">
            <span class="text-slate-400 font-medium">Official Joining Date</span>
            <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">{{ employee.joiningDate }}</p>
          </div>
          <div v-if="employee.probationEndDate" class="space-y-1">
            <span class="text-slate-400 font-medium">Probation End Date</span>
            <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">{{ formatDate(employee.probationEndDate) }}</p>
          </div>
          <div v-if="employee.confirmationDate" class="space-y-1">
            <span class="text-slate-400 font-medium">Confirmation Date</span>
            <p class="font-bold text-emerald-600 text-sm">{{ formatDate(employee.confirmationDate) }}</p>
          </div>
          <div class="space-y-1">
            <span class="text-slate-400 font-medium">Notice Period</span>
            <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">{{ employee.noticePeriodDays != null ? `${employee.noticePeriodDays} days` : 'Company default' }}</p>
          </div>
          <div v-if="employee.leavingDate" class="space-y-1">
            <span class="text-slate-400 font-medium">Last Working Day</span>
            <p class="font-bold text-rose-600 text-sm">{{ formatDate(employee.leavingDate) }}</p>
          </div>
          <div class="space-y-1">
            <span class="text-slate-400 font-medium">Reporting Manager</span>
            <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">{{ employee.reportingManagerName || 'Not assigned' }}</p>
          </div>
          <div class="space-y-1">
            <span class="text-slate-400 font-medium">Shift Assignment</span>
            <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">{{ employee.shift || 'Not assigned' }}</p>
          </div>
          <div class="space-y-1">
            <span class="text-slate-400 font-medium">Team Lead</span>
            <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">{{ employee.teamLeadName || 'Not assigned' }}</p>
          </div>
          <div class="space-y-1">
            <span class="text-slate-400 font-medium">Approval Workflow</span>
            <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">{{ employee.approvalWorkflow || 'Company default' }}</p>
          </div>
          <div class="space-y-1">
            <span class="text-slate-400 font-medium">Login Access</span>
            <p class="font-bold text-sm" :class="employee.hasLogin ? (employee.loginPending ? 'text-amber-600' : 'text-emerald-600') : 'text-slate-500'">
              {{ employee.hasLogin ? (employee.loginPending ? 'Created — waiting for first sign-in' : 'Active') : 'No login' }}
            </p>
            <div v-if="canManageAccounts" class="flex gap-2 pt-1">
              <button
                v-if="!employee.hasLogin" type="button" :disabled="isAccountBusy"
                class="px-3 py-1.5 rounded-lg bg-[#1989d9] text-white text-[11px] font-semibold disabled:opacity-50"
                @click="createLogin"
              >
                Create login
              </button>
              <button
                v-else-if="employee.loginPending" type="button" :disabled="isAccountBusy"
                class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold disabled:opacity-50"
                @click="resendLogin"
              >
                Resend login details
              </button>
            </div>
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

          <p v-if="!latestPayslip" class="text-xs text-slate-400">No payslip yet — the monthly breakdown appears after the first payroll run.</p>
          <p v-else class="text-xs text-slate-400">From the {{ latestPayslip.monthYear }} payslip.</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Monthly Gross</span>
              <p class="text-base font-extrabold text-slate-900 dark:text-white mt-1">{{ formatCurrency(latestPayslip?.breakdown.grossEarnings) }}</p>
            </div>
            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Basic Pay</span>
              <p class="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{{ formatCurrency(latestPayslip?.breakdown.basic) }}</p>
            </div>
            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">HRA & Allowances</span>
              <p class="text-base font-extrabold text-purple-600 dark:text-purple-400 mt-1">
                {{ latestPayslip ? formatCurrency(latestPayslip.breakdown.hra + latestPayslip.breakdown.specialAllowance + latestPayslip.breakdown.conveyance) : '—' }}
              </p>
            </div>
            <div class="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/50">
              <span class="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">Monthly Net Pay</span>
              <p class="text-base font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">{{ formatCurrency(latestPayslip?.breakdown.netPay) }}</p>
              <p v-if="latestPayslip" class="text-[10px] text-indigo-500/80 mt-0.5">After tax & deductions</p>
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
            <span v-if="employee.bankDetails" class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
              Account on file
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div class="space-y-1">
              <span class="text-slate-400 font-medium">Bank Name</span>
              <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">
                {{ employee.bankDetails?.bankName || '—' }}
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
                {{ employee.bankDetails?.accountNumber || '—' }}
              </p>
            </div>
            <div class="space-y-1">
              <span class="text-slate-400 font-medium">IFSC / Routing Code</span>
              <p class="font-bold text-slate-800 dark:text-slate-200 text-sm font-mono">
                {{ employee.bankDetails?.routingCode || '—' }}
              </p>
            </div>
            <div class="space-y-1">
              <span class="text-slate-400 font-medium">Account Classification</span>
              <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">
                {{ employee.bankDetails?.accountType || '—' }}
              </p>
            </div>
            <div class="space-y-1">
              <span class="text-slate-400 font-medium">PAN / UAN</span>
              <p class="font-bold text-slate-800 dark:text-slate-200 text-sm font-mono">{{ employee.panNumber || '—' }} / {{ employee.uanNumber || '—' }}</p>
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
            v-if="canUploadDocuments"
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

              <button
                v-if="doc.hasFile !== false"
                @click="handleViewDoc(doc.id)"
                :disabled="viewingDocId === doc.id"
                title="View Document"
                class="flex items-center gap-1 px-2 py-1 rounded-md bg-sky-50 dark:bg-sky-950 text-[#1989d9] text-[10px] font-bold hover:bg-sky-100 dark:hover:bg-sky-900 transition-colors disabled:opacity-50"
              >
                <Eye class="w-3.5 h-3.5" />
                {{ viewingDocId === doc.id ? 'Opening…' : 'View' }}
              </button>

              <div v-if="doc.status === 'Pending' && canVerifyDocuments" class="flex items-center gap-1">
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
            v-if="canEditEmployee"
          @click="openLifecycleModal"
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
                  Joined {{ company?.name || 'the company' }}
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
            :label="`New Annual Salary${currencySymbol ? ` (${currencySymbol})` : ''}`"
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
              <option value="Educational">Educational Degree / Transcript</option>
              <option value="Tax">Tax Document</option>
              <option value="Certification">Professional Certification</option>
            </select>
          </div>

          <label class="block p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center bg-slate-50/50 dark:bg-slate-800/20 cursor-pointer hover:border-indigo-400">
            <UploadCloud class="w-8 h-8 text-indigo-500 mx-auto mb-2" />
            <p class="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {{ docFile ? `${docFile.name} (${humanSize(docFile.size)})` : 'Choose a file' }}
            </p>
            <p class="text-[10px] text-slate-400 mt-0.5">PDF, JPG or PNG up to 10 MB</p>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" class="hidden" @change="onDocFileChange" />
          </label>
          <p v-if="docError" class="text-xs font-medium text-rose-600" role="alert">{{ docError }}</p>

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
    <AddEmployeeWizard
      v-if="isEditOpen && employee" :employee="employee"
      @close="isEditOpen = false" @saved="showFeedback('Employee details updated')"
    />
  </div>
</template>
