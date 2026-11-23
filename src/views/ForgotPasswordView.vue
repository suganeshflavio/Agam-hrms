<script setup lang="ts">
import { ref } from 'vue'
import { ArrowLeft, Mail, MailCheck } from '@lucide/vue'
import AuthCard from '@/components/auth/AuthCard.vue'
import { apiRequest, type ApiError } from '@/services/apiClient'

const email = ref('')
const isSending = ref(false)
const sent = ref(false)
const error = ref('')

const submit = async () => {
  error.value = ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    error.value = 'Please enter a valid email address'
    return
  }
  isSending.value = true
  try {
    await apiRequest('/auth/password/forgot', { method: 'POST', auth: false, body: { email: email.value.trim() } })
    sent.value = true
  } catch (err) {
    error.value = (err as ApiError).data || 'Could not send the reset link. Please try again.'
  } finally {
    isSending.value = false
  }
}
</script>

<template>
  <AuthCard title="Forgot your password?" subtitle="We'll email you a link to set a new one.">
    <div v-if="sent" class="text-center space-y-4">
      <div class="mx-auto w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
        <MailCheck class="w-6 h-6 text-emerald-600" />
      </div>
      <p class="text-sm text-slate-600 dark:text-slate-300">
        If an account exists for <strong>{{ email }}</strong>, a reset link is on its way. The link is valid for 15 minutes.
      </p>
      <p class="text-xs text-slate-500">Didn't get it? Check your spam folder or contact your HR team.</p>
    </div>

    <form v-else class="space-y-4" @submit.prevent="submit">
      <div class="flex flex-col gap-1.5">
        <label for="email" class="block text-sm font-medium text-slate-700 dark:text-slate-200">Corporate Email Address</label>
        <div class="relative">
          <Mail class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="email" v-model="email" type="email" autocomplete="email" placeholder="name@company.com"
            class="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:border-[#1989d9] focus:ring-[#1989d9]/20"
          />
        </div>
      </div>
      <button
        type="submit" :disabled="isSending"
        class="w-full py-3 rounded-xl bg-gradient-to-r from-[#044663] to-[#1989d9] text-white font-bold text-xs shadow-lg shadow-[#1989d9]/25 transition-all disabled:opacity-50 cursor-pointer"
      >
        {{ isSending ? 'Sending…' : 'Send reset link' }}
      </button>
      <p v-if="error" class="text-sm text-rose-600 dark:text-rose-400 text-center" role="alert">{{ error }}</p>
    </form>

    <RouterLink to="/login" class="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#0e6db3] dark:text-[#38a5e4] hover:underline">
      <ArrowLeft class="w-3.5 h-3.5" /> Back to sign in
    </RouterLink>
  </AuthCard>
</template>
