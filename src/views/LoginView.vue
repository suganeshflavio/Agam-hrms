<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { ArrowRight } from '@lucide/vue'
import ThemeToggle from '@/components/common/ThemeToggle.vue'
import AppLogo from '@/components/common/AppLogo.vue'
import ZohoAuthLogo from '@/components/common/ZohoAuthLogo.vue'
import FormInput from '@/components/forms/FormInput.vue'
import { useAppDispatch } from '@/redux/vueAdapter'
import { loginSuccess } from '@/redux/slices/authSlice'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { getZohoConfig, getZohoAuthorizationUrl } from '@/services/zohoAuthService'
import { loginWithPassword, loginWithZohoCode, type BackendSession } from '@/services/backendAuth'

const router = useRouter()
const route = useRoute()
const dispatch = useAppDispatch()
const zohoConfig = getZohoConfig()
// Zoho sign-in is switched off unless VITE_ENABLE_ZOHO_LOGIN=true (backend: ZOHO_LOGIN_ENABLED=true).
const zohoEnabled = import.meta.env.VITE_ENABLE_ZOHO_LOGIN === 'true'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid corporate email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
})

const { handleSubmit, isSubmitting } = useForm({
  validationSchema: toTypedSchema(loginSchema),
  initialValues: { email: '', password: '', rememberMe: true },
})

const loginError = ref('')
const isProcessingOAuthCallback = ref(false)

const completeBackendLogin = async (session: BackendSession) => {
  dispatch(loginSuccess({ user: session.user, token: session.token, expiresAt: session.expiresAt }))
  if (session.user.mustChangePassword) {
    await router.push('/change-password')
    return
  }
  // Data requested before login (e.g. the sidebar's role list) failed with 401; refetch it.
  dispatch(hrmsApi.util.invalidateTags(['Stats', 'Company', 'Branches', 'Departments', 'Designations', 'Roles', 'Employees',
    'Onboarding', 'Shifts', 'Attendance', 'Regularizations', 'Leaves', 'Payroll', 'MasterData', 'Workflows']))
  await router.push((route.query.redirect as string) || '/')
}

const onSubmit = handleSubmit(async (values) => {
  loginError.value = ''
  try {
    await completeBackendLogin(await loginWithPassword(values.email, values.password))
  } catch (err: unknown) {
    loginError.value = err instanceof Error ? err.message : 'Login failed'
  }
})

// Zoho OAuth: redirect to Zoho; on return (?code=...) the backend verifies the code.
const handleZohoSignIn = () => {
  window.location.href = getZohoAuthorizationUrl()
}

onMounted(async () => {
  const code = route.query.code as string
  if (!code || !zohoEnabled) return

  isProcessingOAuthCallback.value = true
  try {
    const server =
      (route.query['accounts-server'] as string) ||
      (route.query.location === 'in' ? 'https://accounts.zoho.in' : undefined)
    await completeBackendLogin(await loginWithZohoCode(code, zohoConfig.redirectUri, server))
  } catch (err: unknown) {
    loginError.value = err instanceof Error ? err.message : 'Zoho sign-in failed'
  } finally {
    isProcessingOAuthCallback.value = false
  }
})
</script>

<template>
  <div class="relative min-h-screen flex flex-col justify-center items-center p-4 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors overflow-hidden">
    <!-- Atmospheric Brand Glow Elements (#044663 and #1989d9) -->
    <div class="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#1989d9]/15 blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#044663]/25 blur-3xl pointer-events-none"></div>

    <!-- Top Bar Controls -->
    <div class="absolute top-4 right-4 flex items-center gap-3 z-10">
      <div class="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60 backdrop-blur-md text-xs text-slate-500">
        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
        <span>Internal Core HRMS</span>
      </div>
      <ThemeToggle />
    </div>

    <div class="relative z-10 w-full max-w-md space-y-6">
      <!-- Brand Header Featuring App Logo -->
      <div class="text-center space-y-3">
        <div class="inline-flex items-center justify-center p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-lg shadow-[#044663]/10">
          <AppLogo variant="full" className="h-10 md:h-12 w-auto max-w-[220px]" />
        </div>

        <div>
          <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1989d9]/10 text-[#0e6db3] dark:text-[#38a5e4] text-[11px] font-bold uppercase tracking-wider mb-1">
            Enterprise HRMS Portal
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Sign in to access Employee Directory, Attendance, Leaves & Payroll
          </p>
        </div>
      </div>

      <!-- Login Form Card -->
      <div class="p-7 sm:p-8 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-2xl shadow-[#044663]/15 dark:shadow-none space-y-5">
        <!-- Zoho OneAuth SSO Primary Button (disabled unless VITE_ENABLE_ZOHO_LOGIN=true) -->
        <template v-if="zohoEnabled">
        <div>
          <button
            type="button"
            @click="handleZohoSignIn"
            class="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 font-bold text-xs shadow-xs hover:border-[#1989d9] hover:shadow-md transition-all cursor-pointer group"
          >
            <div class="px-2 py-0.5 rounded-lg bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center shrink-0">
              <ZohoAuthLogo variant="full" className="h-5 w-auto" />
            </div>
            <span class="tracking-wide">Sign in with Zoho OneAuth (SSO)</span>
          </button>
        </div>

        <!-- Divider -->
        <div class="flex items-center gap-3">
          <div class="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">or corporate password</span>
          <div class="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
        </div>
        </template>

        <form @submit="onSubmit" class="space-y-4">
          <FormInput
            name="email"
            type="email"
            label="Corporate Email Address"
            placeholder="name@agam.internal"
            required
          />

          <FormInput
            name="password"
            type="password"
            label="Password"
            placeholder="••••••••••••"
            required
          />

          <div class="flex items-center justify-between text-xs pt-1">
            <label class="flex items-center gap-2 text-slate-600 dark:text-slate-400 cursor-pointer select-none">
              <input type="checkbox" checked class="rounded border-slate-300 text-[#1989d9] focus:ring-[#1989d9]" />
              <span>Remember this session</span>
            </label>
            <RouterLink to="/forgot-password" class="font-semibold text-[#0e6db3] dark:text-[#38a5e4] hover:underline">
              Forgot password?
            </RouterLink>
          </div>

          <!-- Brand Gradient Submit Button -->
          <button
            type="submit"
            :disabled="isSubmitting"
            class="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#044663] to-[#1989d9] hover:from-[#065578] hover:to-[#2298ea] text-white font-bold text-xs shadow-lg shadow-[#1989d9]/25 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
          >
            <span>Authenticate Securely</span>
            <ArrowRight class="w-4 h-4" />
          </button>
          <p v-if="loginError" class="text-sm text-rose-600 dark:text-rose-400 text-center" role="alert">{{ loginError }}</p>
        </form>
      </div>

      <!-- Security Trust Footer -->
      <div class="text-center text-xs text-slate-400 space-y-1">
        <p>Protected by 256-bit TLS Encryption<span v-if="zohoEnabled"> • Zoho One SSO Verified</span></p>
        <p class="text-[11px] text-slate-500">© 2026 AGAM Technologies Ltd. All rights reserved.</p>
      </div>
    </div>

    <!-- Returning from Zoho: the backend verifies the code -->
    <div v-if="isProcessingOAuthCallback" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs">
      <div class="px-6 py-5 rounded-2xl bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-2xl">
        Signing you in with Zoho…
      </div>
    </div>
  </div>
</template>
