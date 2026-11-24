<script setup lang="ts">
import { ref, computed } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import {
  Building2,
  Briefcase,
  Users,
  DollarSign,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  X,
  Layers,
  Award,
  ChevronRight,
  ShieldCheck,
} from '@lucide/vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiQuery, useApiMutation } from '@/redux/vueAdapter'
import type { Department, Designation, Grade } from '@/types/hrms'
import FormInput from '@/components/forms/FormInput.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import { useMoney } from '@/composables/useMoney'

// Redux API Queries & Mutations
const { data: departments, isLoading: isDeptLoading } = useApiQuery<Department[]>(hrmsApi.endpoints.getDepartments)
const { data: designations, isLoading: isDesigLoading } = useApiQuery<Designation[]>(hrmsApi.endpoints.getDesignations)
const { data: grades } = useApiQuery<Grade[]>(hrmsApi.endpoints.getGrades)

const [addDepartment, { isLoading: isAddingDept }] = useApiMutation(hrmsApi.endpoints.addDepartment)
const [addDesignation, { isLoading: isAddingDesig }] = useApiMutation(hrmsApi.endpoints.addDesignation)

// Active Tab & Search
type ViewTab = 'departments' | 'designations'
const activeTab = ref<ViewTab>('departments')
const desigSearch = ref('')
const desigDeptFilter = ref('All')

// Modals & Feedback
const isDeptModalOpen = ref(false)
const isDesigModalOpen = ref(false)
const feedbackMessage = ref('')

const { formatMoney, currencySymbol } = useMoney()

const showFeedback = (msg: string) => {
  feedbackMessage.value = msg
  setTimeout(() => {
    feedbackMessage.value = ''
  }, 3500)
}

// 1. Department Form Schema (VeeValidate + Zod)
const departmentSchema = z.object({
  name: z.string().min(2, 'Department name must be at least 2 characters'),
  code: z.string().min(2, 'Code must be at least 2 characters').max(6, 'Code max 6 characters').toUpperCase(),
  head: z.string().min(2, 'Head of Department is required'),
  budget: z.coerce.number().min(0, 'Budget cannot be negative'),
})

type DepartmentFormValues = z.infer<typeof departmentSchema>

const { handleSubmit: handleDeptSubmit, resetForm: resetDeptForm } = useForm<DepartmentFormValues>({
  validationSchema: toTypedSchema(departmentSchema),
  initialValues: {
    name: '',
    code: '',
    head: '',
    budget: 0,
  },
})

const onDeptSubmit = handleDeptSubmit(async (values) => {
  await addDepartment(values)
  showFeedback(`Department "${values.name}" created successfully!`)
  resetDeptForm()
  isDeptModalOpen.value = false
})

// 2. Designation Form Schema (VeeValidate + Zod)
const designationSchema = z.object({
  title: z.string().min(2, 'Designation title must be at least 2 characters'),
  code: z.string().min(2, 'Designation code is required').toUpperCase(),
  departmentName: z.string().min(1, 'Please select a department'),
  grade: z.string().optional(),
  description: z.string().optional(),
})

type DesignationFormValues = z.infer<typeof designationSchema>

const { handleSubmit: handleDesigSubmit, resetForm: resetDesigForm } = useForm<DesignationFormValues>({
  validationSchema: toTypedSchema(designationSchema),
  initialValues: {
    title: '',
    code: '',
    departmentName: '',
    grade: '',
    description: '',
  },
})

const onDesigSubmit = handleDesigSubmit(async (values) => {
  const matchedDept = (departments.value || []).find((d) => d.name === values.departmentName)
  if (!matchedDept) {
    showFeedback(`Department "${values.departmentName}" was not found. Create it first.`)
    return
  }
  await addDesignation({
    title: values.title,
    code: values.code,
    departmentId: matchedDept.id,
    departmentName: values.departmentName,
    grade: values.grade || '',
    description: values.description || '',
  })
  showFeedback(`Designation "${values.title}" registered successfully!`)
  resetDesigForm()
  isDesigModalOpen.value = false
})

// Filtered Designations
const filteredDesignations = computed(() => {
  return (designations.value || []).filter((d) => {
    const matchesSearch =
      desigSearch.value === '' ||
      d.title.toLowerCase().includes(desigSearch.value.toLowerCase()) ||
      d.code.toLowerCase().includes(desigSearch.value.toLowerCase()) ||
      (d.description || '').toLowerCase().includes(desigSearch.value.toLowerCase())

    const matchesDept =
      desigDeptFilter.value === 'All' || d.departmentName === desigDeptFilter.value

    return matchesSearch && matchesDept
  })
})

// Summary Metrics
const totalHeadcount = computed(() => {
  return (departments.value || []).reduce((acc, d) => acc + (d.totalEmployees || 0), 0)
})

const totalBudget = computed(() => {
  return (departments.value || []).reduce((acc, d) => acc + (d.budget || 0), 0)
})
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Departments & Designations
        </h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Define organizational structures, divisional cost centers, and job role specifications
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-if="activeTab === 'departments'"
          @click="isDeptModalOpen = true"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
        >
          <Plus class="w-4 h-4" />
          <span>Add Department</span>
        </button>
        <button
          v-else
          @click="isDesigModalOpen = true"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
        >
          <Plus class="w-4 h-4" />
          <span>Add Designation</span>
        </button>
      </div>
    </div>

    <!-- Feedback Notification -->
    <div
      v-if="feedbackMessage"
      class="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-medium animate-fadeIn"
    >
      <CheckCircle2 class="w-5 h-5 text-emerald-500 shrink-0" />
      <span>{{ feedbackMessage }}</span>
    </div>

    <!-- Summary Metric Badges -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-xs font-semibold">Departments</span>
          <Building2 class="w-4 h-4 text-indigo-500" />
        </div>
        <p class="text-2xl font-black text-slate-900 dark:text-white mt-1">{{ departments?.length || 0 }}</p>
      </div>
      <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-xs font-semibold">Job Designations</span>
          <Briefcase class="w-4 h-4 text-purple-500" />
        </div>
        <p class="text-2xl font-black text-slate-900 dark:text-white mt-1">{{ designations?.length || 0 }}</p>
      </div>
      <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-xs font-semibold">Total Staff</span>
          <Users class="w-4 h-4 text-blue-500" />
        </div>
        <p class="text-2xl font-black text-slate-900 dark:text-white mt-1">{{ totalHeadcount }}</p>
      </div>
      <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-xs font-semibold">Combined Budget</span>
          <DollarSign class="w-4 h-4 text-emerald-500" />
        </div>
        <p class="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
          {{ formatMoney(totalBudget, { notation: 'compact' }) }}
        </p>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
      <button
        @click="activeTab = 'departments'"
        :class="[
          'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2',
          activeTab === 'departments'
            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
        ]"
      >
        <Building2 class="w-4 h-4" />
        <span>Departments ({{ departments?.length || 0 }})</span>
      </button>

      <button
        @click="activeTab = 'designations'"
        :class="[
          'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2',
          activeTab === 'designations'
            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
        ]"
      >
        <Briefcase class="w-4 h-4" />
        <span>Job Designations ({{ designations?.length || 0 }})</span>
      </button>
    </div>

    <!-- TAB 1: DEPARTMENTS -->
    <div v-if="activeTab === 'departments'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="dept in departments"
        :key="dept.id"
        class="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-200 group"
      >
        <div>
          <div class="flex items-center justify-between">
            <span class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
              {{ dept.code }}
            </span>
          </div>

          <h3 class="text-base font-bold text-slate-900 dark:text-white mt-4 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {{ dept.name }}
          </h3>

          <div class="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <div class="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
              <span class="text-slate-400">Head of Department:</span>
              <span class="font-semibold text-slate-800 dark:text-slate-200">{{ dept.head }}</span>
            </div>
            <div class="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
              <span class="text-slate-400">Assigned Headcount:</span>
              <span class="font-semibold text-slate-800 dark:text-slate-200">{{ dept.totalEmployees }} Members</span>
            </div>
            <div class="flex items-center justify-between py-1">
              <span class="text-slate-400">Annual Budget:</span>
              <span class="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {{ dept.budget ? formatMoney(dept.budget) : '—' }}
              </span>
            </div>
          </div>
        </div>

        <div class="pt-4 border-t border-slate-100 dark:border-slate-800 mt-6 flex items-center justify-between">
          <RouterLink
            :to="`/employees`"
            class="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <span>View Department Employees</span>
            <ChevronRight class="w-3.5 h-3.5" />
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- TAB 2: DESIGNATIONS -->
    <div v-if="activeTab === 'designations'" class="space-y-4">
      <!-- Search & Department Filter Toolbar -->
      <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div class="relative w-full md:w-80">
          <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            v-model="desigSearch"
            type="text"
            placeholder="Search designations by title or code..."
            class="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 dark:text-slate-200"
          />
        </div>

        <select
          v-model="desigDeptFilter"
          class="w-full md:w-auto px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-hidden"
        >
          <option value="All">All Departments</option>
          <option v-for="d in departments" :key="d.id" :value="d.name">
            {{ d.name }}
          </option>
        </select>
      </div>

      <!-- Designations Table -->
      <div class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th class="py-3.5 px-6">Designation Title</th>
                <th class="py-3.5 px-6">Code</th>
                <th class="py-3.5 px-6">Department</th>
                <th class="py-3.5 px-6">Salary Grade Band</th>
                <th class="py-3.5 px-6">Role Specification</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
              <tr v-if="filteredDesignations.length === 0">
                <td colspan="5" class="py-12 text-center text-slate-400 text-xs">
                  No designations found matching the filters.
                </td>
              </tr>
              <tr
                v-for="desig in filteredDesignations"
                :key="desig.id"
                class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
              >
                <td class="py-4 px-6">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                      {{ desig.title[0] }}
                    </div>
                    <div>
                      <p class="font-bold text-slate-900 dark:text-white text-xs">{{ desig.title }}</p>
                    </div>
                  </div>
                </td>
                <td class="py-4 px-6 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  {{ desig.code }}
                </td>
                <td class="py-4 px-6 text-xs font-medium text-slate-700 dark:text-slate-300">
                  {{ desig.departmentName }}
                </td>
                <td class="py-4 px-6 text-xs">
                  <span class="px-2.5 py-1 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 font-semibold text-[11px]">
                    {{ desig.grade }}
                  </span>
                </td>
                <td class="py-4 px-6 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate">
                  {{ desig.description || '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal 1: Add Department Dialog -->
    <div
      v-if="isDeptModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 animate-scaleUp">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">Add Department Unit</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Establish a new operational divisional cost center</p>
          </div>
          <button
            @click="isDeptModalOpen = false"
            class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <form @submit="onDeptSubmit" class="space-y-4 mt-6">
          <FormInput name="name" label="Department Name" placeholder="e.g. Information Security" required />
          <FormInput name="code" label="Department Code" placeholder="e.g. SEC" required />
          <FormInput name="head" label="Head of Department" placeholder="e.g. Marcus Vance" required />
          <FormInput name="budget" type="number" :label="`Annual Operational Budget${currencySymbol ? ` (${currencySymbol})` : ''}`" placeholder="0" required />

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              @click="isDeptModalOpen = false"
              class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isAddingDept"
              class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all"
            >
              {{ isAddingDept ? 'Saving...' : 'Create Department' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal 2: Add Designation Dialog -->
    <div
      v-if="isDesigModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 animate-scaleUp">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">Create Job Designation</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Map title to department unit and compensation grade</p>
          </div>
          <button
            @click="isDesigModalOpen = false"
            class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <form @submit="onDesigSubmit" class="space-y-4 mt-6">
          <FormInput name="title" label="Designation Title" placeholder="e.g. Senior Security Analyst" required />
          <FormInput name="code" label="Designation Code" placeholder="e.g. SR-SEC" required />
          <FormSelect
            name="departmentName"
            label="Department"
            :options="departments ? departments.map(d => ({ value: d.name, label: d.name })) : []"
            required
          />
          <FormSelect
            name="grade"
            label="Salary Grade"
            :options="grades ? grades.map(g => ({ value: g.name, label: g.name })) : []"
          />
          <FormInput name="description" label="Brief Responsibilities" placeholder="Key responsibilities and domain expectations" />

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              @click="isDesigModalOpen = false"
              class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isAddingDesig"
              class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all"
            >
              {{ isAddingDesig ? 'Saving...' : 'Register Designation' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
