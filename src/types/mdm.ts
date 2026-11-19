export type MasterDataCategory =
  | 'employment_type'
  | 'document_category'
  | 'salary_grade'
  | 'leave_type'
  | 'shift_type'
  | 'cost_center'
  | 'expense_category'

export interface MasterDataItem {
  id: string
  category: MasterDataCategory
  code: string
  name: string
  description?: string
  isActive: boolean
  sortOrder: number
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}
