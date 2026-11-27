<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  UserCheck,
  ListTodo,
  FolderKanban,
  Clock,
  CalendarCheck,
  Banknote,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  BadgeCheck,
} from '@lucide/vue'
import ThemeToggle from '@/components/common/ThemeToggle.vue'
import NotificationBell from '@/components/layout/NotificationBell.vue'
import AppLogo from '@/components/common/AppLogo.vue'
import ZohoAuthLogo from '@/components/common/ZohoAuthLogo.vue'
import { useAppSelector, useAppDispatch } from '@/redux/vueAdapter'
import { logout } from '@/redux/slices/authSlice'

const route = useRoute()
const router = useRouter()
const dispatch = useAppDispatch()
const mobileMenuOpen = ref(false)

// Sidebar Collapse / Minimise State
const isCollapsed = ref(localStorage.getItem('sidebar_collapsed') === 'true')

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
  localStorage.setItem('sidebar_collapsed', String(isCollapsed.value))
}

const authUser = useAppSelector((state) => state.auth.user)


// Backend permission flags for a UI module key (admin, employees, attendance, leaves, payroll, ...).
const can = (module: string, action: 'view' = 'view') =>
  !!authUser.value?.permissions?.find((p) => p.module === module)?.actions?.[action]


// Menu visibility follows HR Administration -> Roles & Permissions (the
// "Read" column), sent by the backend and refreshed without re-login.
// Own attendance, leave and self-service only need an employee profile.
const navSections = computed(() => {
  const hasEmployeeProfile = !!authUser.value?.employeeId

  const sections = [
    {
      title: 'Overview',
      items: [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Release 1 • Core HRMS',
      badge: 'Active',
      items: [
        { name: 'HR Administration', path: '/admin', icon: ShieldCheck, permission: 'admin' },
        { name: 'Employee Onboarding', path: '/employees', icon: Users, permission: 'employees' },
        { name: 'Probation Reviews', path: '/probation', icon: BadgeCheck, permission: 'employees', team: true },
        { name: 'Attendance & Shifts', path: '/attendance', icon: Clock, permission: 'attendance', selfService: true },
        { name: 'Leave Management', path: '/leaves', icon: CalendarCheck, permission: 'leaves', selfService: true },
        { name: 'Payroll & Tax', path: '/payroll', icon: Banknote, permission: 'payroll' },
        { name: 'Employee Self-Service', path: '/self-service', icon: UserCheck, selfService: true },
      ].filter((item) => (item.selfService && hasEmployeeProfile) || ('team' in item && authUser.value?.managesTeam) || (item.permission ? can(item.permission) : false)),
    },
    {
      title: 'Work',
      items: [
        // Employees: one "My Tasks" screen (todos + their project tasks). Roles with
        // Projects & Tasks access also get the Projects page to manage projects.
        { name: 'My Tasks', path: '/todos', icon: ListTodo, selfService: true },
        { name: 'Projects', path: '/projects', icon: FolderKanban, permission: 'projects' },
      ].filter((item) => (item.selfService && hasEmployeeProfile) || (item.permission ? can(item.permission) : false)),
    },
  ]

  return sections.filter((section) => section.items.length > 0)
})

const isActive = (path: string) => {
  if (!route || !route.path) return false
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

const handleLogout = () => {
  dispatch(logout())
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col md:flex-row transition-colors duration-200">
    <!-- Desktop Collapsible Sidebar -->
    <aside
      :class="[
        'hidden md:flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 h-screen sticky top-0 transition-all duration-300 z-20',
        isCollapsed ? 'w-20' : 'w-70'
      ]"
    >
      <!-- Logo / Brand & Minimise Toggle -->
      <div
        :class="[
          'h-16 flex items-center border-b border-slate-200 dark:border-slate-800 shrink-0 transition-all',
          isCollapsed ? 'px-3 justify-center' : 'px-5 justify-between'
        ]"
      >
        <RouterLink v-if="!isCollapsed" to="/" class="flex items-center gap-2 group overflow-hidden">
          <AppLogo variant="full" className="h-8 w-auto max-w-[160px]" />
          <span class="text-[9px] font-extrabold uppercase tracking-widest text-[#1989d9] dark:text-[#38a5e4] px-1.5 py-0.5 rounded-md bg-[#1989d9]/10 dark:bg-[#1989d9]/20 border border-[#1989d9]/25 shrink-0">
            HRMS
          </span>
        </RouterLink>

        <RouterLink v-else to="/" class="flex items-center justify-center p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800" title="AGAM HRMS">
          <AppLogo variant="emblem" className="w-8 h-8" />
        </RouterLink>

        <!-- Minimise / Collapse Button -->
        <button
          v-if="!isCollapsed"
          @click="toggleSidebar"
          title="Minimise sidebar"
          class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>
      </div>

      <!-- Expand Button if Collapsed -->
      <div v-if="isCollapsed" class="p-2 border-b border-slate-100 dark:border-slate-800/80 flex justify-center">
        <button
          @click="toggleSidebar"
          title="Expand sidebar"
          class="w-full py-1.5 flex items-center justify-center rounded-lg text-slate-400 hover:text-[#1989d9] hover:bg-[#1989d9]/10 transition-colors cursor-pointer"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>

      <!-- Navigation Sections -->
      <nav class="flex-1 px-3 py-4 space-y-5 overflow-y-auto custom-scrollbar">
        <div v-for="section in navSections" :key="section.title" class="space-y-1">
          <!-- Section Title (Only when expanded) -->
          <!-- <div
            v-if="!isCollapsed"
            class="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between"
          >
            <span>{{ section.title }}</span>
            <span
              v-if="section.badge"
              :class="[
                'text-[9px] px-1.5 py-0.2 rounded font-semibold',
                section.badge === 'Active'
                  ? 'bg-[#1989d9]/10 dark:bg-[#1989d9]/20 text-[#1989d9] dark:text-[#38a5e4] border border-[#1989d9]/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              ]"
            >
              {{ section.badge }}
            </span>
          </div> -->

          <!-- Section Divider (When collapsed) -->
          <!-- <div v-else class="my-2 border-t border-slate-100 dark:border-slate-800/80"></div> -->

          <!-- Navigation Items -->
          <RouterLink
            v-for="item in section.items"
            :key="item.path"
            :to="item.path"
            :title="isCollapsed ? item.name : undefined"
            :class="[
              'flex items-center rounded-xl text-xs font-medium transition-all duration-150',
              isCollapsed
                ? 'justify-center p-3 w-11 h-11 mx-auto'
                : 'gap-3 px-3 py-2.5',
              isActive(item.path)
                ? 'bg-[#1989d9]/10 dark:bg-[#1989d9]/20 text-[#0e6db3] dark:text-[#38a5e4] font-semibold border-l-2 border-[#1989d9] shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
            ]"
          >
            <component :is="item.icon" class="w-4 h-4 shrink-0" />
            <span v-if="!isCollapsed" class="truncate">{{ item.name }}</span>
          </RouterLink>
        </div>
      </nav>

      <!-- User Profile Card in Sidebar -->
      <div class="p-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
        <!-- Expanded Profile View -->
        <div
          v-if="!isCollapsed"
          class="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/40"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="relative">
              <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-[#044663] to-[#1989d9] flex items-center justify-center text-white font-semibold text-xs shrink-0 shadow-xs">
                {{ (authUser?.name || 'User').split(' ').filter(Boolean).map(n => n[0]).join('') }}
              </div>
              <!-- Zoho Identity Indicator -->
              <span
                v-if="authUser?.authProvider === 'zoho'"
                title="Authenticated with Zoho OneAuth SSO"
                class="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-0.5 shadow-xs"
              >
                <ZohoAuthLogo variant="icon" className="w-full h-full" />
              </span>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5">
                <p class="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {{ authUser?.name || 'Signed In' }}
                </p>
              </div>
              <p class="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {{ authUser?.role || '—' }}
                <span v-if="authUser?.authProvider === 'zoho'" class="text-[#0e6db3] dark:text-[#38a5e4] font-semibold"> • Zoho OneAuth</span>
              </p>
            </div>
          </div>
          <button
            @click="handleLogout"
            title="Sign Out"
            class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
          >
            <LogOut class="w-4 h-4" />
          </button>
        </div>

        <!-- Collapsed Profile View -->
        <div v-else class="flex flex-col items-center gap-2">
          <div
            :title="`${authUser?.name || ''} (${authUser?.role || '—'})`"
            class="w-9 h-9 rounded-full bg-gradient-to-tr from-[#044663] to-[#1989d9] flex items-center justify-center text-white font-bold text-xs shadow-xs cursor-pointer"
          >
            {{ (authUser?.name || 'U').split(' ').filter(Boolean).map(n => n[0]).join('') }}
          </div>
          <button
            @click="handleLogout"
            title="Sign Out"
            class="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <LogOut class="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Mobile Top Header -->
    <div class="md:hidden flex items-center justify-between h-16 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <RouterLink to="/" class="flex items-center gap-2">
        <AppLogo variant="full" className="h-7 w-auto max-w-[145px]" />
        <!-- <span class="text-[10px] font-bold uppercase tracking-wider text-[#1989d9] dark:text-[#38a5e4] px-1.5 py-0.5 rounded bg-[#1989d9]/10">
          HRMS
        </span> -->
      </RouterLink>
      <div class="flex items-center gap-2">
        <ThemeToggle />
        <button
          @click="mobileMenuOpen = !mobileMenuOpen"
          class="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Menu v-if="!mobileMenuOpen" class="w-5 h-5" />
          <X v-else class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Mobile Navigation Drawer -->
    <div
      v-if="mobileMenuOpen"
      class="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 space-y-4 max-h-[75vh] overflow-y-auto"
    >
      <div v-for="section in navSections" :key="section.title" class="space-y-1">
        <!-- <p class="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 px-2">
          {{ section.title }}
        </p> -->
        <RouterLink
          v-for="item in section.items"
          :key="item.path"
          :to="item.path"
          @click="mobileMenuOpen = false"
          :class="[
            'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium',
            isActive(item.path)
              ? 'bg-[#1989d9]/10 dark:bg-[#1989d9]/20 text-[#0e6db3] dark:text-[#38a5e4] font-semibold'
              : 'text-slate-600 dark:text-slate-300'
          ]"
        >
          <component :is="item.icon" class="w-4 h-4" />
          <span>{{ item.name }}</span>
        </RouterLink>
      </div>

      <div class="pt-3 border-t border-slate-200 dark:border-slate-800">
        <button
          @click="handleLogout"
          class="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40"
        >
          <LogOut class="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col min-w-0 min-h-screen">
      <!-- Desktop Top Navbar -->
      <header class="hidden md:flex h-16 items-center justify-between px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        <div class="flex-1"></div>

        <div class="flex items-center gap-3">
          <ThemeToggle />
          <div class="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>
          <NotificationBell />
        </div>
      </header>

      <!-- Main Body Container -->
      <main class="flex-1 p-4 md:p-8">
        <slot />
      </main>
    </div>
  </div>
</template>
