<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  X, User, Briefcase, Landmark, FileText, Users, ClipboardCheck, ArrowLeft, ArrowRight, Check,
  Upload, Trash2, CheckCircle2, AlertTriangle, Pencil,
} from '@lucide/vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiMutation, useApiQuery, useAppDispatch } from '@/redux/vueAdapter'
import { usePermissions } from '@/composables/usePermissions'
import { apiRequest, type ApiError } from '@/services/apiClient'
import type { Branch, Department, Employee, Grade, Shift, ApprovalWorkflow, RolePermission } from '@/types/hrms'

const emit = defineEmits<{ close: []; created: [employee: Employee] }>()
const router = useRouter()
const dispatch = useAppDispatch()
const { isSuperAdmin } = usePermissions()

const { data: departments } = useApiQuery<Department[]>(hrmsApi.endpoints.getDepartments)
const { data: branches } = useApiQuery<Branch[]>(hrmsApi.endpoints.getBranches)
const { data: grades } = useApiQuery<Grade[]>(hrmsApi.endpoints.getGrades)
const { data: employees } = useApiQuery<Employee[]>(hrmsApi.endpoints.getEmployees)
const { data: shifts } = useApiQuery<Shift[]>(hrmsApi.endpoints.getShifts)
const { data: workflows } = useApiQuery<ApprovalWorkflow[]>(hrmsApi.endpoints.getWorkflows)
const { data: roles } = useApiQuery<RolePermission[]>(hrmsApi.endpoints.getRoles)
const [addEmployee, { isLoading: isSaving }] = useApiMutation(hrmsApi.endpoints.addEmployee)

// ---------------------------------------------------------------- form state
const today = new Date().toISOString().split('T')[0] as string
const minimumBirthDate = (() => {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 16)
  return d.toISOString().split('T')[0] as string
})()
const form = reactive({
  // personal
  firstName: '', middleName: '', lastName: '', dateOfBirth: '', gender: '', nationality: '', maritalStatus: '',
  personalEmail: '', phone: '',
  address: '', city: '', state: '', postalCode: '', country: '',
  emergencyName: '', emergencyRelation: '', emergencyPhone: '',
  // employment
  email: '', department: '', designation: '', branch: '', grade: '', employmentType: 'Full-time', status: 'Active',
  joiningDate: today, probationEndDate: '', salary: '' as string | number, shift: '', approvalWorkflow: '',
  // bank & statutory
  bankName: '', accountName: '', accountNumber: '', routingCode: '', accountType: 'Savings', panNumber: '', uanNumber: '',
  // team & access
  reportingManagerId: '', teamLeadId: '', createLogin: true, loginRole: 'General Employee',
})

interface PendingDocument { file: File; title: string; category: string }
const documents = ref<PendingDocument[]>([])
const docCategory = ref('ID Proof')
const docError = ref('')

// ---------------------------------------------------------------- options
const opt = (values: string[]) => values.map((v) => ({ value: v, label: v }))
const departmentOptions = computed(() => (departments.value || []).map((d) => ({ value: d.name, label: d.name })))
const branchOptions = computed(() => (branches.value || []).map((b) => ({ value: b.name, label: b.name })))
const gradeOptions = computed(() => (grades.value || []).map((g) => ({ value: g.name, label: g.name })))
const shiftOptions = computed(() => (shifts.value || []).map((s) => ({ value: s.name, label: `${s.name} (${s.startTime} – ${s.endTime})` })))
const workflowOptions = computed(() => (workflows.value || []).map((w) => ({ value: w.workflowName, label: w.workflowName })))
const peopleOptions = computed(() =>
  (employees.value || [])
    .filter((e) => e.status !== 'Terminated')
    .map((e) => ({ value: e.id, label: `${e.firstName} ${e.lastName} — ${e.designation}` })),
)
// Access roles come from HR Administration -> Roles & Permissions.
// 'General Employee' = self-service only (no module access).
const roleOptions = computed(() => [
  { value: 'General Employee', label: 'Employee (self-service only)' },
  ...(roles.value || []).map((r) => ({ value: r.id, label: r.roleName })),
  ...(isSuperAdmin.value ? [{ value: 'Super Admin', label: 'Super Admin (full access)' }] : []),
])
const loginRoleLabel = computed(() => roleOptions.value.find((o) => o.value === form.loginRole)?.label || form.loginRole)

// ---------------------------------------------------------------- steps
type FieldType = 'text' | 'email' | 'tel' | 'date' | 'number' | 'select'
interface Field {
  key: keyof typeof form
  label: string
  type?: FieldType
  required?: boolean
  placeholder?: string
  options?: () => { value: string; label: string }[]
  wide?: boolean
  visible?: () => boolean
  validate?: (value: string) => string | null
}

const emailRule = (v: string) => (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Enter a valid email address' : null)

const sections: { title: string; fields: Field[] }[][] = [
  [
    {
      title: 'Basic details',
      fields: [
        { key: 'firstName', label: 'First Name', required: true, placeholder: 'e.g. Bala' },
        { key: 'middleName', label: 'Middle Name' },
        { key: 'lastName', label: 'Last Name', required: true, placeholder: 'e.g. Murugan' },
        { key: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true,
          validate: (v) => (v && v > minimumBirthDate ? 'Employee must be at least 16 years old' : null) },
        { key: 'gender', label: 'Gender', type: 'select', required: true, options: () => opt(['Male', 'Female', 'Non-binary', 'Other', 'Prefer not to say']) },
        { key: 'maritalStatus', label: 'Marital Status', type: 'select', options: () => opt(['Single', 'Married', 'Divorced', 'Widowed', 'Prefer not to say']) },
        { key: 'nationality', label: 'Nationality', placeholder: 'e.g. Indian' },
        { key: 'phone', label: 'Mobile Phone', type: 'tel', required: true, placeholder: '+91 98765 43210',
          validate: (v) => (v.replace(/\D/g, '').length < 8 ? 'Enter a valid phone number' : null) },
        { key: 'personalEmail', label: 'Personal Email', type: 'email', placeholder: 'name@gmail.com', validate: emailRule },
      ],
    },
    {
      title: 'Residential address',
      fields: [
        { key: 'address', label: 'Address Line', required: true, placeholder: 'House / street / area', wide: true },
        { key: 'city', label: 'City', required: true },
        { key: 'state', label: 'State / Province' },
        { key: 'postalCode', label: 'Postal Code' },
        { key: 'country', label: 'Country', required: true, placeholder: 'e.g. India' },
      ],
    },
    {
      title: 'Emergency contact',
      fields: [
        { key: 'emergencyName', label: 'Contact Name' },
        { key: 'emergencyRelation', label: 'Relationship', placeholder: 'e.g. Spouse' },
        { key: 'emergencyPhone', label: 'Contact Phone', type: 'tel' },
      ],
    },
  ],
  [
    {
      title: 'Role & placement',
      fields: [
        { key: 'email', label: 'Work Email', type: 'email', required: true, placeholder: 'name@company.com', validate: emailRule },
        { key: 'department', label: 'Department', type: 'select', required: true, options: () => departmentOptions.value },
        { key: 'designation', label: 'Designation', required: true, placeholder: 'e.g. Software Engineer' },
        { key: 'branch', label: 'Branch / Location', type: 'select', required: true, options: () => branchOptions.value },
        { key: 'grade', label: 'Salary Grade', type: 'select', options: () => gradeOptions.value },
        { key: 'employmentType', label: 'Employment Type', type: 'select', required: true, options: () => opt(['Full-time', 'Part-time', 'Contract', 'Intern']) },
      ],
    },
    {
      title: 'Dates & compensation',
      fields: [
        { key: 'status', label: 'Status', type: 'select', required: true, options: () => opt(['Active', 'Probation']) },
        { key: 'joiningDate', label: 'Joining Date', type: 'date', required: true },
        { key: 'probationEndDate', label: 'Probation End Date', type: 'date', visible: () => form.status === 'Probation',
          validate: (v) => (v && v <= form.joiningDate ? 'Must be after the joining date' : null) },
        { key: 'salary', label: 'Annual Salary', type: 'number', required: true, placeholder: 'e.g. 600000',
          validate: (v) => (Number(v) < 1000 ? 'Enter the annual salary (at least 1,000)' : null) },
        { key: 'shift', label: 'Work Shift', type: 'select', options: () => shiftOptions.value },
        { key: 'approvalWorkflow', label: 'Approval Workflow', type: 'select', options: () => workflowOptions.value },
      ],
    },
  ],
  [
    {
      title: 'Salary account',
      fields: [
        { key: 'bankName', label: 'Bank Name', required: true, placeholder: 'e.g. HDFC Bank' },
        { key: 'accountName', label: 'Account Holder Name', required: true },
        { key: 'accountNumber', label: 'Account Number', required: true,
          validate: (v) => (!/^\d{6,20}$/.test(v.replace(/[\s-]/g, '')) ? 'Account number must be 6–20 digits' : null) },
        { key: 'routingCode', label: 'IFSC / Routing Code', required: true, placeholder: 'e.g. HDFC0001234',
          validate: (v) => (!/^[A-Za-z0-9]{4,20}$/.test(v.replace(/[\s-]/g, '')) ? 'Enter a valid IFSC or routing code' : null) },
        { key: 'accountType', label: 'Account Type', type: 'select', required: true, options: () => opt(['Savings', 'Checking', 'Current']) },
      ],
    },
    {
      title: 'Statutory (optional)',
      fields: [
        { key: 'panNumber', label: 'PAN Number', placeholder: 'ABCDE1234F',
          validate: (v) => (v && !/^[A-Za-z]{5}\d{4}[A-Za-z]$/.test(v) ? 'PAN format is ABCDE1234F' : null) },
        { key: 'uanNumber', label: 'UAN (PF) Number' },
      ],
    },
  ],
  [],
  [
    {
      title: 'Reporting line (optional)',
      fields: [
        { key: 'reportingManagerId', label: 'Reporting Manager', type: 'select', options: () => peopleOptions.value },
        { key: 'teamLeadId', label: 'Team Lead', type: 'select', options: () => peopleOptions.value },
      ],
    },
  ],
]

const steps = [
  { title: 'Personal', icon: User },
  { title: 'Employment', icon: Briefcase },
  { title: 'Bank', icon: Landmark },
  { title: 'Documents', icon: FileText, optional: true },
  { title: 'Team & Login', icon: Users, optional: true },
  { title: 'Review', icon: ClipboardCheck },
]
const step = ref(0)
const errors = reactive<Record<string, string>>({})
const submitError = ref('')

const visibleFields = (index: number) =>
  (sections[index] || []).flatMap((s) => s.fields).filter((f) => !f.visible || f.visible())

const validateStep = (index: number): boolean => {
  let ok = true
  for (const field of visibleFields(index)) {
    const value = String(form[field.key] ?? '').trim()
    const message = field.required && !value ? `${field.label} is required` : value && field.validate ? field.validate(value) : null
    if (message) {
      errors[field.key] = message
      ok = false
    } else {
      delete errors[field.key]
    }
  }
  if (index === 4 && form.createLogin && !form.email) {
    errors.email = 'A work email is needed to create a login'
    ok = false
  }
  return ok
}

const fieldByKey = Object.fromEntries(sections.flat().flatMap((s) => s.fields).map((f) => [f.key, f])) as Record<string, Field>
watch(
  () => ({ ...form }),
  (current, previous) => {
    for (const key of Object.keys(current) as (keyof typeof form)[]) {
      if (current[key] === previous[key] || !errors[key]) continue
      const field = fieldByKey[key]
      const value = String(current[key] ?? '').trim()
      const message = field?.required && !value ? `${field.label} is required` : value && field?.validate ? field.validate(value) : null
      if (message) errors[key] = message
      else delete errors[key]
    }
  },
)

const next = () => {
  if (!validateStep(step.value)) return
  step.value = Math.min(step.value + 1, steps.length - 1)
}
const back = () => (step.value = Math.max(step.value - 1, 0))
const goTo = (index: number) => {
  // Allow jumping back freely; forward only through validated steps.
  for (let i = 0; i < index; i++) {
    if (!validateStep(i)) {
      step.value = i
      return
    }
  }
  step.value = index
}

// ---------------------------------------------------------------- documents
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png']
const humanSize = (bytes: number) => (bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`)
const onFiles = (event: Event) => {
  docError.value = ''
  const input = event.target as HTMLInputElement
  for (const file of Array.from(input.files || [])) {
    if (!ALLOWED.includes(file.type)) {
      docError.value = `${file.name}: only PDF, JPG or PNG files are allowed`
      continue
    }
    if (file.size > 10 * 1048576) {
      docError.value = `${file.name}: files must be smaller than 10 MB`
      continue
    }
    documents.value.push({ file, title: file.name, category: docCategory.value })
  }
  input.value = ''
}
const removeDocument = (index: number) => documents.value.splice(index, 1)

const initialPasswordPreview = computed(() => {
  const prefix = (form.email.split('@')[0] || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4)
  if (!form.email) return 'xxxx@123'
  return prefix.length === 4 ? `${prefix}@123` : 'a random password (email name is too short)'
})
const copiedPassword = ref(false)
const copyPassword = async (value?: string) => {
  if (!value) return
  try {
    await navigator.clipboard.writeText(value)
    copiedPassword.value = true
  } catch {
    copiedPassword.value = false
  }
}

// ---------------------------------------------------------------- submit
const nameOf = (id: string) => peopleOptions.value.find((p) => p.value === id)?.label.split(' — ')[0] || '—'
const result = ref<{ employee: Employee; uploaded: number; failedUploads: string[] } | null>(null)

const submit = async () => {
  submitError.value = ''
  for (let i = 0; i < steps.length - 1; i++) {
    if (!validateStep(i)) {
      step.value = i
      return
    }
  }

  const payload = {
    firstName: form.firstName.trim(), middleName: form.middleName.trim(), lastName: form.lastName.trim(),
    dateOfBirth: form.dateOfBirth, gender: form.gender, nationality: form.nationality.trim(),
    maritalStatus: form.maritalStatus, personalEmail: form.personalEmail.trim(), phone: form.phone.trim(),
    address: form.address.trim(), city: form.city.trim(), state: form.state.trim(), postalCode: form.postalCode.trim(),
    country: form.country.trim(),
    emergencyContact: form.emergencyName ? { name: form.emergencyName, relation: form.emergencyRelation, phone: form.emergencyPhone } : undefined,
    email: form.email.trim(), department: form.department, designation: form.designation.trim(), branch: form.branch,
    grade: form.grade, employmentType: form.employmentType, status: form.status, joiningDate: form.joiningDate,
    probationEndDate: form.status === 'Probation' ? form.probationEndDate : '', salary: Number(form.salary),
    shift: form.shift, approvalWorkflow: form.approvalWorkflow,
    bankDetails: { bankName: form.bankName, accountName: form.accountName, accountNumber: form.accountNumber,
                   routingCode: form.routingCode, accountType: form.accountType },
    panNumber: form.panNumber.toUpperCase(), uanNumber: form.uanNumber,
    reportingManagerId: form.reportingManagerId, teamLeadId: form.teamLeadId,
    createLogin: form.createLogin,
    // Roles from Roles & Permissions are sent by id; the built-in options by name.
    ...(/^\d+$/.test(form.loginRole) ? { loginRoleId: form.loginRole } : { loginRole: form.loginRole }),
    employeeCode: '',
  }

  const { data, error } = await addEmployee(payload as unknown as Omit<Employee, 'id'>)
  if (error || !data) {
    submitError.value = (error as ApiError)?.data || 'The employee could not be saved'
    return
  }
  const employee = data as Employee

  // Documents are uploaded after the employee exists; failures don't undo the employee.
  let uploaded = 0
  const failedUploads: string[] = []
  {
    for (const doc of documents.value) {
      const body = new FormData()
      body.append('doc[title]', doc.title)
      body.append('doc[category]', doc.category)
      body.append('doc[fileSize]', humanSize(doc.file.size))
      body.append('file', doc.file)
      try {
        await apiRequest(`/app/employees/${employee.id}/documents`, { method: 'POST', body })
        uploaded++
      } catch (err) {
        failedUploads.push(`${doc.title}: ${(err as ApiError).data}`)
      }
    }
    if (uploaded) dispatch(hrmsApi.util.invalidateTags(['Employees']))
  }

  result.value = { employee, uploaded, failedUploads }
  emit('created', employee)
}

const viewProfile = () => {
  if (result.value) router.push(`/employees/${result.value.employee.id}`)
  emit('close')
}

const inputClass = (key: string) => [
  'block w-full rounded-lg border px-3.5 py-2.5 text-sm transition-colors focus:outline-hidden focus:ring-2',
  errors[key]
    ? 'border-rose-300 dark:border-rose-600/60 bg-rose-50/30 dark:bg-rose-950/20 focus:ring-rose-500/20'
    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-[#1989d9] focus:ring-[#1989d9]/20',
]
const displayValue = (field: Field) => {
  const raw = String(form[field.key] ?? '')
  if (!raw) return '—'
  if (field.key === 'reportingManagerId' || field.key === 'teamLeadId') return nameOf(raw)
  if (field.key === 'accountNumber') return `•••• ${raw.slice(-4)}`
  if (field.key === 'salary') return Number(raw).toLocaleString()
  return raw
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
    <div class="w-full max-w-6xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] animate-scaleUp">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 md:px-8 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 class="text-xl font-bold text-slate-900 dark:text-white">Onboard New Employee</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {{ result ? 'Employee created' : `Step ${step + 1} of ${steps.length} — ${steps[step]?.title}` }}
          </p>
        </div>
        <button class="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800" @click="emit('close')">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Stepper -->
      <div v-if="!result" class="px-6 md:px-8 pt-4">
        <ol class="flex flex-wrap items-center gap-1 pb-1">
          <li v-for="(s, i) in steps" :key="s.title" class="flex items-center gap-1 shrink-0">
            <button
              type="button"
              class="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
              :class="i === step ? 'bg-[#1989d9] text-white shadow-md shadow-[#1989d9]/25'
                : i < step ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'"
              @click="goTo(i)"
            >
              <Check v-if="i < step" class="w-3.5 h-3.5" />
              <component :is="s.icon" v-else class="w-3.5 h-3.5" />
              {{ s.title }}
              <span v-if="s.optional" class="text-[10px] font-normal opacity-75">(optional)</span>
            </button>
            <span v-if="i < steps.length - 1" class="w-4 h-px bg-slate-200 dark:bg-slate-700"></span>
          </li>
        </ol>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto px-6 md:px-8 py-5">
        <!-- Result -->
        <div v-if="result" class="text-center space-y-4 py-6">
          <CheckCircle2 class="w-12 h-12 text-emerald-600 mx-auto" />
          <div>
            <p class="text-lg font-bold text-slate-900 dark:text-white">{{ result.employee.firstName }} {{ result.employee.lastName }} has been added</p>
            <p class="text-sm text-slate-500">Employee code {{ result.employee.employeeCode }}</p>
          </div>
          <div class="max-w-md mx-auto text-left text-sm space-y-2">
            <div v-if="result.employee.account?.temporaryPassword" class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-1.5">
              <p class="text-xs text-slate-500">Login for {{ result.employee.account.email }}</p>
              <div class="flex items-center gap-2">
                <code class="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 font-mono text-base">{{ result.employee.account.temporaryPassword }}</code>
                <button class="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold" @click="copyPassword(result.employee.account?.temporaryPassword)">
                  {{ copiedPassword ? 'Copied' : 'Copy' }}
                </button>
              </div>
              <p class="text-xs text-slate-500">They must set their own password at first sign-in.</p>
            </div>
            <p v-if="result.employee.account?.linked" class="flex gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 class="w-4 h-4 shrink-0 mt-0.5" /> Linked to the existing login {{ result.employee.account.email }}.
            </p>
            <p v-if="result.employee.account?.created && result.employee.account.emailSent" class="flex gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 class="w-4 h-4 shrink-0 mt-0.5" /> Login details emailed to {{ result.employee.account.email }}.
            </p>
            <p v-else-if="result.employee.account?.created" class="flex gap-2 text-amber-700">
              <AlertTriangle class="w-4 h-4 shrink-0 mt-0.5" /> The login was created but the email could not be sent. Use “Resend login details” on the profile.
            </p>
            <p v-if="result.uploaded" class="flex gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 class="w-4 h-4 shrink-0 mt-0.5" /> {{ result.uploaded }} document(s) uploaded for verification.
            </p>
            <p v-for="failure in result.failedUploads" :key="failure" class="flex gap-2 text-rose-600">
              <AlertTriangle class="w-4 h-4 shrink-0 mt-0.5" /> {{ failure }}
            </p>
          </div>
        </div>

        <!-- Field steps -->
        <div v-else-if="step !== 3 && step !== 5" class="space-y-6">
          <section v-for="section in sections[step]" :key="section.title">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">{{ section.title }}</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <template v-for="field in section.fields" :key="field.key">
                <div v-if="!field.visible || field.visible()" class="flex flex-col gap-1.5" :class="field.wide ? 'md:col-span-3' : ''">
                  <label :for="field.key" class="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {{ field.label }} <span v-if="field.required" class="text-rose-500">*</span>
                  </label>
                  <select
                    v-if="field.type === 'select'" :id="field.key" v-model="(form[field.key] as string)" :class="inputClass(field.key)"
                  >
                    <option value="">{{ field.required ? 'Select…' : 'None' }}</option>
                    <option v-for="o in field.options?.() || []" :key="o.value" :value="o.value">{{ o.label }}</option>
                  </select>
                  <input
                    v-else :id="field.key" v-model="(form[field.key] as string)" :type="field.type || 'text'"
                    :placeholder="field.placeholder" :class="inputClass(field.key)"
                  />
                  <p v-if="errors[field.key]" class="text-xs font-medium text-rose-600 dark:text-rose-400">{{ errors[field.key] }}</p>
                </div>
              </template>
            </div>
          </section>

          <!-- Login account (Team & Login step) -->
          <section v-if="step === 4" class="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <label class="flex items-center gap-3 cursor-pointer">
              <input v-model="form.createLogin" type="checkbox" class="rounded border-slate-300 text-[#1989d9] focus:ring-[#1989d9]" />
              <span class="text-sm font-semibold text-slate-800 dark:text-slate-100">Create a login for this employee</span>
            </label>
            <p class="text-xs text-slate-500">
              Login email: <strong>{{ form.email || 'their office email' }}</strong>. First password:
              <strong class="font-mono">{{ initialPasswordPreview }}</strong> — the first 4 characters of the email + <span class="font-mono">@123</span>.
              It's emailed to them and must be changed at first sign-in; it expires in 7 days.
            </p>
            <div v-if="form.createLogin" class="max-w-xs flex flex-col gap-1.5">
              <label for="loginRole" class="text-sm font-medium text-slate-700 dark:text-slate-200">Access role</label>
              <select id="loginRole" v-model="form.loginRole" :class="inputClass('loginRole')">
                <option v-for="o in roleOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </div>
            <p v-if="errors.email && step === 4" class="text-xs font-medium text-rose-600">{{ errors.email }}</p>
          </section>
        </div>

        <!-- Documents -->
        <div v-else-if="step === 3" class="space-y-4">
          <p class="text-sm text-slate-500">Optional — attach ID proof, contracts or certificates now, or upload them later from the profile. PDF, JPG or PNG up to 10 MB.</p>
          <div class="flex flex-wrap items-end gap-3">
            <div class="flex flex-col gap-1.5">
              <label for="docCategory" class="text-sm font-medium text-slate-700 dark:text-slate-200">Category</label>
              <select id="docCategory" v-model="docCategory" :class="inputClass('docCategory')">
                <option v-for="c in ['ID Proof', 'Educational', 'Contract', 'Tax', 'Certification']" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
            <label class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1989d9] text-white text-xs font-semibold cursor-pointer hover:bg-[#0e6db3]">
              <Upload class="w-4 h-4" /> Choose files
              <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" class="hidden" @change="onFiles" />
            </label>
          </div>
          <p v-if="docError" class="text-xs font-medium text-rose-600">{{ docError }}</p>
          <ul v-if="documents.length" class="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800">
            <li v-for="(doc, i) in documents" :key="i" class="flex items-center gap-3 px-4 py-3">
              <FileText class="w-4 h-4 text-slate-400 shrink-0" />
              <input v-model="doc.title" class="flex-1 min-w-0 text-sm bg-transparent border-b border-transparent focus:border-slate-300 focus:outline-hidden" />
              <select v-model="doc.category" class="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1">
                <option v-for="c in ['ID Proof', 'Educational', 'Contract', 'Tax', 'Certification']" :key="c" :value="c">{{ c }}</option>
              </select>
              <span class="text-xs text-slate-400 w-16 text-right">{{ humanSize(doc.file.size) }}</span>
              <button class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600" @click="removeDocument(i)"><Trash2 class="w-4 h-4" /></button>
            </li>
          </ul>
          <p v-else class="text-sm text-slate-400 italic">No documents added.</p>
        </div>

        <!-- Review -->
        <div v-else class="space-y-5">
          <section v-for="(stepSections, i) in sections" :key="i" v-show="stepSections.length">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">{{ steps[i]?.title }}</h3>
              <button class="flex items-center gap-1 text-xs font-semibold text-[#0e6db3]" @click="step = i"><Pencil class="w-3.5 h-3.5" /> Edit</button>
            </div>
            <dl class="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
              <template v-for="section in stepSections" :key="section.title">
                <template v-for="field in section.fields" :key="field.key">
                  <div v-if="!field.visible || field.visible()">
                    <dt class="text-xs text-slate-400">{{ field.label }}</dt>
                    <dd class="font-semibold text-slate-800 dark:text-slate-200 truncate">{{ displayValue(field) }}</dd>
                  </div>
                </template>
              </template>
            </dl>
          </section>
          <section>
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">Documents & login</h3>
              <button class="flex items-center gap-1 text-xs font-semibold text-[#0e6db3]" @click="step = 3"><Pencil class="w-3.5 h-3.5" /> Edit</button>
            </div>
            <p class="text-sm text-slate-600 dark:text-slate-300">{{ documents.length }} document(s) to upload.</p>
            <p class="text-sm text-slate-600 dark:text-slate-300">
              {{ form.createLogin ? `Login (${loginRoleLabel}) — credentials emailed to ${form.email}` : 'No login will be created now.' }}
            </p>
          </section>
          <p v-if="submitError" class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-sm text-rose-700 dark:text-rose-300" role="alert">{{ submitError }}</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between gap-3 px-6 md:px-8 py-4 border-t border-slate-100 dark:border-slate-800">
        <template v-if="result">
          <button class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold" @click="emit('close')">Close</button>
          <button class="px-5 py-2.5 rounded-xl bg-[#1989d9] text-white text-xs font-semibold" @click="viewProfile">View profile</button>
        </template>
        <template v-else>
          <button
            class="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40"
            :disabled="step === 0" @click="back"
          >
            <ArrowLeft class="w-4 h-4" /> Back
          </button>
          <div class="flex items-center gap-2">
            <button
              v-if="steps[step]?.optional" class="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              @click="step++"
            >
              Skip
            </button>
            <button
              v-if="step < steps.length - 1"
              class="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#1989d9] hover:bg-[#0e6db3] text-white text-xs font-semibold shadow-md shadow-[#1989d9]/20"
              @click="next"
            >
              Next <ArrowRight class="w-4 h-4" />
            </button>
            <button
              v-else :disabled="isSaving"
              class="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md disabled:opacity-50"
              @click="submit"
            >
              <Check class="w-4 h-4" /> {{ isSaving ? 'Saving…' : 'Create employee' }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
