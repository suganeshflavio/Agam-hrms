<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import {
  Lock,
  Mail,
  ShieldCheck,
  UserCheck,
  Users,
  ArrowRight,
  CheckCircle2,
  Building2,
  KeyRound,
  X,
  AlertTriangle,
  Globe,
  Check,
  ExternalLink,
  Sparkles,
} from '@lucide/vue'
import ThemeToggle from '@/components/common/ThemeToggle.vue'
import AppLogo from '@/components/common/AppLogo.vue'
import ZohoAuthLogo from '@/components/common/ZohoAuthLogo.vue'
import { useAppDispatch } from '@/redux/vueAdapter'
import { loginSuccess } from '@/redux/slices/authSlice'
import { demoUsers, zohoDirectoryAccounts, type ZohoAccountProfile } from '@/services/authProfiles'
import { getZohoConfig, getZohoAuthorizationUrl, handleZohoCallback } from '@/services/zohoAuthService'
import type { AuthUser } from '@/types/auth'
import FormInput from '@/components/forms/FormInput.vue'

const router = useRouter()
const route = useRoute()
const dispatch = useAppDispatch()
const zohoConfig = getZohoConfig()

// Standard Login Form
const loginSchema = z.object({
  email: z.string().email('Please enter a valid corporate email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
})

const { handleSubmit, isSubmitting } = useForm({
  validationSchema: toTypedSchema(loginSchema),
  initialValues: {
    email: 'priya.sharma@agam.internal',
    password: 'Password@2026',
    rememberMe: true,
  },
})

const loginError = ref('')
const isZohoModalOpen = ref(false)
const zohoAuthenticating = ref(false)
const isProcessingOAuthCallback = ref(false)
const zohoError = ref('')
const selectedZohoAccount = ref<ZohoAccountProfile | null>(null)
const customZohoEmail = ref('')

// Check for incoming Zoho OAuth Callback (?code=...)
onMounted(async () => {
  const code = route.query.code as string
  if (code) {
    isProcessingOAuthCallback.value = true
    zohoAuthenticating.value = true
    try {
      const server =
        (route.query['accounts-server'] as string) ||
        (route.query.location === 'in' ? 'https://accounts.zoho.in' : undefined)
      const result = await handleZohoCallback(code, server)
      if (result.success && result.user && result.token) {
        dispatch(
          loginSuccess({
            user: result.user,
            token: result.token,
          })
        )
        const redirect = (route.query.redirect as string) || '/'
        await router.replace(redirect)
      } else {
        zohoError.value = result.error || 'Zoho authentication was not successful.'
        isZohoModalOpen.value = true
      }
    } catch (err: any) {
      zohoError.value = err.message || 'Zoho OAuth callback processing failed.'
      isZohoModalOpen.value = true
    } finally {
      zohoAuthenticating.value = false
      isProcessingOAuthCallback.value = false
    }
  }
})

const handleDemoLogin = (profileKey: 'admin' | 'manager' | 'employee') => {
  const profile = demoUsers[profileKey]
  if (profile) {
    dispatch(
      loginSuccess({
        user: profile,
        token: `jwt-demo-${profileKey}-${Date.now()}`,
      })
    )
    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  }
}

const onSubmit = handleSubmit(async (values) => {
  loginError.value = ''
  // Demo authentication check
  const matched = Object.values(demoUsers).find(
    (u) => u.email.toLowerCase() === values.email.toLowerCase()
  )

  const activeUser: AuthUser = matched || demoUsers.admin
  dispatch(
    loginSuccess({
      user: activeUser,
      token: `jwt-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    })
  )

  const redirect = (route.query.redirect as string) || '/'
  router.push(redirect)
})

// Trigger Live Zoho Accounts OAuth 2.0 flow
const handleLiveZohoOAuth = () => {
  const authUrl = getZohoAuthorizationUrl()
  window.location.href = authUrl
}

// Zoho SSO Handshake Flow for directory profiles
const handleSelectZohoAccount = async (account: ZohoAccountProfile) => {
  zohoError.value = ''
  selectedZohoAccount.value = account
  zohoAuthenticating.value = true

  // Simulate OAuth authorization delay
  await new Promise((r) => setTimeout(r, 600))

  if (!account.hasPortalAccess) {
    zohoAuthenticating.value = false
    zohoError.value = `Access Denied: The Zoho identity "${account.email}" is not provisioned in the AGAM HRMS directory. Only authorized active corporate members can access the workspace.`
    return
  }

  // Provision session with Zoho Auth Details
  dispatch(
    loginSuccess({
      user: {
        id: account.id,
        employeeId: account.employeeId,
        name: account.name,
        email: account.email,
        role: account.role,
        department: account.department,
        designation: account.designation,
        authProvider: 'zoho',
        zohoId: account.zohoId,
        zohoAccountType: account.zohoAccountType,
        permissions: account.permissions,
      },
      token: `zoho-oauth-token-${Date.now()}-${Math.random().toString(36).substring(5)}`,
    })
  )

  zohoAuthenticating.value = false
  isZohoModalOpen.value = false
  const redirect = (route.query.redirect as string) || '/'
  router.push(redirect)
}

const handleCustomZohoSubmit = () => {
  if (!customZohoEmail.value) return
  const matched = Object.values(zohoDirectoryAccounts).find(
    (a) => a.email.toLowerCase() === customZohoEmail.value.trim().toLowerCase()
  )

  if (matched) {
    handleSelectZohoAccount(matched)
  } else {
    zohoError.value = `Access Denied: Zoho account "${customZohoEmail.value}" is not registered in the organization directory. Please check with your Super Admin.`
  }
}
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
        <!-- Zoho OneAuth SSO Primary Button -->
        <div>
          <button
            type="button"
            @click="isZohoModalOpen = true"
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
            <a href="#" class="font-semibold text-[#0e6db3] dark:text-[#38a5e4] hover:underline">
              Forgot password?
            </a>
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
        </form>
      </div>

      <!-- Security Trust Footer -->
      <div class="text-center text-xs text-slate-400 space-y-1">
        <p>Protected by 256-bit TLS Encryption • Zoho One SSO Verified</p>
        <p class="text-[11px] text-slate-500">© 2026 AGAM Technologies Ltd. All rights reserved.</p>
      </div>
    </div>

    <!-- Zoho Auth SSO Modal (Interactive OAuth Verification) -->
    <div
      v-if="isZohoModalOpen || isProcessingOAuthCallback"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
    >
      <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5 animate-scaleUp">
        <!-- Zoho Header -->
        <div class="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div class="flex items-center gap-3">
            <div class="p-1.5 px-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center shrink-0">
              <ZohoAuthLogo variant="full" className="h-6 w-auto" />
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900 dark:text-white">Zoho OneAuth Authentication</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">OAuth 2.0 • AGAM Technologies Directory</p>
            </div>
          </div>
          <button
            v-if="!isProcessingOAuthCallback"
            @click="isZohoModalOpen = false"
            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Feedback Alert -->
        <div
          v-if="zohoError"
          class="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn"
        >
          <AlertTriangle class="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div class="space-y-0.5">
            <p class="font-bold">Access Verification Failed</p>
            <p>{{ zohoError }}</p>
          </div>
        </div>

        <!-- Loading State during live OAuth handshake -->
        <div v-if="zohoAuthenticating || isProcessingOAuthCallback" class="py-8 text-center space-y-3">
          <div class="w-10 h-10 border-3 border-[#1989d9] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p class="text-xs font-semibold text-slate-700 dark:text-slate-200">
            {{ isProcessingOAuthCallback ? 'Completing Zoho OAuth 2.0 Token Handshake...' : 'Verifying Zoho OAuth token with organization directory...' }}
          </p>
          <p class="text-[11px] text-slate-400">
            {{ isProcessingOAuthCallback ? 'Authorizing through live OAuth client ID & proxy...' : `Checking permissions for ${selectedZohoAccount?.email || 'authenticated user'}` }}
          </p>
        </div>

        <!-- Directory & Live OAuth Options -->
        <div v-else class="space-y-4">
          <!-- Live Zoho Accounts OAuth 2.0 Direct Authorize Card -->
          <div class="p-4 rounded-2xl bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 dark:from-slate-800/80 dark:to-slate-800 border border-sky-200 dark:border-sky-900/50 space-y-3">
            <div class="flex items-start justify-between">
              <div class="space-y-1">
                <div class="flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <p class="text-xs font-bold text-slate-900 dark:text-white">Live Zoho Accounts OAuth 2.0</p>
                </div>
                <p class="text-[11px] text-slate-500 dark:text-slate-400">
                  Direct live authentication with Zoho Accounts using your registered Client ID.
                </p>
              </div>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                ID: {{ zohoConfig.clientId.substring(0, 10) }}...
              </span>
            </div>

            <button
              type="button"
              @click="handleLiveZohoOAuth"
              class="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#044663] to-[#1989d9] hover:from-[#065578] hover:to-[#2298ea] text-white font-bold text-xs shadow-md shadow-[#1989d9]/20 active:scale-98 transition-all cursor-pointer"
            >
              <span>Authorize with Live Zoho Accounts</span>
              <ExternalLink class="w-3.5 h-3.5" />
            </button>
          </div>

          <div class="flex items-center gap-3">
            <div class="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">or verify with directory profile</span>
            <div class="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
          </div>

          <div class="space-y-2 max-h-56 overflow-y-auto pr-1">
            <div
              v-for="acc in Object.values(zohoDirectoryAccounts)"
              :key="acc.email"
              @click="handleSelectZohoAccount(acc)"
              :class="[
                'p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between',
                acc.hasPortalAccess
                  ? 'border-slate-200/80 dark:border-slate-800 hover:border-[#1989d9] bg-slate-50/50 dark:bg-slate-800/40 hover:bg-[#1989d9]/5'
                  : 'border-rose-200 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10 hover:border-rose-400 opacity-80'
              ]"
            >
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#044663] to-[#1989d9] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  {{ acc.name.split(' ').map(n => n[0]).join('') }}
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <p class="text-xs font-bold text-slate-900 dark:text-white">{{ acc.name }}</p>
                    <span
                      v-if="acc.hasPortalAccess"
                      class="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50"
                    >
                      {{ acc.role }}
                    </span>
                    <span
                      v-else
                      class="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-200/50"
                    >
                      Unauthorized
                    </span>
                  </div>
                  <p class="text-[11px] text-slate-500 font-mono">{{ acc.email }}</p>
                  <p class="text-[10px] text-slate-400">{{ acc.designation }} • {{ acc.zohoAccountType }}</p>
                </div>
              </div>

              <span
                v-if="acc.hasPortalAccess"
                class="text-xs font-bold text-[#1989d9] hover:underline shrink-0"
              >
                Sign In →
              </span>
              <span
                v-else
                class="text-[11px] font-semibold text-rose-500 shrink-0"
              >
                Test Denied →
              </span>
            </div>
          </div>

          <!-- Custom Zoho Account Option -->
          <div class="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Or test another Zoho corporate email
            </label>
            <div class="flex gap-2">
              <input
                type="email"
                v-model="customZohoEmail"
                placeholder="username@zoho.com"
                class="flex-1 px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-[#1989d9] rounded-xl focus:outline-hidden"
              />
              <button
                type="button"
                @click="handleCustomZohoSubmit"
                class="px-4 py-2 rounded-xl bg-[#044663] text-white text-xs font-bold hover:bg-[#065578] transition-colors cursor-pointer"
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
