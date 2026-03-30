export function formatPrice(n: number) {
  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    minimumFractionDigits: 0,
  }).format(n)
}

export function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'most'
  if (minutes < 60) return `${minutes} perce`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} órája`
  return new Date(dateStr).toLocaleDateString('hu-HU')
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('hu-HU')
}

export function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('hu-HU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDistanceKm(distance?: number) {
  if (typeof distance !== 'number' || !Number.isFinite(distance)) return '—'
  if (distance < 1) return `${Math.round(distance * 1000)} m`
  return `${distance.toFixed(1)} km`
}

export async function copyText(text: string) {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return false
  await navigator.clipboard.writeText(text)
  return true
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

export const ORDER_STATUS_LABELS = STATUS_LABELS

export const STATUS_BADGE: Record<string, string> = {
  pending: 'badge-pending',
  accepted: 'badge-accepted',
  preparing: 'badge-preparing',
  ready: 'badge-ready',
  delivered: 'badge-done',
  completed: 'badge-done',
  cancelled: 'badge-cancelled',
}

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-blue-100 text-blue-800',
  preparing: 'bg-orange-100 text-orange-800',
  ready: 'bg-green-100 text-green-800',
  delivered: 'bg-purple-100 text-purple-800',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-800',
}

export const DAY_NAMES: Record<string, string> = {
  monday: 'Hétfő',
  tuesday: 'Kedd',
  wednesday: 'Szerda',
  thursday: 'Csütörtök',
  friday: 'Péntek',
  saturday: 'Szombat',
  sunday: 'Vasárnap',
}

export function isOpenNow(
  hours: Record<string, { open: string; close: string; closed: boolean }>
): boolean {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const today = days[new Date().getDay()]
  const currentDay = hours?.[today]
  if (!currentDay || currentDay.closed) return false
  const now = new Date().getHours() * 60 + new Date().getMinutes()
  const [openHour, openMinute] = currentDay.open.split(':').map(Number)
  const [closeHour, closeMinute] = currentDay.close.split(':').map(Number)
  const open = openHour * 60 + openMinute
  const close = closeHour * 60 + closeMinute
  return close < open ? now >= open || now <= close : now >= open && now <= close
}

export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
