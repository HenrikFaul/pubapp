import { supabase } from '@/lib/supabase'

export interface PlaceSearchParams {
  query?: string
  category?: string
  latitude?: number
  longitude?: number
  radiusKm?: number
  openNow?: boolean
  limit?: number
}

export interface ExternalPlace {
  external_id: string
  provider: string
  name: string
  category?: string
  categories?: string[]
  address?: string
  city?: string
  postal_code?: string
  latitude?: number
  longitude?: number
  distance_km?: number
  rating?: number
  review_count?: number
  image_url?: string
  phone?: string
  website?: string
  price_level?: string
  open_now?: boolean
  description?: string
  opening_hours_text?: string[]
  tags?: string[]
  metadata?: Record<string, unknown>
}

function numberOrUndefined(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

export function normalizeExternalPlace(raw: any): ExternalPlace {
  return {
    external_id: String(raw?.external_id || raw?.id || raw?.place_id || raw?.tomtom_id || raw?.geoapify_id || ''),
    provider: String(raw?.provider || raw?.source || 'external'),
    name: String(raw?.name || raw?.title || 'Ismeretlen hely'),
    category: raw?.category || raw?.subcategory || raw?.class_name || raw?.type,
    categories: Array.isArray(raw?.categories) ? raw.categories : [],
    address: raw?.address || raw?.formatted || raw?.formatted_address || raw?.freeformAddress,
    city: raw?.city,
    postal_code: raw?.postal_code || raw?.postcode,
    latitude: numberOrUndefined(raw?.latitude ?? raw?.lat),
    longitude: numberOrUndefined(raw?.longitude ?? raw?.lon ?? raw?.lng),
    distance_km: numberOrUndefined(raw?.distance_km ?? raw?.distanceKm ?? raw?.distance),
    rating: numberOrUndefined(raw?.rating),
    review_count: numberOrUndefined(raw?.review_count ?? raw?.reviews),
    image_url: raw?.image_url || raw?.photo || raw?.thumbnail,
    phone: raw?.phone || raw?.tel,
    website: raw?.website || raw?.url,
    price_level: raw?.price_level,
    open_now: typeof raw?.open_now === 'boolean' ? raw.open_now : raw?.is_open_now,
    description: raw?.description,
    opening_hours_text: Array.isArray(raw?.opening_hours_text)
      ? raw.opening_hours_text
      : Array.isArray(raw?.openingHoursText)
        ? raw.openingHoursText
        : [],
    tags: Array.isArray(raw?.tags) ? raw.tags : [],
    metadata: typeof raw?.metadata === 'object' && raw.metadata ? raw.metadata : raw,
  }
}

function dedupePlaces(rows: ExternalPlace[]) {
  const seen = new Map<string, ExternalPlace>()
  for (const row of rows) {
    const key = `${row.name.toLowerCase()}|${(row.address || '').toLowerCase()}|${Math.round((row.latitude || 0) * 1000)}|${Math.round((row.longitude || 0) * 1000)}`
    const current = seen.get(key)
    const currentScore = (typeof current?.rating === 'number' ? current.rating : 0) + (current?.image_url ? 1 : 0)
    const nextScore = (typeof row.rating === 'number' ? row.rating : 0) + (row.image_url ? 1 : 0)
    if (!current || nextScore >= currentScore) {
      seen.set(key, row)
    }
  }
  return Array.from(seen.values())
}

async function searchLocalCatalog(params: PlaceSearchParams): Promise<ExternalPlace[]> {
  const { data, error } = await supabase.rpc('search_hungary_places', {
    p_query: params.query?.trim() || null,
    p_category: params.category?.trim() || null,
    p_lat: typeof params.latitude === 'number' ? params.latitude : null,
    p_lon: typeof params.longitude === 'number' ? params.longitude : null,
    p_radius_km: params.radiusKm ?? 25,
    p_open_now: params.openNow ?? false,
    p_limit: params.limit ?? 48,
  })

  if (error) return []
  const rows: any[] = Array.isArray(data) ? data : []
  return dedupePlaces(rows.map((row: any) => normalizeExternalPlace(row)).filter((row: ExternalPlace) => Boolean(row.external_id)))
}

async function invokePlaceSearch(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('place-search', { body })
  if (error) return { rows: [] as ExternalPlace[], error: error.message }

  if (data && typeof data === 'object' && typeof (data as { error?: unknown }).error === 'string') {
    return { rows: [] as ExternalPlace[], error: String((data as { error: string }).error) }
  }

  const rows: any[] = Array.isArray((data as any)?.results)
    ? (data as any).results
    : Array.isArray(data)
      ? data
      : []

  const normalizedRows: ExternalPlace[] = rows.map((row: any) => normalizeExternalPlace(row))
  const filteredRows: ExternalPlace[] = normalizedRows.filter((row: ExternalPlace) => Boolean(row.external_id))
  return { rows: dedupePlaces(filteredRows), error: null as string | null }
}

export async function searchPlaces(params: PlaceSearchParams): Promise<ExternalPlace[]> {
  const payload = {
    query: params.query || '',
    category: params.category || '',
    latitude: params.latitude,
    longitude: params.longitude,
    radius_km: params.radiusKm ?? 25,
    open_now: params.openNow ?? false,
    limit: params.limit ?? 48,
  }

  const primary = await invokePlaceSearch(payload)
  if (primary.rows.length > 0) return primary.rows

  const localFallback = await searchLocalCatalog(params)
  return localFallback
}
