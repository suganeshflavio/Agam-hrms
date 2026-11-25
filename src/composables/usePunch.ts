import { computed, ref } from 'vue'
import { hrmsApi } from '@/redux/api/hrmsApi'
import { useApiMutation, useApiQuery } from '@/redux/vueAdapter'
import { usePermissions } from '@/composables/usePermissions'
import type { ApiError } from '@/services/apiClient'
import type { PunchState, WorkLocation } from '@/types/hrms'

/**
 * Clock In / Clock Out with a work location (Office or Client location), shared
 * by the Dashboard, Attendance and Self-Service screens. Working from home is
 * applied for separately and shows as WFH once approved.
 */
export function usePunch() {
  const { user, hasEmployeeProfile } = usePermissions()
  const employeeId = computed(() => user.value?.employeeId || '')
  const { data: state, isLoading } = useApiQuery<PunchState | null>(hrmsApi.endpoints.getPunchState, () => employeeId.value)
  const [punch, { isLoading: punching }] = useApiMutation(hrmsApi.endpoints.recordAttendance)
  const error = ref('')
  const message = ref('')

  const statusLabel = computed(() => {
    const s = state.value
    if (!s) return 'Not checked in'
    if (s.clockedIn) return `Clocked in · ${s.location}`
    if (s.doneForDay) return 'Done for today'
    if (s.wfhToday === 'Approved') return 'Working from home'
    return 'Not checked in'
  })

  const press = async (location: WorkLocation) => {
    error.value = ''
    message.value = ''
    const { data, error: err } = await punch({ employeeId: employeeId.value, location })
    if (err) {
      error.value = (err as ApiError).data || 'Could not record attendance'
      return false
    }
    const next = data as PunchState
    message.value = next.clockedIn ? `Clocked in at ${next.location}` : 'Clocked out'
    return true
  }

  return { state, isLoading, punching, error, message, statusLabel, press, hasEmployeeProfile }
}
