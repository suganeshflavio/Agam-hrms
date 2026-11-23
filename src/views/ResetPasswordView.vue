<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, CheckCircle2 } from '@lucide/vue'
import AuthCard from '@/components/auth/AuthCard.vue'
import PasswordRules from '@/components/auth/PasswordRules.vue'
import { apiRequest, type ApiError } from '@/services/apiClient'

const route = useRoute()
const router = useRouter()
const token = computed(() => (route.query.token as string) || '')
const password = ref('')
const confirmation = ref('')
const rules = ref<InstanceType<typeof PasswordRules> | null>(null)
const isSaving = ref(false)
const done = ref(false)
const error = ref('')

const submit = async () => {
  error.value = ''
  if (!rules.value?.valid) {
    error.value = 'Please meet all the password requirements'
    return
  }
  isSaving.value = true
  try {
    await apiRequest('/auth/password/reset', {
      method: 'POST', auth: false,
      body: { token: token.value, password: password.value, password_confirmation: confirmation.value },
    })
    done.value = true
    setTimeout(() => router.push('/login'), 2500)
  } catch (err) {
    error.value = (err as ApiError).data || 'Could not reset the password'
  } finally {
    isSaving.value = false
  }
}

const inputClass =
  'block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:border-[#1989d9] focus:ring-[#1989d9]/20'
</script>

<template>
  <AuthCard title="Set a new password" subtitle="Choose a password you haven't used before.">
    <div v-if="!token" class="text-sm text-rose-600 text-center">
      This reset link is incomplete. Please request a new one.
    </div>

    <div v-else-if="done" class="text-center space-y-3">
      <CheckCircle2 class="w-10 h-10 text-emerald-600 mx-auto" />
      <p class="text-sm text-slate-600 dark:text-slate-300">Your password has been reset. Taking you to sign in…</p>
    </div>

    <form v-else class="space-y-4" @submit.prevent="submit">
      <div class="flex flex-col gap-1.5">
        <label for="password" class="text-sm font-medium text-slate-700 dark:text-slate-200">New password</label>
        <input id="password" v-model="password" type="password" autocomplete="new-password" :class="inputClass" />
      </div>
      <div class="flex flex-col gap-1.5">
        <label for="confirmation" class="text-sm font-medium text-slate-700 dark:text-slate-200">Confirm new password</label>
        <input id="confirmation" v-model="confirmation" type="password" autocomplete="new-password" :class="inputClass" />
      </div>
      <PasswordRules ref="rules" :password="password" :confirmation="confirmation" />
      <button
        type="submit" :disabled="isSaving"
        class="w-full py-3 rounded-xl bg-gradient-to-r from-[#044663] to-[#1989d9] text-white font-bold text-xs shadow-lg shadow-[#1989d9]/25 disabled:opacity-50 cursor-pointer"
      >
        {{ isSaving ? 'Saving…' : 'Reset password' }}
      </button>
      <p v-if="error" class="text-sm text-rose-600 dark:text-rose-400 text-center" role="alert">{{ error }}</p>
    </form>

    <div class="flex justify-between text-xs font-semibold">
      <RouterLink to="/login" class="flex items-center gap-1.5 text-[#0e6db3] dark:text-[#38a5e4] hover:underline">
        <ArrowLeft class="w-3.5 h-3.5" /> Back to sign in
      </RouterLink>
      <RouterLink to="/forgot-password" class="text-[#0e6db3] dark:text-[#38a5e4] hover:underline">Request a new link</RouterLink>
    </div>
  </AuthCard>
</template>
