import { computed } from 'vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiQuery } from '@/redux/vueAdapter'
import type { CompanyInfo } from '@/types/hrms'

/**
 * Formats amounts in the company's base currency (from the backend company
 * profile), e.g. INR -> ₹6,00,000. Falls back to a plain number until loaded.
 */
export function useMoney() {
  const { data: company } = useApiQuery<CompanyInfo>(hrmsApi.endpoints.getCompany)

  const currencyCode = computed(() => company.value?.currency?.match(/[A-Z]{3}/)?.[0] || '')

  const formatMoney = (value: number | null | undefined, options: Intl.NumberFormatOptions = {}) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
    const code = currencyCode.value
    const locale = code === 'INR' ? 'en-IN' : 'en-US'
    try {
      return new Intl.NumberFormat(locale, {
        ...(code ? { style: 'currency', currency: code } : {}),
        maximumFractionDigits: 0,
        ...options,
      }).format(Number(value))
    } catch {
      return Number(value).toLocaleString(locale)
    }
  }

  const currencySymbol = computed(() => {
    const code = currencyCode.value
    if (!code) return ''
    try {
      return new Intl.NumberFormat('en', { style: 'currency', currency: code }).formatToParts(0).find((p) => p.type === 'currency')?.value || code
    } catch {
      return code
    }
  })

  return { company, currencyCode, currencySymbol, formatMoney }
}
