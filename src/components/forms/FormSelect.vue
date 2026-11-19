<script setup lang="ts">
import { useField } from 'vee-validate'
import { toRef } from 'vue'

const props = withDefaults(
  defineProps<{
    name: string
    label?: string
    options: Array<{ value: string | number; label: string }>
    placeholder?: string
    disabled?: boolean
    required?: boolean
    helperText?: string
  }>(),
  {
    placeholder: 'Select an option',
    disabled: false,
    required: false,
  }
)

const nameRef = toRef(props, 'name')
const { value, errorMessage, meta } = useField<string | number>(nameRef)
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" :for="name" class="block text-sm font-medium text-slate-700 dark:text-slate-200">
      {{ label }}
      <span v-if="required" class="text-rose-500">*</span>
    </label>

    <div class="relative rounded-lg shadow-xs">
      <select
        :id="name"
        :name="name"
        v-model="value"
        :disabled="disabled"
        :class="[
          'block w-full rounded-lg border px-3.5 py-2.5 text-sm transition-colors duration-150 appearance-none bg-no-repeat bg-right pr-9',
          'focus:outline-hidden focus:ring-2 focus:ring-offset-0',
          'disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400',
          errorMessage && meta.touched
            ? 'border-rose-300 dark:border-rose-600/60 bg-rose-50/30 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200 focus:border-rose-500 focus:ring-rose-500/20'
            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-[#1989d9] dark:focus:border-[#38a5e4] focus:ring-[#1989d9]/20'
        ]"
      >
        <option value="" disabled>{{ placeholder }}</option>
        <option v-for="opt in options" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 dark:text-slate-400">
        <svg class="h-4 w-4 fill-current" viewBox="0 0 20 20">
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </div>
    </div>

    <p v-if="errorMessage && meta.touched" class="text-xs font-medium text-rose-600 dark:text-rose-400">
      {{ errorMessage }}
    </p>
    <p v-else-if="helperText" class="text-xs text-slate-500 dark:text-slate-400">
      {{ helperText }}
    </p>
  </div>
</template>
