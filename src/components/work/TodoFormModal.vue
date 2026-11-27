<script setup lang="ts">
import { computed, ref } from 'vue'
import { X } from '@lucide/vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiMutation, useApiQuery } from '@/redux/vueAdapter'
import { usePermissions } from '@/composables/usePermissions'
import type { ApiError } from '@/services/apiClient'
import type { Employee, Project, Todo, TodoInput, TodoPriority, TodoStatus } from '@/types/hrms'

// Create or edit a todo. Todos without a project can go to yourself, anyone you share a
// project with, or (managers / HR) people in your scope; project tasks go to any
// of the project's members.
const props = defineProps<{ todo?: Todo | null; projectId?: string; status?: TodoStatus }>()
const emit = defineEmits<{ close: []; saved: [todo: Todo] }>()

const { user } = usePermissions()
const myId = computed(() => user.value?.employeeId || '')
const scope = computed(() => user.value?.dataScope || 'own')
const { data: employees } = useApiQuery<Employee[]>(hrmsApi.endpoints.getEmployees)
const { data: projects } = useApiQuery<Project[]>(hrmsApi.endpoints.getProjects)
const [addTodo, { isLoading: adding }] = useApiMutation(hrmsApi.endpoints.addTodo)
const [updateTodo, { isLoading: updating }] = useApiMutation(hrmsApi.endpoints.updateTodo)

const editing = !!props.todo
const form = ref({
  title: props.todo?.title || '',
  description: props.todo?.description || '',
  dueDate: props.todo?.dueDate || '',
  priority: (props.todo?.priority || 'Medium') as TodoPriority,
  assigneeId: props.todo?.assigneeId || myId.value,
  projectId: props.todo?.projectId || props.projectId || '',
})
const error = ref('')

const project = computed(() => (projects.value || []).find((p) => p.id === form.value.projectId))
type Person = { id: string; name: string }
const projectTeam = (p: Project): Person[] => [
  ...(p.managerId ? [{ id: p.managerId, name: p.managerName || 'Manager' }] : []),
  ...p.members.map((m) => ({ id: m.employeeId, name: m.name })),
]
const unique = (people: Person[]) => people.filter((p, i) => p.id && people.findIndex((q) => q.id === p.id) === i)
const meLabel = (name?: string) => (name ? `Me (${name})` : 'Me')
const myName = computed(() => {
  const e = (employees.value || []).find((x) => x.id === myId.value)
  return e ? `${e.firstName} ${e.lastName}` : user.value?.name
})

// Who the todo can be given to, in groups: me, project teammates, my team / everyone.
const groups = computed(() => {
  const list = baseGroups()
  // Keep the current assignee selectable when editing.
  const t = props.todo
  if (t && !list.some((g) => g.people.some((p) => p.id === t.assigneeId)))
    list.push({ label: 'Current', people: [{ id: t.assigneeId, name: t.assigneeName }] })
  return list
})
const baseGroups = (): { label: string; people: Person[] }[] => {
  if (project.value) {
    const team = unique(projectTeam(project.value))
    const me = team.find((p) => p.id === myId.value)
    return [
      ...(me ? [{ label: '', people: [{ id: me.id, name: meLabel(me.name) }] }] : []),
      { label: 'Project members', people: team.filter((p) => p.id !== myId.value) },
    ]
  }
  // Teammates from every project I manage or belong to.
  const mine = (projects.value || []).filter((p) => p.managerId === myId.value || p.members.some((m) => m.employeeId === myId.value))
  const teammates = unique(mine.flatMap(projectTeam)).filter((p) => p.id !== myId.value)
  const teammateIds = new Set(teammates.map((p) => p.id))
  const others =
    scope.value === 'own'
      ? []
      : (employees.value || [])
          .filter((e) => e.isCurrent !== false && e.id !== myId.value && !teammateIds.has(e.id))
          .map((e) => ({ id: e.id, name: `${e.firstName} ${e.lastName}` }))
  return [
    { label: '', people: myId.value ? [{ id: myId.value, name: meLabel(myName.value) }] : [] },
    { label: 'Project teammates', people: teammates },
    { label: scope.value === 'all' ? 'Everyone else' : 'My team', people: others },
  ]
}
const assignees = computed(() => groups.value.flatMap((g) => g.people))
const canAssignToMe = computed(() => assignees.value.some((a) => a.id === myId.value))
const isSaving = computed(() => adding.value || updating.value)

const save = async () => {
  error.value = ''
  const f = form.value
  if (f.title.trim().length < 2) return (error.value = 'Enter a title')
  if (!f.assigneeId) return (error.value = 'Choose who the task is for')
  const body: TodoInput = {
    title: f.title.trim(), description: f.description.trim(), dueDate: f.dueDate || undefined,
    priority: f.priority, assigneeId: f.assigneeId,
  }
  const result = editing
    ? await updateTodo({ id: props.todo!.id, updates: { ...body, dueDate: f.dueDate || '' } })
    : await addTodo({ ...body, projectId: f.projectId || undefined, ...(props.status ? { status: props.status } : {}) })
  if (result.error) return (error.value = (result.error as ApiError).data || 'Could not save the task')
  emit('saved', result.data as Todo)
  emit('close')
}

const inputCls =
  'mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-hidden focus:border-[#1989d9]'
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs sm:p-4" @click.self="emit('close')">
    <form class="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-6 space-y-4 max-h-[92vh] overflow-y-auto" @submit.prevent="save">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ editing ? 'Edit task' : projectId ? 'Add project task' : 'New todo' }}</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {{ project ? `On ${project.name}` : 'For yourself or a teammate' }}
          </p>
        </div>
        <button type="button" class="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" @click="emit('close')">
          <X class="w-5 h-5" />
        </button>
      </div>

      <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300">
        Title
        <input v-model="form.title" type="text" maxlength="200" :class="inputCls" placeholder="e.g. Prepare the monthly attendance report" />
      </label>
      <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300">
        Details <span class="font-normal text-slate-400">(optional)</span>
        <textarea v-model="form.description" rows="3" maxlength="2000" :class="[inputCls, 'resize-none']"></textarea>
      </label>
      <div class="grid grid-cols-2 gap-3">
        <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300">
          Due date
          <input v-model="form.dueDate" type="date" :class="inputCls" />
        </label>
        <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300">
          Priority
          <select v-model="form.priority" :class="inputCls">
            <option v-for="p in ['Low', 'Medium', 'High']" :key="p" :value="p">{{ p }}</option>
          </select>
        </label>
      </div>
      <label v-if="!projectId && !editing && (projects || []).length" class="block text-xs font-semibold text-slate-600 dark:text-slate-300">
        Project <span class="font-normal text-slate-400">(optional)</span>
        <select v-model="form.projectId" :class="inputCls" @change="form.assigneeId = canAssignToMe ? myId : ''">
          <option value="">No project</option>
          <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </label>
      <div>
        <div class="flex items-center justify-between">
          <label for="todo-assignee" class="text-xs font-semibold text-slate-600 dark:text-slate-300">Assign to</label>
          <button
            v-if="canAssignToMe && form.assigneeId !== myId" type="button"
            class="text-xs font-bold text-[#1989d9] hover:underline cursor-pointer" @click="form.assigneeId = myId"
          >
            Assign to me
          </button>
          <span v-else-if="form.assigneeId === myId" class="text-[11px] font-semibold text-emerald-600">Assigned to you</span>
        </div>
        <select id="todo-assignee" v-model="form.assigneeId" :class="inputCls">
          <option v-if="!assignees.some((a) => a.id === form.assigneeId)" value="" disabled>Choose a person</option>
          <template v-for="g in groups" :key="g.label">
            <optgroup v-if="g.label && g.people.length" :label="g.label">
              <option v-for="a in g.people" :key="a.id" :value="a.id">{{ a.name }}</option>
            </optgroup>
            <template v-else-if="!g.label">
              <option v-for="a in g.people" :key="a.id" :value="a.id">{{ a.name }}</option>
            </template>
          </template>
        </select>
      </div>
      <p v-if="error" class="text-xs font-semibold text-rose-600">{{ error }}</p>
      <div class="flex gap-2 pt-1">
        <button type="button" class="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" @click="emit('close')">
          Cancel
        </button>
        <button type="submit" :disabled="isSaving" class="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-[#1989d9] text-white hover:bg-[#1478c0] disabled:opacity-50 cursor-pointer">
          {{ isSaving ? 'Saving…' : editing ? 'Save changes' : 'Add task' }}
        </button>
      </div>
    </form>
  </div>
</template>
