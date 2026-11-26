// In-app notification from GET /notifications (snake_case, as the API sends it).
export interface AppNotification {
  id: number | string
  category: string // approval_requested | approval_progress | approval_approved | approval_rejected | todo | project | ...
  title: string
  body: string | null
  data: Record<string, unknown>
  record_type: string | null
  record_id: number | string | null
  read: boolean
  read_at: string | null
  created_at: string
}
