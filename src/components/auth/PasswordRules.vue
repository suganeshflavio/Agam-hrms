<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircle2, Circle } from '@lucide/vue'

const props = defineProps<{ password: string; confirmation: string; current?: string }>()

const rules = computed(() => [
  { label: 'At least 8 characters', ok: props.password.length >= 8 },
  { label: 'Contains a letter and a number', ok: /[A-Za-z]/.test(props.password) && /\d/.test(props.password) },
  { label: 'Both passwords match', ok: props.password.length > 0 && props.password === props.confirmation },
  ...(props.current !== undefined
    ? [{ label: 'Different from your temporary password', ok: props.password.length > 0 && props.password !== props.current }]
    : []),
])

defineExpose({ valid: computed(() => rules.value.every((r) => r.ok)) })
</script>

<template>
  <ul class="space-y-1.5 text-xs">
    <li v-for="rule in rules" :key="rule.label" class="flex items-center gap-2" :class="rule.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'">
      <CheckCircle2 v-if="rule.ok" class="w-3.5 h-3.5" />
      <Circle v-else class="w-3.5 h-3.5" />
      {{ rule.label }}
    </li>
  </ul>
</template>
