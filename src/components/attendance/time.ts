/** "09:30 AM" (API) -> "09:30" for <input type="time">. Returns '' when it can't parse. */
export const to24h = (value?: string) => {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec((value || '').trim())
  if (!m) return ''
  let h = Number(m[1])
  if (m[3]) h = (h % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0)
  return `${String(h).padStart(2, '0')}:${m[2]}`
}

/** "18:00" -> "06:00 PM" for display. */
export const to12h = (value?: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec((value || '').trim())
  if (!m) return value || ''
  const h = Number(m[1])
  return `${String(h % 12 || 12).padStart(2, '0')}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`
}

export const formatDay = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
