<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { LogOut, ShieldCheck } from '@lucide/vue'
import AuthCard from '@/components/auth/AuthCard.vue'
import PasswordRules from '@/components/auth/PasswordRules.vue'
import { apiRequest, tokenStore, type ApiError } from '@/services/apiClient'
import { useAppDispatch, useAppSelector } from '@/redux/vueAdapter'
import { loginSuccess, logout } from '@/redux/slices/authSlice'
import { hrmsApi } from '@/redux/api/hrmsApi'
import type { AuthUser } from '@/types/auth'

// Shown after HR creates an account: the temporary password must be replaced
// before anything else (the backend also blocks other requests until then).
const router = useRouter()
const dispatch = useAppDispatch()
const user = useAppSelector((state) => state.auth.user)

const currentPassword = ref('')
const password = ref('')
const confirmation = ref('')
const rules = ref<InstanceType<typeof PasswordRules> | null>(null)
const isSaving = ref(false)
const error = ref('')

const submit = async () => {
  error.value = ''
  if (!currentPassword.value) {
    error.value = 'Enter the temporary password from your email'
    return
  }
  if (!rules.value?.valid) {
    error.value = 'Please meet all the password requirements'
    return
  }
  isSaving.value = true
  try {
    const updated = await apiRequest<AuthUser>('/me/password', {
      method: 'PATCH',
      body: { current_password: currentPassword.value, password: password.value, password_confirmation: confirmation.value },
    })
    dispatch(loginSuccess({ user: updated, token: tokenStore.get() || '' }))
    dispatch(hrmsApi.util.resetApiState())
    await router.replace('/')
  } catch (err) {
    error.value = (err as ApiError).data || 'Could not change the password'
  } finally {
    isSaving.value = false
  }
}

const signOut = () => {
  dispatch(logout())
  router.push('/login')
}

const inputClass =
  'block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:border-[#1989d9] focus:ring-[#1989d9]/20'
</script>

<template>
  <AuthCard title="Set your password" :subtitle="`Welcome${user?.name ? ', ' + user.name : ''}! Replace your temporary password to continue.`">
    <div class="flex items-start gap-2 p-3 rounded-xl bg-[#1989d9]/10 text-xs text-[#0e6db3] dark:text-[#38a5e4]">
      <ShieldCheck class="w-4 h-4 shrink-0 mt-0.5" />
      <span>For your security, the temporary password emailed by HR works only until you set your own.</span>
    </div>

    <form class="space-y-4" @submit.prevent="submit">
      <div class="flex flex-col gap-1.5">
        <label for="current" class="text-sm font-medium text-slate-700 dark:text-slate-200">Temporary password</label>
        <input id="current" v-model="currentPassword" type="password" autocomplete="current-password" :class="inputClass" />
      </div>
      <div class="flex flex-col gap-1.5">
        <label for="password" class="text-sm font-medium text-slate-700 dark:text-slate-200">New password</label>
        <input id="password" v-model="password" type="password" autocomplete="new-password" :class="inputClass" />
      </div>
      <div class="flex flex-col gap-1.5">
        <label for="confirmation" class="text-sm font-medium text-slate-700 dark:text-slate-200">Confirm new password</label>
        <input id="confirmation" v-model="confirmation" type="password" autocomplete="new-password" :class="inputClass" />
      </div>
      <PasswordRules ref="rules" :password="password" :confirmation="confirmation" :current="currentPassword" />
      <button
        type="submit" :disabled="isSaving"
        class="w-full py-3 rounded-xl bg-gradient-to-r from-[#044663] to-[#1989d9] text-white font-bold text-xs shadow-lg shadow-[#1989d9]/25 disabled:opacity-50 cursor-pointer"
      >
        {{ isSaving ? 'Saving…' : 'Save password and continue' }}
      </button>
      <p v-if="error" class="text-sm text-rose-600 dark:text-rose-400 text-center" role="alert">{{ error }}</p>
    </form>

    <button type="button" class="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700" @click="signOut">
      <LogOut class="w-3.5 h-3.5" /> Sign out
    </button>
  </AuthCard>
</template>
