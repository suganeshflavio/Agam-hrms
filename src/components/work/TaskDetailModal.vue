<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Calendar, CheckCircle2, Circle, FolderKanban, Loader2, Pencil, Trash2, UserRound, X } from '@lucide/vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiMutation } from '@/redux/vueAdapter'
import type { ApiError } from '@/services/apiClient'
import type { Todo, TodoStatus } from '@/types/hrms'
import { formatDay } from '@/components/attendance/time'

// One task in full: description, status buttons, and edit / delete when allowed.
const props = defineProps<{ todo: Todo; showProjectLink?: boolean }>()
const emit = defineEmits<{ close: []; edit: [todo: Todo]; changed: [message: string] }>()
const router = useRouter()

const [updateTodo, { isLoading: updating }] = useApiMutation(hrmsApi.endpoints.updateTodo)
const [deleteTodo, { isLoading: deleting }] = useApiMutation(hrmsApi.endpoints.deleteTodo)
const status = ref<TodoStatus>(props.todo.status)
const error = ref('')

const STATUSES: { value: TodoStatus; icon: typeof Circle; on: string }[] = [
  { value: 'To do', icon: Circle, on: 'bg-slate-700 text-white border-slate-700 dark:bg-slate-200 dark:text-slate-900' },
  { value: 'In progress', icon: Loader2, on: 'bg-sky-500 text-white border-sky-500' },
  { value: 'Done', icon: CheckCircle2, on: 'bg-emerald-500 text-white border-emerald-500' },
]
const PRIORITY: Record<string, string> = {
  High: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  Medium: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  Low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}
const busy = computed(() => updating.value || deleting.value)

const setStatus = async (next: TodoStatus) => {
  if (next === status.value || !props.todo.canChangeStatus) return
  error.value = ''
  const { error: err } = await updateTodo({ id: props.todo.id, updates: { status: next } })
  if (err) return (error.value = (err as ApiError).data || 'Could not update the task')
  status.value = next
  emit('changed', `Moved to ${next}`)
}
const remove = async () => {
  if (!confirm(`Delete "${props.todo.title}"?`)) return
  const { error: err } = await deleteTodo(props.todo.id)
  if (err) return (error.value = (err as ApiError).data || 'Could not delete the task')
  emit('changed', 'Task deleted')
  emit('close')
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs sm:p-4" @click.self="emit('close')">
    <div class="w-full sm:max-w-xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-6 space-y-5 max-h-[92vh] overflow-y-auto" role="dialog" aria-modal="true" :aria-label="todo.title">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2 mb-1.5">
            <span class="px-2 py-0.5 rounded-md text-[11px] font-bold" :class="PRIORITY[todo.priority]">{{ todo.priority }} priority</span>
            <span v-if="todo.overdue && status !== 'Done'" class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">Overdue</span>
          </div>
          <h3 class="text-lg font-bold text-slate-900 dark:text-white break-words" :class="status === 'Done' ? 'line-through text-slate-400' : ''">{{ todo.title }}</h3>
        </div>
        <button type="button" class="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0" aria-label="Close" @click="emit('close')">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Status -->
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="s in STATUSES" :key="s.value" type="button"
          :disabled="!todo.canChangeStatus || busy"
          class="flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer disabled:cursor-not-allowed"
          :class="status === s.value ? s.on : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50'"
          @click="setStatus(s.value)"
        >
          <component :is="s.icon" class="w-4 h-4" /> {{ s.value }}
        </button>
      </div>

      <!-- Details -->
      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div class="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
          <UserRound class="w-4 h-4 text-slate-400 shrink-0" />
          <div class="min-w-0"><dt class="text-[10px] uppercase font-semibold text-slate-400">Assigned to</dt><dd class="font-bold text-slate-800 dark:text-slate-100 truncate">{{ todo.assigneeName }}</dd></div>
        </div>
        <div class="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
          <Calendar class="w-4 h-4 shrink-0" :class="todo.overdue && status !== 'Done' ? 'text-rose-500' : 'text-slate-400'" />
          <div><dt class="text-[10px] uppercase font-semibold text-slate-400">Due</dt><dd class="font-bold text-slate-800 dark:text-slate-100">{{ todo.dueDate ? formatDay(todo.dueDate) : 'No due date' }}</dd></div>
        </div>
        <div class="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
          <UserRound class="w-4 h-4 text-slate-400 shrink-0" />
          <div class="min-w-0"><dt class="text-[10px] uppercase font-semibold text-slate-400">Created by</dt><dd class="font-bold text-slate-800 dark:text-slate-100 truncate">{{ todo.createdByMe ? 'You' : todo.createdByName }}</dd></div>
        </div>
        <div v-if="todo.projectId" class="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
          <FolderKanban class="w-4 h-4 text-indigo-500 shrink-0" />
          <div class="min-w-0">
            <dt class="text-[10px] uppercase font-semibold text-slate-400">Project</dt>
            <dd class="font-bold truncate">
              <button v-if="showProjectLink" type="button" class="text-indigo-600 dark:text-indigo-300 hover:underline cursor-pointer" @click="router.push(`/projects/${todo.projectId}`); emit('close')">{{ todo.projectName }}</button>
              <span v-else class="text-slate-800 dark:text-slate-100">{{ todo.projectName }}</span>
            </dd>
          </div>
        </div>
      </dl>

      <div>
        <p class="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Description</p>
        <p v-if="todo.description" class="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words leading-relaxed">{{ todo.description }}</p>
        <p v-else class="text-sm text-slate-400 italic">No description.</p>
      </div>

      <p v-if="error" class="text-xs font-semibold text-rose-600">{{ error }}</p>

      <div v-if="todo.canEdit" class="flex gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
        <button type="button" :disabled="busy" class="mt-4 flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-50 cursor-pointer" @click="remove">
          <Trash2 class="w-4 h-4" /> Delete
        </button>
        <button type="button" :disabled="busy" class="mt-4 flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-[#1989d9] text-white hover:bg-[#1478c0] disabled:opacity-50 cursor-pointer" @click="emit('edit', todo); emit('close')">
          <Pencil class="w-4 h-4" /> Edit
        </button>
      </div>
    </div>
  </div>
</template>
