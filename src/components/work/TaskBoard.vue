<script setup lang="ts">
import { Calendar, FolderKanban, Plus } from '@lucide/vue'
import type { Todo, TodoStatus } from '@/types/hrms'
import { formatDay } from '@/components/attendance/time'

// To do / In progress / Done columns of compact task cards. Columns sit side by
// side (stacked on phones); clicking a card opens it (emit "open").
const props = withDefaults(defineProps<{ tasks: Todo[]; showProject?: boolean; showAssignee?: boolean; canAdd?: boolean; myId?: string }>(), {
  showProject: false,
  showAssignee: true,
  canAdd: true,
  myId: '',
})
const emit = defineEmits<{ open: [task: Todo]; add: [status: TodoStatus] }>()

const COLUMNS: { status: TodoStatus; label: string; dot: string }[] = [
  { status: 'To do', label: 'To do', dot: 'bg-slate-400' },
  { status: 'In progress', label: 'In progress', dot: 'bg-sky-500' },
  { status: 'Done', label: 'Done', dot: 'bg-emerald-500' },
]
const byStatus = (status: TodoStatus) => props.tasks.filter((t) => t.status === status)
const PRIORITY: Record<string, string> = {
  High: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  Medium: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  Low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}
const initials = (name: string) => name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
    <div
      v-for="col in COLUMNS" :key="col.status" :data-column="col.status"
      class="min-w-0 rounded-3xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 p-3 flex flex-col gap-2 md:min-h-64"
    >
      <div class="flex items-center justify-between px-1">
        <span class="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
          <span class="w-2 h-2 rounded-full" :class="col.dot"></span>{{ col.label }}
          <span class="text-slate-400">{{ byStatus(col.status).length }}</span>
        </span>
        <button
          v-if="canAdd"
          class="p-1 rounded-lg text-slate-400 hover:text-[#1989d9] hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
          :title="`Add to ${col.label}`" @click="emit('add', col.status)"
        >
          <Plus class="w-4 h-4" />
        </button>
      </div>

      <button
        v-for="t in byStatus(col.status)" :key="t.id" type="button" :data-task="t.id"
        class="w-full min-w-0 text-left p-3 rounded-2xl bg-white dark:bg-slate-900 border shadow-xs hover:border-[#1989d9]/50 hover:shadow-md transition-all cursor-pointer space-y-2"
        :class="t.overdue ? 'border-rose-200 dark:border-rose-900/60' : 'border-slate-200/80 dark:border-slate-800'"
        @click="emit('open', t)"
      >
        <div class="flex items-start justify-between gap-2">
          <p class="text-sm font-semibold line-clamp-2 break-words" :class="t.status === 'Done' ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'">{{ t.title }}</p>
          <span class="px-1.5 py-0.5 rounded-md text-[10px] font-bold shrink-0" :class="PRIORITY[t.priority]">{{ t.priority }}</span>
        </div>
        <span
          v-if="showProject && t.projectName"
          class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold max-w-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
        >
          <FolderKanban class="w-3 h-3 shrink-0" /><span class="truncate">{{ t.projectName }}</span>
        </span>
        <div class="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span v-if="showAssignee" class="inline-flex items-center gap-1.5 min-w-0">
            <span class="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-[9px] font-bold flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0">{{ initials(t.assigneeName) }}</span>
            <span class="truncate" :class="myId && t.assigneeId === myId ? 'font-semibold text-[#1989d9]' : ''">{{ myId && t.assigneeId === myId ? 'You' : t.assigneeName }}</span>
          </span>
          <span v-else-if="!t.createdByMe" class="truncate">From {{ t.createdByName }}</span>
          <span v-else></span>
          <span v-if="t.dueDate" class="inline-flex items-center gap-1 shrink-0" :class="t.overdue ? 'text-rose-600 font-semibold' : ''">
            <Calendar class="w-3 h-3" /> {{ formatDay(t.dueDate) }}
          </span>
        </div>
      </button>
      <p v-if="!byStatus(col.status).length" class="text-xs text-slate-400 text-center py-6">No tasks</p>
    </div>
  </div>
</template>
