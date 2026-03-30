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
    opening_hours_text: Array.isArray(raw?.opening_hours_text) ? raw.opening_hours_text : Array.isArray(raw?.openingHoursText) ? raw.openingHoursText : [],
    tags: Array.isArray(raw?.tags) ? raw.tags : [],
    metadata: typeof raw?.metadata === 'object' && raw.metadata ? raw.metadata : raw,
  }
}

export async function searchPlaces(params: PlaceSearchParams): Promise<ExternalPlace[]> {
  const payload = {
    query: params.query || '',
    category: params.category || '',
    latitude: params.latitude,
    longitude: params.longitude,
    radius_km: params.radiusKm ?? 10,
    open_now: params.openNow ?? false,
    limit: params.limit ?? 24,
  }

  const { data, error } = await supabase.functions.invoke('place-search', {
    body: payload,
  })

  if (error) {
    console.warn('[place-search] edge function unavailable:', error.message)
    return []
  }

  const rows = Array.isArray(data?.results)
    ? data.results
    : Array.isArray(data)
      ? data
      : []

  return rows.map((row: any) => normalizeExternalPlace(row)).filter((row) => row.external_id)
}
