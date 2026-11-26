<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Bell, CheckCheck, CheckCircle2, ClipboardCheck, FolderKanban, Hourglass, ListTodo, XCircle } from '@lucide/vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { store } from '@/redux/store'
import { useApiMutation, useApiQuery } from '@/redux/vueAdapter'
import type { AppNotification } from '@/types/notifications'

// Top-right bell: approvals waiting on you, decisions on your requests, and task /
// project updates. Refreshes every minute and whenever the tab regains focus.
const router = useRouter()
const open = ref(false)
const root = ref<HTMLElement | null>(null)

const { data: notifications, isLoading } = useApiQuery<AppNotification[]>(hrmsApi.endpoints.getNotifications)
const { data: unread } = useApiQuery<{ unread_count: number }>(hrmsApi.endpoints.getUnreadNotificationCount)
const [markRead] = useApiMutation(hrmsApi.endpoints.markNotificationRead)
const [markAllRead, { isLoading: markingAll }] = useApiMutation(hrmsApi.endpoints.markAllNotificationsRead)
const unreadCount = computed(() => unread.value?.unread_count ?? 0)

const refresh = () => store.dispatch(hrmsApi.util.invalidateTags(['Notifications']))
let timer: ReturnType<typeof setInterval> | undefined
const onFocus = () => document.visibilityState === 'visible' && refresh()
const onClickAway = (e: MouseEvent) => {
  if (open.value && root.value && !root.value.contains(e.target as Node)) open.value = false
}
onMounted(() => {
  timer = setInterval(refresh, 60_000)
  document.addEventListener('visibilitychange', onFocus)
  document.addEventListener('click', onClickAway)
})
onUnmounted(() => {
  clearInterval(timer)
  document.removeEventListener('visibilitychange', onFocus)
  document.removeEventListener('click', onClickAway)
})
const toggle = () => {
  open.value = !open.value
  if (open.value) refresh()
}

const LOOK: Record<string, { icon: typeof Bell; cls: string }> = {
  approval_requested: { icon: ClipboardCheck, cls: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300' },
  approval_progress: { icon: Hourglass, cls: 'bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300' },
  approval_approved: { icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300' },
  approval_rejected: { icon: XCircle, cls: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300' },
  todo: { icon: ListTodo, cls: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300' },
  project: { icon: FolderKanban, cls: 'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300' },
}
const look = (n: AppNotification) => LOOK[n.category] || { icon: Bell, cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300' }

// Where a notification takes you: approvers go to where they approve,
// requesters to where they track their request.
const destination = (n: AppNotification): string | null => {
  const approver = n.category === 'approval_requested'
  const projectId = n.data?.project_id
  switch (n.record_type) {
    case 'LeaveRequest': return '/leaves'
    case 'RemoteWorkRequest': return approver ? '/attendance?tab=approvals&sub=wfh' : '/self-service?tab=wfh'
    case 'AttendanceCorrection': return approver ? '/attendance?tab=approvals&sub=regularizations' : '/attendance'
    case 'Resignation': return '/self-service?tab=resignation'
    case 'ProfileChangeRequest': return '/self-service'
    case 'PayrollRun': return '/payroll'
    case 'Project': return `/projects/${n.record_id}`
    case 'Todo': return '/todos'
  }
  if (n.category === 'todo') return projectId ? `/projects/${projectId}` : '/todos'
  return null
}

const openNotification = async (n: AppNotification) => {
  if (!n.read) markRead(n.id)
  const to = destination(n)
  open.value = false
  if (to) router.push(to)
}

const ago = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  return days < 7 ? `${days}d ago` : new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button" aria-label="Notifications" :aria-expanded="open"
      class="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
      @click="toggle"
    >
      <Bell class="w-4 h-4" />
      <span
        v-if="unreadCount"
        class="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900"
        data-unread
      >{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
    </button>

    <div
      v-if="open"
      class="fixed sm:absolute inset-x-3 sm:inset-x-auto top-16 sm:top-full sm:right-0 sm:mt-2 sm:w-96 z-50 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
      role="dialog" aria-label="Notifications"
    >
      <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <p class="text-sm font-bold text-slate-900 dark:text-white">
          Notifications <span v-if="unreadCount" class="ml-1 text-xs font-semibold text-rose-500">{{ unreadCount }} new</span>
        </p>
        <button
          v-if="unreadCount" type="button" :disabled="markingAll"
          class="flex items-center gap-1 text-xs font-bold text-[#1989d9] hover:underline disabled:opacity-50 cursor-pointer"
          @click="markAllRead()"
        >
          <CheckCheck class="w-3.5 h-3.5" /> Mark all read
        </button>
      </div>

      <div class="max-h-[70vh] sm:max-h-[28rem] overflow-y-auto">
        <div v-if="isLoading && !notifications" class="p-4 space-y-3">
          <div v-for="i in 3" :key="i" class="h-12 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse"></div>
        </div>
        <div v-else-if="!notifications?.length" class="px-6 py-10 text-center">
          <Bell class="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
          <p class="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">You're all caught up</p>
          <p class="text-xs text-slate-400">Approvals and task updates will show up here.</p>
        </div>
        <button
          v-for="n in notifications" v-else :key="n.id" type="button" :data-notification="n.id"
          class="w-full flex items-start gap-3 px-4 py-3 text-left border-b last:border-b-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
          :class="n.read ? '' : 'bg-sky-50/50 dark:bg-sky-950/20'"
          @click="openNotification(n)"
        >
          <span class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" :class="look(n).cls">
            <component :is="look(n).icon" class="w-4 h-4" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm leading-snug break-words" :class="n.read ? 'text-slate-600 dark:text-slate-300' : 'font-semibold text-slate-900 dark:text-white'">{{ n.title }}</span>
            <span v-if="n.body" class="block text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 break-words">{{ n.body }}</span>
            <span class="block text-[11px] text-slate-400 mt-1">{{ ago(n.created_at) }}</span>
          </span>
          <span v-if="!n.read" class="w-2 h-2 mt-1.5 rounded-full bg-[#1989d9] shrink-0" aria-label="Unread"></span>
        </button>
      </div>
    </div>
  </div>
</template>
