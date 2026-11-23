<script setup lang="ts">
import ThemeToggle from '@/components/common/ThemeToggle.vue'
import AppLogo from '@/components/common/AppLogo.vue'

defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <div class="relative min-h-screen flex flex-col justify-center items-center p-4 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors overflow-hidden">
    <div class="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#1989d9]/15 blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#044663]/25 blur-3xl pointer-events-none"></div>
    <div class="absolute top-4 right-4 z-10"><ThemeToggle /></div>

    <div class="relative z-10 w-full max-w-md space-y-6">
      <div class="text-center space-y-3">
        <div class="inline-flex items-center justify-center p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-lg shadow-[#044663]/10">
          <AppLogo variant="full" className="h-10 md:h-12 w-auto max-w-[220px]" />
        </div>
        <div>
          <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white">{{ title }}</h1>
          <p v-if="subtitle" class="text-sm text-slate-500 dark:text-slate-400 mt-1">{{ subtitle }}</p>
        </div>
      </div>

      <div class="p-7 sm:p-8 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-2xl shadow-[#044663]/15 dark:shadow-none space-y-5">
        <slot />
      </div>

      <p class="text-center text-[11px] text-slate-500">© 2026 AGAM Technologies Ltd. All rights reserved.</p>
    </div>
  </div>
</template>
