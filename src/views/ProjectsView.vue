<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CalendarRange, FolderKanban, Plus, Users } from '@lucide/vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiQuery } from '@/redux/vueAdapter'
import { usePermissions } from '@/composables/usePermissions'
import type { Project, ProjectStatus } from '@/types/hrms'
import ProjectFormModal from '@/components/work/ProjectFormModal.vue'
import { formatDay } from '@/components/attendance/time'

// Every project (Projects & Tasks "Read"), otherwise the ones you manage or belong to.
const router = useRouter()
const { can } = usePermissions()
const canCreate = computed(() => can('projects', 'create'))
const { data: projects, isLoading, error } = useApiQuery<Project[]>(hrmsApi.endpoints.getProjects)

type Filter = 'All' | ProjectStatus
const filter = ref<Filter>('All')
const FILTERS: Filter[] = ['All', 'Active', 'Planned', 'On Hold', 'Completed', 'Cancelled']
const list = computed(() => (projects.value || []).filter((p) => filter.value === 'All' || p.status === filter.value))
const showForm = ref(false)

const STATUS: Record<ProjectStatus, string> = {
  Planned: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  Active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  'On Hold': 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  Completed: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
  Cancelled: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
}
const initials = (name: string) => name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
const team = (p: Project) => [...(p.managerName ? [p.managerName] : []), ...p.members.map((m) => m.name)]
</script>

<template>
  <div class="space-y-5 max-w-7xl mx-auto">
    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <div>
        <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Projects</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Teams, timelines and task boards</p>
      </div>
      <button
        v-if="canCreate"
        class="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-[#1989d9] text-white hover:bg-[#1478c0] shadow-md shadow-[#1989d9]/30 cursor-pointer"
        @click="showForm = true"
      >
        <Plus class="w-4 h-4" /> New project
      </button>
    </div>

    <div class="scroll-row gap-2 max-w-full">
      <button
        v-for="f in FILTERS" :key="f" type="button"
        class="px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer"
        :class="filter === f ? 'bg-[#1989d9] border-[#1989d9] text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'"
        @click="filter = f"
      >
        {{ f }}
      </button>
    </div>

    <div v-if="error" class="p-10 rounded-3xl border border-rose-200 text-center text-sm text-rose-600">{{ error?.data || 'Could not load projects' }}</div>
    <div v-else-if="isLoading && !projects" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div v-for="i in 3" :key="i" class="h-52 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse"></div>
    </div>
    <div v-else-if="!list.length" class="p-12 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center gap-2 text-center text-sm text-slate-400">
      <FolderKanban class="w-9 h-9" />
      {{ filter === 'All' ? (canCreate ? 'No projects yet. Create the first one.' : 'You are not on any project yet.') : `No ${filter.toLowerCase()} projects.` }}
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <button
        v-for="p in list" :key="p.id" type="button"
        class="text-left p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col gap-4"
        @click="router.push(`/projects/${p.id}`)"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1989d9] to-[#044663] text-white flex items-center justify-center font-extrabold text-sm shrink-0">
              {{ initials(p.name) }}
            </div>
            <div class="min-w-0">
              <p class="text-sm font-bold text-slate-900 dark:text-white truncate">{{ p.name }}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400 truncate">{{ p.clientName || 'Internal' }}</p>
            </div>
          </div>
          <span class="px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0" :class="STATUS[p.status]">{{ p.status }}</span>
        </div>

        <div>
          <div class="flex justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
            <span>{{ p.taskCounts.done }} of {{ p.taskCounts.todo + p.taskCounts.inProgress + p.taskCounts.done }} tasks done</span>
            <span>{{ p.progress }}%</span>
          </div>
          <div class="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div class="h-full rounded-full bg-gradient-to-r from-[#1989d9] to-emerald-500 transition-all" :style="{ width: `${p.progress}%` }"></div>
          </div>
        </div>

        <div class="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span class="inline-flex items-center gap-1.5 min-w-0">
            <CalendarRange class="w-3.5 h-3.5 shrink-0" />
            <span class="truncate">{{ p.startDate ? formatDay(p.startDate) : 'No start date' }}{{ p.endDate ? ` → ${formatDay(p.endDate)}` : '' }}</span>
          </span>
          <span class="flex items-center shrink-0" :title="team(p).join(', ')">
            <span
              v-for="(name, i) in team(p).slice(0, 4)" :key="i"
              class="w-7 h-7 -ml-1.5 first:ml-0 rounded-full bg-slate-200 dark:bg-slate-700 ring-2 ring-white dark:ring-slate-900 text-[10px] font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center"
            >{{ initials(name) }}</span>
            <span v-if="team(p).length > 4" class="ml-1 text-[11px] font-semibold">+{{ team(p).length - 4 }}</span>
            <Users v-if="!team(p).length" class="w-4 h-4" />
          </span>
        </div>
      </button>
    </div>

    <ProjectFormModal v-if="showForm" @close="showForm = false" @saved="(p) => router.push(`/projects/${p.id}`)" />
  </div>
</template>
