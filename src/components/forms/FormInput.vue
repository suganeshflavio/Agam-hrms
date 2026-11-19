<script setup lang="ts">
import { useField } from 'vee-validate'
import { toRef } from 'vue'

const props = withDefaults(
  defineProps<{
    name: string
    label?: string
    type?: string
    placeholder?: string
    disabled?: boolean
    required?: boolean
    helperText?: string
  }>(),
  {
    type: 'text',
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
      <input
        :id="name"
        :name="name"
        :type="type"
        v-model="value"
        :placeholder="placeholder"
        :disabled="disabled"
        :class="[
          'block w-full rounded-lg border px-3.5 py-2.5 text-sm transition-colors duration-150',
          'focus:outline-hidden focus:ring-2 focus:ring-offset-0',
          'disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400',
          errorMessage && meta.touched
            ? 'border-rose-300 dark:border-rose-600/60 bg-rose-50/30 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200 focus:border-rose-500 focus:ring-rose-500/20'
            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#1989d9] dark:focus:border-[#38a5e4] focus:ring-[#1989d9]/20'
        ]"
      />
    </div>

    <p v-if="errorMessage && meta.touched" class="text-xs font-medium text-rose-600 dark:text-rose-400">
      {{ errorMessage }}
    </p>
    <p v-else-if="helperText" class="text-xs text-slate-500 dark:text-slate-400">
      {{ helperText }}
    </p>
  </div>
</template>
