import { computed } from 'vue'
import { useAppSelector } from '@/redux/vueAdapter'
import type { PermissionAction, UserPermission } from '@/types/auth'

export type PermissionModule = UserPermission['module']
export type PermissionVerb = keyof PermissionAction

/**
 * Access comes from HR Administration -> Roles & Permissions (sent by the
 * backend as the user's per-module flags). Matrix columns map to:
 *   Read -> view, Write -> create/edit, Delete -> delete, Approve -> approve.
 * Own attendance, leave and self-service need only an employee profile.
 */
export function can(permissions: UserPermission[] | undefined, module: PermissionModule, action: PermissionVerb = 'view') {
  return !!permissions?.find((p) => p.module === module)?.actions?.[action]
}

export function usePermissions() {
  const user = useAppSelector((state) => state.auth.user)
  const check = (module: PermissionModule, action: PermissionVerb = 'view') => can(user.value?.permissions as UserPermission[] | undefined, module, action)
  return {
    user,
    can: check,
    hasEmployeeProfile: computed(() => !!user.value?.employeeId),
    isSuperAdmin: computed(() => user.value?.role === 'Super Admin'),
  }
}
