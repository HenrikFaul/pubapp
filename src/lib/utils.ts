import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { OrderStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('hu-HU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateTime(dateStr: string): string {
  return `${formatDate(dateStr)} ${formatTime(dateStr)}`
}

export function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'Most'
  if (diffMins < 60) return `${diffMins} perce`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} órája`
  return formatDate(dateStr)
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Várakozik',
  accepted: 'Elfogadva',
  preparing: 'Készítés alatt',
  ready: 'Kész',
  delivered: 'Átadva',
  completed: 'Teljesítve',
  cancelled: 'Törölve',
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
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

export function isVenueOpen(opening_hours: Record<string, { open: string; close: string; closed: boolean }>): boolean {
  const now = new Date()
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const today = dayNames[now.getDay()]
  const todayHours = opening_hours[today]
  
  if (!todayHours || todayHours.closed) return false
  
  const currentTime = now.getHours() * 60 + now.getMinutes()
  const [openH, openM] = todayHours.open.split(':').map(Number)
  const [closeH, closeM] = todayHours.close.split(':').map(Number)
  const openTime = openH * 60 + openM
  const closeTime = closeH * 60 + closeM
  
  if (closeTime < openTime) {
    // Spans midnight
    return currentTime >= openTime || currentTime <= closeTime
  }
  return currentTime >= openTime && currentTime <= closeTime
}

export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
