<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { AlertTriangle, ArrowRight, FolderKanban, LayoutGrid, Plus, UserRound } from '@lucide/vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiQuery } from '@/redux/vueAdapter'
import { usePermissions } from '@/composables/usePermissions'
import type { Project, Todo, TodoStatus } from '@/types/hrms'
import TaskBoard from '@/components/work/TaskBoard.vue'
import TaskDetailModal from '@/components/work/TaskDetailModal.vue'
import TodoFormModal from '@/components/work/TodoFormModal.vue'

// My Tasks: your todos, the ones you handed out, and your projects' tasks on one board (To do / In progress /
// Done), filtered by project.
const router = useRouter()
const { user, hasEmployeeProfile } = usePermissions()
const myId = computed(() => user.value?.employeeId || '')

const { data: todos, isLoading, error } = useApiQuery<Todo[]>(hrmsApi.endpoints.getTodos, () => ({ view: 'team' }))
const { data: projects } = useApiQuery<Project[]>(hrmsApi.endpoints.getProjects)

// Filter: 'all', 'mine' (assigned to me) or a project id.
const scope = ref<string>('all')
const all = computed(() => todos.value || [])
const countFor = (key: string) =>
  key === 'all' ? all.value.length : key === 'mine' ? all.value.filter((t) => t.assigneeId === myId.value).length : all.value.filter((t) => t.projectId === key).length
// My projects first (ones with my tasks), then the rest I belong to.
const projectChips = computed(() =>
  [...(projects.value || [])].sort((a, b) => countFor(b.id) - countFor(a.id) || a.name.localeCompare(b.name)),
)
const selectedProject = computed(() => (projects.value || []).find((p) => p.id === scope.value))
const tasks = computed(() => {
  if (scope.value === 'all') return all.value
  if (scope.value === 'mine') return all.value.filter((t) => t.assigneeId === myId.value)
  return all.value.filter((t) => t.projectId === scope.value)
})
const overdue = computed(() => tasks.value.filter((t) => t.overdue).length)
const openCount = computed(() => tasks.value.filter((t) => t.status !== 'Done').length)

// ---- Detail / form
const message = ref('')
const flash = (text: string) => {
  message.value = text
  setTimeout(() => (message.value = ''), 3500)
}
const viewingTask = ref<Todo | null>(null)
const showForm = ref(false)
const editingTask = ref<Todo | null>(null)
const newStatus = ref<TodoStatus>('To do')
const openNew = (status: TodoStatus = 'To do') => {
  editingTask.value = null
  newStatus.value = status
  showForm.value = true
}
const openEdit = (t: Todo) => {
  editingTask.value = t
  showForm.value = true
}
const chip = (active: boolean) =>
  active
    ? 'bg-[#1989d9] border-[#1989d9] text-white shadow-sm shadow-[#1989d9]/30'
    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
</script>

<template>
  <div class="space-y-5 max-w-7xl mx-auto">
    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <div>
        <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">My Tasks</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Your tasks, the ones you assigned, and your project teams' tasks</p>
      </div>
      <button
        v-if="hasEmployeeProfile"
        class="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-[#1989d9] text-white hover:bg-[#1478c0] shadow-md shadow-[#1989d9]/30 cursor-pointer"
        @click="openNew()"
      >
        <Plus class="w-4 h-4" /> New task
      </button>
    </div>

    <p v-if="!hasEmployeeProfile" class="p-6 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-sm text-slate-500 text-center">
      Your login isn't linked to an employee profile, so it has no tasks.
    </p>

    <template v-else>
      <!-- Projects strip: filter the board -->
      <div class="scroll-row gap-2 max-w-full pb-1" aria-label="Filter by project">
        <button type="button" class="flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-bold cursor-pointer transition-colors" :class="chip(scope === 'all')" @click="scope = 'all'">
          <LayoutGrid class="w-4 h-4" /> All <span class="opacity-75">{{ countFor('all') }}</span>
        </button>
        <button type="button" class="flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-bold cursor-pointer transition-colors" :class="chip(scope === 'mine')" @click="scope = 'mine'">
          <UserRound class="w-4 h-4" /> Assigned to me <span class="opacity-75">{{ countFor('mine') }}</span>
        </button>
        <button
          v-for="p in projectChips" :key="p.id" type="button"
          class="flex items-center gap-2.5 pl-2 pr-3.5 py-1.5 rounded-2xl border text-xs font-bold cursor-pointer transition-colors"
          :class="chip(scope === p.id)" @click="scope = p.id"
        >
          <span
            class="w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-extrabold"
            :class="scope === p.id ? 'bg-white/20 text-white' : 'bg-gradient-to-br from-[#1989d9] to-[#044663] text-white'"
          >{{ p.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() }}</span>
          <span class="text-left">
            <span class="block leading-tight">{{ p.name }}</span>
            <span class="block text-[10px] font-semibold opacity-75">{{ countFor(p.id) }} tasks · {{ p.progress }}% done</span>
          </span>
        </button>
      </div>

      <!-- Selected project: link to its full board -->
      <div
        v-if="selectedProject"
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50"
      >
        <div class="flex items-center gap-3 min-w-0">
          <FolderKanban class="w-5 h-5 text-indigo-500 shrink-0" />
          <div class="min-w-0">
            <p class="text-sm font-bold text-slate-900 dark:text-white truncate">{{ selectedProject.name }}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              {{ selectedProject.clientName || 'Internal' }} · {{ selectedProject.status }} · your team's tasks on this project
            </p>
          </div>
        </div>
        <button
          class="self-start sm:self-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 cursor-pointer"
          @click="router.push(`/projects/${selectedProject.id}`)"
        >
          Open full project board <ArrowRight class="w-3.5 h-3.5" />
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-2 text-xs">
        <span class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300">{{ openCount }} open</span>
        <span v-if="overdue" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 font-semibold">
          <AlertTriangle class="w-3.5 h-3.5" /> {{ overdue }} overdue
        </span>
      </div>

      <p v-if="message" class="px-3 py-2 rounded-xl text-xs font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">{{ message }}</p>

      <div v-if="error" class="p-10 rounded-3xl border border-rose-200 text-center text-sm text-rose-600">{{ error?.data || 'Could not load tasks' }}</div>
      <div v-else-if="isLoading && !todos" class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div v-for="i in 3" :key="i" class="h-64 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse"></div>
      </div>
      <TaskBoard
        v-else :tasks="tasks" :show-project="scope === 'all'" :show-assignee="true" :my-id="myId"
        @open="(t) => (viewingTask = t)" @add="openNew"
      />
    </template>

    <TaskDetailModal v-if="viewingTask" :todo="viewingTask" show-project-link @close="viewingTask = null" @edit="openEdit" @changed="flash" />
    <TodoFormModal
      v-if="showForm" :todo="editingTask" :status="newStatus"
      :project-id="!editingTask && selectedProject ? selectedProject.id : undefined"
      @close="showForm = false" @saved="flash(editingTask ? 'Task updated' : 'Task added')"
    />
  </div>
</template>
