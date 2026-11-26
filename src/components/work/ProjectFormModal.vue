<script setup lang="ts">
import { computed, ref } from 'vue'
import { Plus, Trash2, X } from '@lucide/vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiMutation, useApiQuery } from '@/redux/vueAdapter'
import type { ApiError } from '@/services/apiClient'
import type { Employee, Project, ProjectStatus } from '@/types/hrms'

// Create a project (with its first members) or edit its details.
const props = defineProps<{ project?: Project | null }>()
const emit = defineEmits<{ close: []; saved: [project: Project] }>()

const { data: employees } = useApiQuery<Employee[]>(hrmsApi.endpoints.getEmployees)
const [saveProject, { isLoading: saving }] = useApiMutation(hrmsApi.endpoints.saveProject)

const editing = !!props.project
const form = ref({
  name: props.project?.name || '',
  clientName: props.project?.clientName || '',
  description: props.project?.description || '',
  status: (props.project?.status || 'Active') as ProjectStatus,
  startDate: props.project?.startDate || '',
  endDate: props.project?.endDate || '',
  managerId: props.project?.managerId || '',
})
const members = ref<{ employeeId: string; role: string }[]>([])
const error = ref('')

const people = computed(() =>
  (employees.value || []).filter((e) => e.status !== 'Terminated').map((e) => ({ id: e.id, name: `${e.firstName} ${e.lastName}`, designation: e.designation })),
)
const addRow = () => members.value.push({ employeeId: '', role: '' })

const save = async () => {
  error.value = ''
  const f = form.value
  if (f.name.trim().length < 2) return (error.value = 'Enter the project name')
  if (f.startDate && f.endDate && f.endDate < f.startDate) return (error.value = 'The end date must be on or after the start date')
  const chosen = members.value.filter((m) => m.employeeId)
  if (new Set(chosen.map((m) => m.employeeId)).size !== chosen.length) return (error.value = 'Each member can be added once')
  const { data, error: err } = await saveProject({
    id: props.project?.id,
    name: f.name.trim(), clientName: f.clientName.trim(), description: f.description.trim(), status: f.status,
    startDate: f.startDate || '', endDate: f.endDate || '', managerId: f.managerId || '',
    ...(editing ? {} : { members: chosen.map((m) => ({ employeeId: m.employeeId, role: m.role.trim() })) }),
  })
  if (err) return (error.value = (err as ApiError).data || 'Could not save the project')
  emit('saved', data as Project)
  emit('close')
}

const inputCls =
  'mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-hidden focus:border-[#1989d9]'
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs sm:p-4" @click.self="emit('close')">
    <form class="w-full sm:max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-6 space-y-4 max-h-[92vh] overflow-y-auto" @submit.prevent="save">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ editing ? 'Edit project' : 'New project' }}</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">The manager and members can see the project and work on its tasks.</p>
        </div>
        <button type="button" class="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" @click="emit('close')">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 sm:col-span-2">
          Project name
          <input v-model="form.name" type="text" maxlength="150" :class="inputCls" placeholder="e.g. Payroll Revamp" />
        </label>
        <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300">
          Client <span class="font-normal text-slate-400">(optional)</span>
          <input v-model="form.clientName" type="text" :class="inputCls" placeholder="Internal / client name" />
        </label>
        <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300">
          Status
          <select v-model="form.status" :class="inputCls">
            <option v-for="s in ['Planned', 'Active', 'On Hold', 'Completed', 'Cancelled']" :key="s" :value="s">{{ s }}</option>
          </select>
        </label>
        <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300">
          Start date
          <input v-model="form.startDate" type="date" :class="inputCls" />
        </label>
        <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300">
          End date
          <input v-model="form.endDate" type="date" :min="form.startDate" :class="inputCls" />
        </label>
        <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 sm:col-span-2">
          Project manager
          <select v-model="form.managerId" :class="inputCls">
            <option value="">No manager</option>
            <option v-for="p in people" :key="p.id" :value="p.id">{{ p.name }}{{ p.designation ? ` — ${p.designation}` : '' }}</option>
          </select>
        </label>
        <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 sm:col-span-2">
          Description <span class="font-normal text-slate-400">(optional)</span>
          <textarea v-model="form.description" rows="3" :class="[inputCls, 'resize-none']"></textarea>
        </label>
      </div>

      <div v-if="!editing" class="space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-xs font-bold text-slate-700 dark:text-slate-200">Members</p>
          <button type="button" class="flex items-center gap-1 text-xs font-bold text-[#1989d9] hover:underline cursor-pointer" @click="addRow">
            <Plus class="w-3.5 h-3.5" /> Add member
          </button>
        </div>
        <p v-if="!members.length" class="text-xs text-slate-400">No members yet — you can also add them later from the project page.</p>
        <div v-for="(m, i) in members" :key="i" class="grid grid-cols-[1fr_8rem_auto] gap-2 items-center">
          <select v-model="m.employeeId" :class="[inputCls, '!mt-0']" aria-label="Member">
            <option value="">Choose a person</option>
            <option v-for="p in people" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
          <input v-model="m.role" type="text" :class="[inputCls, '!mt-0']" placeholder="Role" aria-label="Role" />
          <button type="button" class="p-2 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer" title="Remove" @click="members.splice(i, 1)">
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>

      <p v-if="error" class="text-xs font-semibold text-rose-600">{{ error }}</p>
      <div class="flex gap-2 pt-1">
        <button type="button" class="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" @click="emit('close')">
          Cancel
        </button>
        <button type="submit" :disabled="saving" class="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-[#1989d9] text-white hover:bg-[#1478c0] disabled:opacity-50 cursor-pointer">
          {{ saving ? 'Saving…' : editing ? 'Save changes' : 'Create project' }}
        </button>
      </div>
    </form>
  </div>
</template>
