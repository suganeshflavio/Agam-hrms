<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, CalendarRange, Pencil, Plus, Trash2, UserMinus, UserPlus, UserRound } from '@lucide/vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiMutation, useApiQuery } from '@/redux/vueAdapter'
import { usePermissions } from '@/composables/usePermissions'
import type { ApiError } from '@/services/apiClient'
import type { Employee, Project, ProjectStatus, Todo, TodoStatus } from '@/types/hrms'
import ProjectFormModal from '@/components/work/ProjectFormModal.vue'
import TodoFormModal from '@/components/work/TodoFormModal.vue'
import TaskDetailModal from '@/components/work/TaskDetailModal.vue'
import TaskBoard from '@/components/work/TaskBoard.vue'
import { formatDay } from '@/components/attendance/time'

// A project: details, members and a task board (To do / In progress / Done).
const route = useRoute()
const router = useRouter()
const projectId = computed(() => String(route.params.id))
const { can } = usePermissions()

const { data: project, isLoading, error } = useApiQuery<Project>(hrmsApi.endpoints.getProject, () => projectId.value)
const { data: tasks } = useApiQuery<Todo[]>(hrmsApi.endpoints.getTodos, () => ({ view: 'project' as const, projectId: projectId.value }))
const { data: employees } = useApiQuery<Employee[]>(hrmsApi.endpoints.getEmployees)
const [deleteProject] = useApiMutation(hrmsApi.endpoints.deleteProject)
const [addMember, { isLoading: addingMember }] = useApiMutation(hrmsApi.endpoints.addProjectMember)
const [removeMember] = useApiMutation(hrmsApi.endpoints.removeProjectMember)


const message = ref('')
const flash = (text: string) => {
  message.value = text
  setTimeout(() => (message.value = ''), 3500)
}

// Roles with Projects & Tasks access come from the Projects page; employees from My Tasks.
const backTo = computed(() => (can('projects', 'view') ? { path: '/projects', label: 'All projects' } : { path: '/todos', label: 'My Tasks' }))

// ---- Task detail (click a card)
const viewingTask = ref<Todo | null>(null)

// ---- Task form
const showTaskForm = ref(false)
const taskToEdit = ref<Todo | null>(null)
const newTaskStatus = ref<TodoStatus>('To do')
const openNewTask = (status: TodoStatus = 'To do') => {
  taskToEdit.value = null
  newTaskStatus.value = status
  showTaskForm.value = true
}
const openEditTask = (t: Todo) => {
  taskToEdit.value = t
  showTaskForm.value = true
}

// ---- Project edit / delete
const showProjectForm = ref(false)
const removeProject = async () => {
  if (!project.value || !confirm(`Delete the project "${project.value.name}" and all its tasks?`)) return
  const { error: err } = await deleteProject(project.value.id)
  if (err) return flash((err as ApiError).data || 'Could not delete the project')
  router.push(backTo.value.path)
}

// ---- Members
const memberForm = ref({ employeeId: '', role: '' })
const candidates = computed(() => {
  const taken = new Set([project.value?.managerId, ...(project.value?.members || []).map((m) => m.employeeId)])
  return (employees.value || []).filter((e) => e.isCurrent !== false && !taken.has(e.id))
})
const addNewMember = async () => {
  if (!project.value || !memberForm.value.employeeId) return
  const { error: err } = await addMember({ projectId: project.value.id, employeeId: memberForm.value.employeeId, role: memberForm.value.role.trim() })
  if (err) return flash((err as ApiError).data || 'Could not add the member')
  memberForm.value = { employeeId: '', role: '' }
}
const dropMember = async (employeeId: string, name: string) => {
  if (!project.value || !confirm(`Remove ${name} from the project?`)) return
  const { error: err } = await removeMember({ projectId: project.value.id, employeeId })
  if (err) flash((err as ApiError).data || 'Could not remove the member')
}

const STATUS: Record<ProjectStatus, string> = {
  Planned: 'bg-white/15 text-white',
  Active: 'bg-emerald-400/25 text-emerald-50',
  'On Hold': 'bg-amber-400/25 text-amber-50',
  Completed: 'bg-sky-300/25 text-sky-50',
  Cancelled: 'bg-rose-400/25 text-rose-50',
}
const initials = (name: string) => name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
const inputCls = 'w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-hidden focus:border-[#1989d9]'
</script>

<template>
  <div class="space-y-5 max-w-7xl mx-auto">
    <button class="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer" @click="router.push(backTo.path)">
      <ArrowLeft class="w-4 h-4" /> {{ backTo.label }}
    </button>

    <div v-if="error" class="p-10 rounded-3xl border border-rose-200 text-center text-sm text-rose-600">{{ error?.data || 'Project not found' }}</div>
    <div v-else-if="isLoading && !project" class="h-48 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse"></div>

    <template v-else-if="project">
      <!-- Header -->
      <div class="relative isolate overflow-hidden p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#044663] via-[#095f87] to-[#1989d9] text-white shadow-xl shadow-[#044663]/20">
        <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight">{{ project.name }}</h1>
              <span class="px-2.5 py-1 rounded-lg text-[11px] font-bold" :class="STATUS[project.status]">{{ project.status }}</span>
            </div>
            <p class="text-sm text-sky-100 mt-1">{{ project.clientName || 'Internal project' }} · {{ project.code }}</p>
            <p v-if="project.description" class="text-sm text-sky-50/90 mt-2 max-w-2xl">{{ project.description }}</p>
            <div class="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-sky-100">
              <span class="inline-flex items-center gap-1.5"><CalendarRange class="w-3.5 h-3.5" />
                {{ project.startDate ? formatDay(project.startDate) : 'No start date' }}{{ project.endDate ? ` → ${formatDay(project.endDate)}` : '' }}</span>
              <span class="inline-flex items-center gap-1.5"><UserRound class="w-3.5 h-3.5" /> Manager: {{ project.managerName || '—' }}</span>
            </div>
          </div>
          <div class="flex flex-col gap-3 lg:items-end shrink-0">
            <div class="w-full lg:w-56">
              <div class="flex justify-between text-[11px] font-semibold text-sky-100 mb-1"><span>Progress</span><span>{{ project.progress }}%</span></div>
              <div class="h-2 rounded-full bg-white/20 overflow-hidden"><div class="h-full rounded-full bg-emerald-300" :style="{ width: `${project.progress}%` }"></div></div>
            </div>
            <div v-if="project.canManage" class="flex gap-2">
              <button class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white text-[#044663] hover:bg-sky-50 cursor-pointer" @click="showProjectForm = true">
                <Pencil class="w-3.5 h-3.5" /> Edit
              </button>
              <button v-if="can('projects', 'delete')" class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/15 border border-white/25 hover:bg-white/25 cursor-pointer" @click="removeProject">
                <Trash2 class="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <p v-if="message" class="px-3 py-2 rounded-xl text-xs font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">{{ message }}</p>

      <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_18rem] gap-5">
        <!-- Task board: three columns side by side (stacked on phones); click a card to open it -->
        <section class="min-w-0 space-y-3">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-base font-bold text-slate-900 dark:text-white">Task board</h2>
            <button class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#1989d9] text-white hover:bg-[#1478c0] shadow-sm shadow-[#1989d9]/30 cursor-pointer" @click="openNewTask()">
              <Plus class="w-4 h-4" /> Add task
            </button>
          </div>
          <TaskBoard :tasks="tasks || []" @open="(t) => (viewingTask = t)" @add="openNewTask" />
        </section>

        <!-- Members -->
        <aside class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 sm:p-5 h-fit space-y-3">
          <h2 class="text-sm font-bold text-slate-900 dark:text-white">Team ({{ project.members.length + (project.managerId ? 1 : 0) }})</h2>
          <ul class="space-y-2.5">
            <li v-if="project.managerName" class="flex items-center gap-2.5">
              <span class="w-8 h-8 rounded-full bg-gradient-to-br from-[#1989d9] to-[#044663] text-white text-[11px] font-bold flex items-center justify-center shrink-0">{{ initials(project.managerName) }}</span>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold text-slate-900 dark:text-white truncate">{{ project.managerName }}</p>
                <p class="text-[11px] text-slate-400">Project manager</p>
              </div>
            </li>
            <li v-for="m in project.members" :key="m.employeeId" class="flex items-center gap-2.5">
              <span class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0">{{ initials(m.name) }}</span>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold text-slate-900 dark:text-white truncate">{{ m.name }}</p>
                <p class="text-[11px] text-slate-400 truncate">{{ m.role || m.designation || 'Member' }}</p>
              </div>
              <button v-if="project.canManage" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer" title="Remove from project" @click="dropMember(m.employeeId, m.name)">
                <UserMinus class="w-4 h-4" />
              </button>
            </li>
            <li v-if="!project.members.length && !project.managerName" class="text-xs text-slate-400">No one on this project yet.</li>
          </ul>

          <form v-if="project.canManage" class="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2" @submit.prevent="addNewMember">
            <p class="text-[11px] font-bold uppercase tracking-wide text-slate-400">Add member</p>
            <select v-model="memberForm.employeeId" :class="inputCls" aria-label="Employee">
              <option value="">Choose a person</option>
              <option v-for="e in candidates" :key="e.id" :value="e.id">{{ e.firstName }} {{ e.lastName }}</option>
            </select>
            <input v-model="memberForm.role" type="text" :class="inputCls" placeholder="Role on the project (optional)" aria-label="Role" />
            <button type="submit" :disabled="!memberForm.employeeId || addingMember" class="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#1989d9] text-white hover:bg-[#1478c0] disabled:opacity-50 cursor-pointer">
              <UserPlus class="w-4 h-4" /> Add to project
            </button>
          </form>
        </aside>
      </div>
    </template>

    <TaskDetailModal v-if="viewingTask" :todo="viewingTask" @close="viewingTask = null" @edit="openEditTask" @changed="flash" />
    <TodoFormModal
      v-if="showTaskForm && project" :todo="taskToEdit" :project-id="project.id" :status="newTaskStatus"
      @close="showTaskForm = false" @saved="flash(taskToEdit ? 'Task updated' : 'Task added')"
    />
    <ProjectFormModal v-if="showProjectForm && project" :project="project" @close="showProjectForm = false" @saved="flash('Project updated')" />
  </div>
</template>
