<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BarChart3, Download, FileSpreadsheet } from '@lucide/vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiQuery } from '@/redux/vueAdapter'
import { usePermissions } from '@/composables/usePermissions'
import { apiBlob, type ApiError } from '@/services/apiClient'
import type { Department, ReportResult } from '@/types/hrms'
import { REPORTS, type ReportDefinition } from '@/components/reports/reportCatalog'

// Reports (SRS 6.15): pick a report, set its period / department, view it and download CSV.
const route = useRoute()
const router = useRouter()
const { can, user } = usePermissions()

const available = computed(() =>
  REPORTS.filter((r) => can(r.permission) || (r.team && (user.value?.managesTeam || user.value?.dataScope === 'team'))),
)
const groups = computed(() => [...new Set(available.value.map((r) => r.group))])
const selectedName = ref<string>((route.query.report as string) || '')
const selected = computed<ReportDefinition | undefined>(
  () => available.value.find((r) => r.name === selectedName.value) || available.value[0],
)
watch(selected, (r) => r && route.query.report !== r.name && router.replace({ query: { ...route.query, report: r.name } }))

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const now = new Date()
const month = ref(iso(now).slice(0, 7))
const from = ref(iso(new Date(now.getFullYear(), now.getMonth(), 1)))
const to = ref(iso(now))
const department = ref('All')
const { data: departments } = useApiQuery<Department[]>(hrmsApi.endpoints.getDepartments)

const params = computed(() => {
  const r = selected.value
  const p: Record<string, string> = {}
  if (!r) return p
  if (r.filter === 'month') p.month = month.value
  if (r.filter === 'range') Object.assign(p, { from: from.value, to: to.value })
  if (r.department && department.value !== 'All') p.department = department.value
  return p
})
const { data: report, isFetching, error } = useApiQuery<ReportResult>(
  hrmsApi.endpoints.getReport,
  () => ({ name: selected.value?.name || 'attendance_summary', params: params.value }),
)

const downloading = ref(false)
const downloadError = ref('')
const download = async () => {
  if (!selected.value) return
  downloading.value = true
  downloadError.value = ''
  try {
    const blob = await apiBlob(`/app/reports/${selected.value.name}`, { ...params.value, format: 'csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selected.value.name}-${params.value.month || params.value.from || 'all'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    downloadError.value = (err as ApiError).data || 'Could not download the report'
  } finally {
    downloading.value = false
  }
}

const isNumber = (v: unknown) => typeof v === 'number'
const input = 'px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs'
</script>

<template>
  <div class="space-y-5 max-w-7xl mx-auto">
    <div>
      <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Reports</h1>
      <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">View any report and download it as CSV (opens in Excel).</p>
    </div>

    <p v-if="!available.length" class="p-10 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-sm text-slate-500">
      You don't have access to any reports.
    </p>

    <div v-else class="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
      <nav class="space-y-4" aria-label="Reports">
        <div v-for="g in groups" :key="g">
          <p class="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{{ g }}</p>
          <button
            v-for="r in available.filter((x) => x.group === g)" :key="r.name" type="button" :data-report="r.name"
            class="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer flex items-center gap-2"
            :class="selected?.name === r.name ? 'bg-[#1989d9] text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'"
            @click="selectedName = r.name"
          >
            <BarChart3 class="w-4 h-4 shrink-0" /> {{ r.title }}
          </button>
        </div>
      </nav>

      <section v-if="selected" class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden min-w-0">
        <div class="p-5 border-b border-slate-100 dark:border-slate-800 space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <h2 class="text-base font-bold text-slate-900 dark:text-white">{{ report?.title || selected.title }}</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{{ selected.description }}</p>
            </div>
            <button
              type="button" :disabled="downloading || !report?.rows.length"
              class="self-start flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white disabled:opacity-50 cursor-pointer"
              @click="download"
            >
              <Download class="w-4 h-4" /> {{ downloading ? 'Preparing…' : 'Download CSV' }}
            </button>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <input v-if="selected.filter === 'month'" v-model="month" type="month" :class="input" aria-label="Month" />
            <template v-if="selected.filter === 'range'">
              <input v-model="from" type="date" :class="input" aria-label="From" />
              <span class="text-xs text-slate-400">to</span>
              <input v-model="to" type="date" :min="from" :class="input" aria-label="To" />
            </template>
            <select v-if="selected.department" v-model="department" :class="input" aria-label="Department">
              <option value="All">All departments</option>
              <option v-for="d in departments || []" :key="d.id" :value="d.name">{{ d.name }}</option>
            </select>
            <span v-if="report" class="text-xs text-slate-400">{{ report.rows.length }} row(s)</span>
          </div>
          <p v-if="downloadError" class="text-xs font-semibold text-rose-600">{{ downloadError }}</p>
        </div>

        <div v-if="error" class="p-10 text-center text-sm text-rose-600">{{ (error as ApiError)?.data || 'Could not load the report' }}</div>
        <div v-else-if="isFetching && !report" class="p-10 text-center text-sm text-slate-400">Loading…</div>
        <div v-else-if="!report?.rows.length" class="p-10 flex flex-col items-center gap-2 text-sm text-slate-400">
          <FileSpreadsheet class="w-8 h-8" /> No data for this selection.
        </div>
        <div v-else class="overflow-x-auto" :class="isFetching ? 'opacity-60' : ''">
          <table class="w-full text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
              <tr>
                <th v-for="c in report.columns" :key="c.key" class="px-3 py-2.5 text-left font-semibold whitespace-nowrap">{{ c.label }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-for="(row, i) in report.rows" :key="i" class="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                <td v-for="c in report.columns" :key="c.key" class="px-3 py-2 whitespace-nowrap" :class="isNumber(row[c.key]) ? 'text-right tabular-nums' : ''">
                  {{ row[c.key] ?? '—' }}
                </td>
              </tr>
            </tbody>
            <tfoot v-if="report.totals" class="bg-slate-50 dark:bg-slate-800/60 font-bold">
              <tr>
                <td v-for="c in report.columns" :key="c.key" class="px-3 py-2 whitespace-nowrap" :class="isNumber(report.totals[c.key]) ? 'text-right tabular-nums' : ''">
                  {{ report.totals[c.key] ?? '' }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>
