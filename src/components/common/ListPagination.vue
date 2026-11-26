<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from '@lucide/vue'

// Compact pager for client-side lists: "Showing 11–20 of 43", Previous / Next and page numbers.
const props = defineProps<{ total: number; page: number; pageSize: number }>()
const emit = defineEmits<{ 'update:page': [page: number] }>()

const pages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const first = computed(() => (props.total ? (props.page - 1) * props.pageSize + 1 : 0))
const last = computed(() => Math.min(props.page * props.pageSize, props.total))

// Up to 5 page numbers around the current page, with the first and last always shown.
const numbers = computed<(number | '…')[]>(() => {
  const n = pages.value
  if (n <= 7) return Array.from({ length: n }, (_, i) => i + 1)
  const start = Math.max(2, props.page - 1)
  const end = Math.min(n - 1, props.page + 1)
  return [1, ...(start > 2 ? ['…' as const] : []), ...Array.from({ length: end - start + 1 }, (_, i) => start + i), ...(end < n - 1 ? ['…' as const] : []), n]
})
const go = (p: number) => emit('update:page', Math.min(Math.max(1, p), pages.value))
</script>

<template>
  <nav class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-slate-100 dark:border-slate-800" aria-label="Pagination">
    <p class="text-xs text-slate-500 dark:text-slate-400">
      Showing <strong class="text-slate-700 dark:text-slate-200">{{ first }}–{{ last }}</strong> of
      <strong class="text-slate-700 dark:text-slate-200">{{ total }}</strong>
    </p>
    <div class="scroll-row items-center gap-1">
      <button
        type="button" :disabled="page <= 1"
        class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        @click="go(page - 1)"
      >
        <ChevronLeft class="w-4 h-4" /> Previous
      </button>
      <template v-for="(n, i) in numbers" :key="i">
        <span v-if="n === '…'" class="px-1.5 text-xs text-slate-400">…</span>
        <button
          v-else type="button" :aria-current="n === page ? 'page' : undefined"
          class="min-w-8 h-8 px-2 rounded-lg text-xs font-bold cursor-pointer transition-colors"
          :class="n === page ? 'bg-[#1989d9] text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'"
          @click="go(n)"
        >
          {{ n }}
        </button>
      </template>
      <button
        type="button" :disabled="page >= pages"
        class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        @click="go(page + 1)"
      >
        Next <ChevronRight class="w-4 h-4" />
      </button>
    </div>
  </nav>
</template>
