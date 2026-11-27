<script setup lang="ts">
import { reactive, ref } from 'vue'
import { GraduationCap, Briefcase, Plus, Trash2, Pencil } from '@lucide/vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiMutation } from '@/redux/vueAdapter'
import type { ApiError } from '@/services/apiClient'
import type { EducationRecord, Employee, EmploymentRecord } from '@/types/hrms'
import { formatDay } from '@/components/attendance/time'

// Education and previous employment (SRS 6.1). Edited inline as a list, saved together.
const props = defineProps<{ employee: Employee; canEdit: boolean }>()
const emit = defineEmits<{ saved: [message: string] }>()
const [updateEmployee, { isLoading: saving }] = useApiMutation(hrmsApi.endpoints.updateEmployee)

const editing = ref(false)
const error = ref('')
const draft = reactive<{ education: EducationRecord[]; previousEmployment: EmploymentRecord[] }>({ education: [], previousEmployment: [] })

const start = () => {
  draft.education = (props.employee.education || []).map((r) => ({ ...r }))
  draft.previousEmployment = (props.employee.previousEmployment || []).map((r) => ({ ...r }))
  if (!draft.education.length) draft.education.push({ degree: '' })
  error.value = ''
  editing.value = true
}
const save = async () => {
  const education = draft.education.filter((r) => r.degree?.trim())
  const previousEmployment = draft.previousEmployment.filter((r) => r.company?.trim())
  const bad = previousEmployment.find((r) => r.fromDate && r.toDate && r.toDate < r.fromDate)
  if (bad) return (error.value = `${bad.company}: the end date is before the start date`)
  const { error: err } = await updateEmployee({ id: props.employee.id, updates: { education, previousEmployment } })
  if (err) return (error.value = (err as ApiError).data || 'Could not save')
  editing.value = false
  emit('saved', 'Education and experience saved')
}

const input = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1989d9]/30'
const label = 'block text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1'
const period = (r: EmploymentRecord) => [r.fromDate ? formatDay(r.fromDate) : '', r.toDate ? formatDay(r.toDate) : 'present'].filter(Boolean).join(' – ')
</script>

<template>
  <div class="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-6" data-section="background">
    <div class="flex items-center justify-between">
      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Education & Previous Employment</h3>
      <button
        v-if="canEdit && !editing" type="button"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
        @click="start"
      >
        <Pencil class="w-3.5 h-3.5" /> Edit
      </button>
    </div>

    <!-- Read-only -->
    <template v-if="!editing">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="space-y-2">
          <p class="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200"><GraduationCap class="w-4 h-4 text-indigo-500" /> Education</p>
          <div v-for="(r, i) in employee.education || []" :key="i" class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs">
            <p class="font-bold text-slate-800 dark:text-slate-100">{{ r.degree }}<span v-if="r.fieldOfStudy" class="font-medium text-slate-500"> · {{ r.fieldOfStudy }}</span></p>
            <p class="text-slate-500 dark:text-slate-400 mt-0.5">{{ [r.institution, [r.startYear, r.endYear].filter(Boolean).join('–'), r.score].filter(Boolean).join(' · ') || '—' }}</p>
          </div>
          <p v-if="!employee.education?.length" class="text-xs text-slate-400">No education records</p>
        </div>
        <div class="space-y-2">
          <p class="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200"><Briefcase class="w-4 h-4 text-indigo-500" /> Previous employment</p>
          <div v-for="(r, i) in employee.previousEmployment || []" :key="i" class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs">
            <p class="font-bold text-slate-800 dark:text-slate-100">{{ r.company }}<span v-if="r.designation" class="font-medium text-slate-500"> · {{ r.designation }}</span></p>
            <p class="text-slate-500 dark:text-slate-400 mt-0.5">{{ [period(r), r.lastCtc && `Last CTC ${r.lastCtc}`].filter(Boolean).join(' · ') || '—' }}</p>
            <p v-if="r.reasonForLeaving" class="text-slate-400 mt-0.5">Left: {{ r.reasonForLeaving }}</p>
          </div>
          <p v-if="!employee.previousEmployment?.length" class="text-xs text-slate-400">No previous employment</p>
        </div>
      </div>
    </template>

    <!-- Editing -->
    <form v-else class="space-y-6" @submit.prevent="save">
      <div class="space-y-3">
        <p class="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200"><GraduationCap class="w-4 h-4 text-indigo-500" /> Education</p>
        <div v-for="(r, i) in draft.education" :key="i" class="grid grid-cols-2 md:grid-cols-6 gap-2 p-3 rounded-2xl border border-slate-200 dark:border-slate-800" data-row="education">
          <div class="col-span-2"><label :class="label">Degree / Qualification</label><input v-model="r.degree" :class="input" placeholder="e.g. B.E. Computer Science" /></div>
          <div class="col-span-2"><label :class="label">Institution</label><input v-model="r.institution" :class="input" /></div>
          <div><label :class="label">From year</label><input v-model="r.startYear" :class="input" inputmode="numeric" /></div>
          <div><label :class="label">To year</label><input v-model="r.endYear" :class="input" inputmode="numeric" /></div>
          <div class="col-span-2"><label :class="label">Field of study</label><input v-model="r.fieldOfStudy" :class="input" /></div>
          <div class="col-span-2 md:col-span-3"><label :class="label">Score / Grade</label><input v-model="r.score" :class="input" placeholder="e.g. 8.2 CGPA" /></div>
          <div class="flex items-end justify-end"><button type="button" class="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer" aria-label="Remove education" @click="draft.education.splice(i, 1)"><Trash2 class="w-4 h-4" /></button></div>
        </div>
        <button type="button" class="flex items-center gap-1.5 text-xs font-semibold text-[#1989d9] cursor-pointer" @click="draft.education.push({ degree: '' })"><Plus class="w-3.5 h-3.5" /> Add education</button>
      </div>

      <div class="space-y-3">
        <p class="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200"><Briefcase class="w-4 h-4 text-indigo-500" /> Previous employment</p>
        <div v-for="(r, i) in draft.previousEmployment" :key="i" class="grid grid-cols-2 md:grid-cols-6 gap-2 p-3 rounded-2xl border border-slate-200 dark:border-slate-800" data-row="employment">
          <div class="col-span-2"><label :class="label">Company</label><input v-model="r.company" :class="input" /></div>
          <div class="col-span-2"><label :class="label">Designation</label><input v-model="r.designation" :class="input" /></div>
          <div><label :class="label">From</label><input v-model="r.fromDate" type="date" :class="input" /></div>
          <div><label :class="label">To</label><input v-model="r.toDate" type="date" :class="input" /></div>
          <div class="col-span-2"><label :class="label">Last CTC</label><input v-model="r.lastCtc" :class="input" inputmode="numeric" /></div>
          <div class="col-span-2 md:col-span-3"><label :class="label">Reason for leaving</label><input v-model="r.reasonForLeaving" :class="input" /></div>
          <div class="flex items-end justify-end"><button type="button" class="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer" aria-label="Remove employment" @click="draft.previousEmployment.splice(i, 1)"><Trash2 class="w-4 h-4" /></button></div>
        </div>
        <button type="button" class="flex items-center gap-1.5 text-xs font-semibold text-[#1989d9] cursor-pointer" @click="draft.previousEmployment.push({ company: '' })"><Plus class="w-3.5 h-3.5" /> Add previous employer</button>
      </div>

      <p v-if="error" class="text-xs font-semibold text-rose-600">{{ error }}</p>
      <div class="flex justify-end gap-2">
        <button type="button" class="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 cursor-pointer" @click="editing = false">Cancel</button>
        <button type="submit" :disabled="saving" class="px-4 py-2 rounded-xl text-xs font-bold bg-[#1989d9] text-white disabled:opacity-50 cursor-pointer">{{ saving ? 'Saving…' : 'Save' }}</button>
      </div>
    </form>
  </div>
</template>
