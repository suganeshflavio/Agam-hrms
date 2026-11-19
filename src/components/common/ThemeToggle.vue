<script setup lang="ts">
import { useTheme } from '@/composables/useTheme'
import { Sun, Moon, Monitor } from '@lucide/vue'

const { theme, isDark, setTheme, toggleTheme } = useTheme()
</script>

<template>
  <div class="relative inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 shadow-inner">
    <button
      type="button"
      @click="setTheme('light')"
      title="Light Mode"
      :class="[
        'flex items-center justify-center w-8 h-8 rounded-lg text-xs font-medium transition-all duration-200',
        theme === 'light'
          ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
      ]"
    >
      <Sun class="w-4 h-4" />
    </button>
    <button
      type="button"
      @click="setTheme('dark')"
      title="Dark Mode"
      :class="[
        'flex items-center justify-center w-8 h-8 rounded-lg text-xs font-medium transition-all duration-200',
        theme === 'dark'
          ? 'bg-white dark:bg-slate-700 text-indigo-400 shadow-sm'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
      ]"
    >
      <Moon class="w-4 h-4" />
    </button>
    <button
      type="button"
      @click="setTheme('system')"
      title="System Theme"
      :class="[
        'flex items-center justify-center w-8 h-8 rounded-lg text-xs font-medium transition-all duration-200',
        theme === 'system'
          ? 'bg-white dark:bg-slate-700 text-blue-500 shadow-sm'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
      ]"
    >
      <Monitor class="w-4 h-4" />
    </button>
  </div>
</template>
