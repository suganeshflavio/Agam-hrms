import { createRouter, createWebHistory } from 'vue-router'
import { store } from '@/redux/store'

import DashboardView from '@/views/DashboardView.vue'
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
      path: '/',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true },
    },
    {
      path: '/admin',
      name: 'admin',
      component: AdminView,
      meta: { requiresAuth: true, roles: ['Super Admin', 'HR Manager'] },
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
      meta: { requiresAuth: true },
    },
    {
      path: '/employees/:id',
      name: 'employee-profile',
      component: () => import('@/views/EmployeeProfileView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/onboarding',
      name: 'onboarding',
      component: OnboardingView,
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
      meta: { requiresAuth: true, roles: ['Super Admin', 'HR Manager', 'Payroll Specialist'] },
    },
    {
      path: '/self-service',
      name: 'self-service',
      component: SelfServiceView,
      meta: { requiresAuth: true },
    },
    {
      path: '/departments',
      name: 'departments',
      component: DepartmentsView,
      meta: { requiresAuth: true },
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

  // Role check if configured on route
  if (to.meta.roles && Array.isArray(to.meta.roles)) {
    if (user && !to.meta.roles.includes(user.role)) {
      return '/'
    }
  }

  return true
})

export default router
