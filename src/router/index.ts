import { createRouter, createWebHistory } from 'vue-router'
import { store } from '@/redux/store'
import { can, type PermissionModule } from '@/composables/usePermissions'

import DashboardView from '@/views/DashboardView.vue'
import TodosView from '@/views/TodosView.vue'
import ProjectsView from '@/views/ProjectsView.vue'
import ProjectDetailView from '@/views/ProjectDetailView.vue'
import LoginView from '@/views/LoginView.vue'
import AdminView from '@/views/AdminView.vue'
import MasterDataView from '@/views/MasterDataView.vue'
import EmployeesView from '@/views/EmployeesView.vue'
import OnboardingView from '@/views/OnboardingView.vue'
import AttendanceView from '@/views/AttendanceView.vue'
import LeaveView from '@/views/LeaveView.vue'
import PayrollView from '@/views/PayrollView.vue'
import SelfServiceView from '@/views/SelfServiceView.vue'
import DepartmentsView from '@/views/DepartmentsView.vue'
import ForgotPasswordView from '@/views/ForgotPasswordView.vue'
import ResetPasswordView from '@/views/ResetPasswordView.vue'
import ChangePasswordView from '@/views/ChangePasswordView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { public: true },
    },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: LoginView,
      meta: { public: true },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: ForgotPasswordView,
      meta: { public: true },
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: ResetPasswordView,
      meta: { public: true },
    },
    {
      path: '/change-password',
      name: 'change-password',
      component: ChangePasswordView,
      meta: { requiresAuth: true, bare: true },
    },
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true },
    },
    {
      path: '/admin',
      name: 'admin',
      component: AdminView,
      meta: { requiresAuth: true, permission: 'admin' },
    },
    {
      path: '/master-data',
      name: 'master-data',
      redirect: '/admin',
    },
    {
      path: '/employees',
      name: 'employees',
      component: EmployeesView,
      meta: { requiresAuth: true, permission: 'employees' },
    },
    {
      path: '/employees/:id',
      name: 'employee-profile',
      component: () => import('@/views/EmployeeProfileView.vue'),
      meta: { requiresAuth: true, permission: 'employees' },
    },
    {
      path: '/onboarding',
      name: 'onboarding',
      component: OnboardingView,
      meta: { requiresAuth: true, permission: 'employees' },
    },
    {
      path: '/reports',
      name: 'reports',
      component: () => import('@/views/ReportsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/probation',
      name: 'probation',
      component: () => import('@/views/ProbationView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/attendance',
      name: 'attendance',
      component: AttendanceView,
      meta: { requiresAuth: true },
    },
    {
      path: '/leaves',
      name: 'leaves',
      component: LeaveView,
      meta: { requiresAuth: true },
    },
    {
      path: '/payroll',
      name: 'payroll',
      component: PayrollView,
      meta: { requiresAuth: true, permission: 'payroll' },
    },
    {
      path: '/self-service',
      name: 'self-service',
      component: SelfServiceView,
      meta: { requiresAuth: true },
    },
    {
      path: '/todos',
      name: 'todos',
      component: TodosView,
      meta: { requiresAuth: true },
    },
    {
      path: '/projects',
      name: 'projects',
      component: ProjectsView,
      meta: { requiresAuth: true },
    },
    {
      path: '/projects/:id',
      name: 'project-detail',
      component: ProjectDetailView,
      meta: { requiresAuth: true },
    },
    {
      path: '/departments',
      name: 'departments',
      component: DepartmentsView,
      meta: { requiresAuth: true, permission: 'admin' },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

// Navigation Guards: Security & Role-Based Access Control
router.beforeEach((to) => {
  const authState = store.getState().auth
  const isAuthenticated = authState.isAuthenticated
  const user = authState.user

  if (to.meta.public) {
    if (isAuthenticated && to.path === '/login') {
      return '/'
    }
    return true
  }

  if (!isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  // Accounts created by HR must replace the temporary password first.
  if (user?.mustChangePassword && to.name !== 'change-password') {
    return '/change-password'
  }

  // Module access from Roles & Permissions (Read = can open the page)
  if (typeof to.meta.permission === 'string' && !can(user?.permissions, to.meta.permission as PermissionModule, 'view')) {
    return '/'
  }

  return true
})

export default router
