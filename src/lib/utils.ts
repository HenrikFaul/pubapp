export function formatPrice(n: number) {
  return new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', minimumFractionDigits: 0 }).format(n)
}

export function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'most'
  if (m < 60) return `${m} perce`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} órája`
  return new Date(dateStr).toLocaleDateString('hu-HU')
}

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Várakozik',
  accepted: 'Elfogadva',
  preparing: 'Készítés alatt',
  ready: 'Kész — átvehető!',
  delivered: 'Átadva',
  completed: 'Teljesítve',
  cancelled: 'Törölve',
}

export const STATUS_BADGE: Record<string, string> = {
  pending: 'badge-pending',
  accepted: 'badge-accepted',
  preparing: 'badge-preparing',
  ready: 'badge-ready',
  delivered: 'badge-done',
  completed: 'badge-done',
  cancelled: 'badge-cancelled',
}

export function isOpenNow(hours: Record<string, { open: string; close: string; closed: boolean }>): boolean {
  const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
  const today = days[new Date().getDay()]
  const h = hours?.[today]
  if (!h || h.closed) return false
  const now = new Date().getHours() * 60 + new Date().getMinutes()
  const [oh, om] = h.open.split(':').map(Number)
  const [ch, cm] = h.close.split(':').map(Number)
  const open = oh * 60 + om
  const close = ch * 60 + cm
  return close < open ? (now >= open || now <= close) : (now >= open && now <= close)
}
