// deno-lint-ignore-file no-explicit-any
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STALE_HOURS = 24

interface SearchBody {
  query?: string
  category?: string
  latitude?: number
  longitude?: number
  radius_km?: number
  open_now?: boolean
  limit?: number
}

interface Coordinates {
  latitude: number
  longitude: number
}

interface ProviderPlace {
  provider: string
  external_id: string
  name: string
  category?: string
  categories?: string[]
  address?: string
  city?: string
  postal_code?: string
  country_code?: string
  latitude?: number
  longitude?: number
  distance_km?: number
  rating?: number | null
  review_count?: number | null
  image_url?: string | null
  phone?: string | null
  website?: string | null
  open_now?: boolean | null
  opening_hours_text?: string[]
  metadata?: Record<string, unknown>
  score?: number
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function normalizeCategory(category?: string) {
  const lower = String(category || '').toLowerCase()
  if (lower.includes('restaurant') || lower.includes('étterem')) return 'restaurant'
  if (lower.includes('cafe') || lower.includes('kávé')) return 'cafe'
  if (lower.includes('bar') || lower.includes('bár')) return 'bar'
  return 'pub'
}

function geoapifyCategoryFilter(category?: string) {
  const normalized = normalizeCategory(category)
  if (normalized === 'restaurant') return 'catering.restaurant,catering.cafe,catering.bar,catering.pub'
  if (normalized === 'cafe') return 'catering.cafe,catering.restaurant'
  if (normalized === 'bar') return 'catering.bar,catering.pub'
  return 'catering.pub,catering.bar,catering.cafe'
}

function scoreRow(row: ProviderPlace, query?: string) {
  let score = 0
  const normalizedQuery = String(query || '').trim().toLowerCase()
  if (normalizedQuery) {
    const haystack = [row.name, row.address, row.city, row.category].filter(Boolean).join(' ').toLowerCase()
    if (haystack.includes(normalizedQuery)) score += 100
    for (const token of normalizedQuery.split(/\s+/).filter(Boolean)) {
      if (haystack.includes(token)) score += 20
    }
  }
  if (typeof row.distance_km === 'number') score += Math.max(0, 40 - row.distance_km)
  if (typeof row.rating === 'number') score += Math.min(row.rating, 5) * 3
  return score
}

function dedupe(results: ProviderPlace[]) {
  const seen = new Map<string, ProviderPlace>()
  for (const row of results) {
    const key = `${row.name}|${row.address || ''}|${Math.round((row.latitude || 0) * 1000)}|${Math.round((row.longitude || 0) * 1000)}`.toLowerCase()
    const current = seen.get(key)
    if (!current || (row.score || 0) > (current.score || 0)) {
      seen.set(key, row)
    }
  }
  return Array.from(seen.values())
}

async function restFetch(url: string, init: RequestInit = {}) {
  const response = await fetch(url, init)
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`${response.status} ${response.statusText}: ${text}`)
  }
  return response
}

async function fetchLatestSyncInfo(supabaseUrl: string, serviceRoleKey: string) {
  const response = await restFetch(`${supabaseUrl}/rest/v1/places_hu_catalog?select=synced_at&order=synced_at.desc&limit=1`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  })
  const rows = await response.json()
  if (!Array.isArray(rows) || !rows[0]?.synced_at) return { hasRows: false, stale: true }
  const syncedAt = new Date(rows[0].synced_at).getTime()
  return { hasRows: true, stale: Date.now() - syncedAt > STALE_HOURS * 3600 * 1000 }
}

async function searchLocalCatalog(supabaseUrl: string, serviceRoleKey: string, body: SearchBody) {
  const response = await restFetch(`${supabaseUrl}/rest/v1/rpc/search_hungary_places`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_query: body.query?.trim() || null,
      p_category: body.category?.trim() || null,
      p_lat: typeof body.latitude === 'number' ? body.latitude : null,
      p_lon: typeof body.longitude === 'number' ? body.longitude : null,
      p_radius_km: body.radius_km ?? 25,
      p_open_now: body.open_now ?? false,
      p_limit: body.limit ?? 48,
    }),
  })
  const rows = await response.json()
  return Array.isArray(rows) ? rows : []
}

async function triggerBackgroundSync(supabaseUrl: string, serviceRoleKey: string) {
  try {
    await fetch(`${supabaseUrl}/functions/v1/sync-hu-places`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason: 'auto-refresh' }),
    })
  } catch {
    // background refresh must not break search
  }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function geocodeGeoapify(query: string, apiKey: string): Promise<Coordinates | null> {
  const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(query)}&filter=countrycode:hu&limit=1&apiKey=${apiKey}`
  const response = await fetch(url)
  if (!response.ok) return null
  const payload = await response.json()
  const feature = payload.features?.[0]
  if (!feature?.properties) return null
  return { latitude: Number(feature.properties.lat), longitude: Number(feature.properties.lon) }
}

async function geocodeTomTom(query: string, apiKey: string): Promise<Coordinates | null> {
  const url = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(query)}.json?countrySet=HU&limit=1&key=${apiKey}`
  const response = await fetch(url)
  if (!response.ok) return null
  const payload = await response.json()
  const row = payload.results?.[0]
  if (!row?.position) return null
  return { latitude: Number(row.position.lat), longitude: Number(row.position.lon) }
}

async function searchGeoapify(body: SearchBody, apiKey: string, center?: Coordinates | null, textQuery?: string): Promise<ProviderPlace[]> {
  const categories = geoapifyCategoryFilter(body.category)
  const radius = Math.max(1, body.radius_km || 25) * 1000
  const parts = [`categories=${encodeURIComponent(categories)}`, `limit=${Math.min(body.limit || 48, 50)}`, `apiKey=${apiKey}`]
  if (center) {
    parts.push(`filter=${encodeURIComponent(`circle:${center.longitude},${center.latitude},${radius}`)}`)
    parts.push(`bias=${encodeURIComponent(`proximity:${center.longitude},${center.latitude}`)}`)
  } else {
    parts.push(`filter=${encodeURIComponent('rect:16.1,45.7,22.95,48.62')}`)
  }
  if (textQuery?.trim()) {
    parts.push(`name=${encodeURIComponent(textQuery.trim())}`)
  }
  const response = await fetch(`https://api.geoapify.com/v2/places?${parts.join('&')}`)
  if (!response.ok) return []
  const payload = await response.json()
  return (payload.features || []).map((feature: any) => ({
    provider: 'geoapify',
    external_id: String(feature?.properties?.place_id || ''),
    name: String(feature?.properties?.name || feature?.properties?.address_line1 || 'Helyszín'),
    category: normalizeCategory(body.category),
    categories: Array.isArray(feature?.properties?.categories) ? feature.properties.categories : [],
    address: feature?.properties?.formatted || null,
    city: feature?.properties?.city || null,
    postal_code: feature?.properties?.postcode || null,
    country_code: String(feature?.properties?.country_code || 'HU').toUpperCase(),
    latitude: feature?.properties?.lat,
    longitude: feature?.properties?.lon,
    phone: feature?.properties?.contact?.phone || null,
    website: feature?.properties?.website || null,
    open_now: typeof feature?.properties?.opening_hours?.open_now === 'boolean' ? feature.properties.opening_hours.open_now : null,
    opening_hours_text: Array.isArray(feature?.properties?.opening_hours?.text) ? feature.properties.opening_hours.text : [],
    image_url: feature?.properties?.datasource?.raw?.image || null,
    rating: feature?.properties?.datasource?.raw?.rating || null,
    metadata: feature?.properties || {},
  })).filter((row: ProviderPlace) => row.external_id && row.country_code === 'HU')
}

async function searchTomTom(body: SearchBody, apiKey: string, center?: Coordinates | null, textQuery?: string): Promise<ProviderPlace[]> {
  const limit = Math.min(body.limit || 48, 50)
  const params = new URLSearchParams({
    key: apiKey,
    countrySet: 'HU',
    limit: String(limit),
  })
  if (center) {
    params.set('lat', String(center.latitude))
    params.set('lon', String(center.longitude))
    params.set('radius', String(Math.max(1, body.radius_km || 25) * 1000))
  } else {
    params.set('topLeft', '48.62,16.1')
    params.set('btmRight', '45.7,22.95')
  }

  const query = textQuery?.trim() || normalizeCategory(body.category)
  const response = await fetch(`https://api.tomtom.com/search/2/poiSearch/${encodeURIComponent(query)}.json?${params.toString()}`)
  if (!response.ok) return []
  const payload = await response.json()
  return (payload.results || []).map((result: any) => ({
    provider: 'tomtom',
    external_id: String(result?.id || ''),
    name: String(result?.poi?.name || 'Helyszín'),
    category: normalizeCategory(body.category),
    categories: Array.isArray(result?.poi?.categories) ? result.poi.categories : [],
    address: result?.address?.freeformAddress || null,
    city: result?.address?.municipality || null,
    postal_code: result?.address?.postalCode || null,
    country_code: String(result?.address?.countryCode || 'HU').toUpperCase(),
    latitude: result?.position?.lat,
    longitude: result?.position?.lon,
    phone: result?.poi?.phone || null,
    website: result?.poi?.url || null,
    distance_km: typeof result?.dist === 'number' ? result.dist / 1000 : center && result?.position?.lat && result?.position?.lon ? haversineKm(center.latitude, center.longitude, result.position.lat, result.position.lon) : undefined,
    metadata: result || {},
  })).filter((row: ProviderPlace) => row.external_id && row.country_code === 'HU')
}

async function remoteBootstrap(body: SearchBody, geoapifyKey: string, tomtomKey: string) {
  const trimmedQuery = String(body.query || '').trim()
  const explicitCenter = typeof body.latitude === 'number' && typeof body.longitude === 'number'
    ? { latitude: Number(body.latitude), longitude: Number(body.longitude) }
    : null

  let resolvedCenter = explicitCenter
  if (!resolvedCenter && trimmedQuery) {
    resolvedCenter = (geoapifyKey ? await geocodeGeoapify(trimmedQuery, geoapifyKey) : null) || (tomtomKey ? await geocodeTomTom(trimmedQuery, tomtomKey) : null)
  }

  const [geoByName, geoNearby, tomtomByName, tomtomNearby] = await Promise.all([
    geoapifyKey ? searchGeoapify(body, geoapifyKey, resolvedCenter, trimmedQuery || undefined) : Promise.resolve([]),
    geoapifyKey && resolvedCenter ? searchGeoapify({ ...body, query: '' }, geoapifyKey, resolvedCenter) : Promise.resolve([]),
    tomtomKey ? searchTomTom(body, tomtomKey, resolvedCenter, trimmedQuery || undefined) : Promise.resolve([]),
    tomtomKey && resolvedCenter ? searchTomTom({ ...body, query: '' }, tomtomKey, resolvedCenter) : Promise.resolve([]),
  ])

  return dedupe([...geoByName, ...geoNearby, ...tomtomByName, ...tomtomNearby]
    .map((row) => ({
      ...row,
      score: scoreRow(row, trimmedQuery),
    }))
    .sort((left, right) => (right.score || 0) - (left.score || 0)))
}

async function upsertBootstrapRows(supabaseUrl: string, serviceRoleKey: string, rows: ProviderPlace[]) {
  if (rows.length === 0) return
  await fetch(`${supabaseUrl}/rest/v1/places_hu_catalog?on_conflict=provider,external_id`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows.map((row) => ({
      provider: row.provider,
      external_id: row.external_id,
      name: row.name,
      category_group: row.category || 'pub',
      categories: row.categories || [],
      address: row.address || null,
      city: row.city || null,
      postal_code: row.postal_code || null,
      country_code: row.country_code || 'HU',
      latitude: row.latitude || null,
      longitude: row.longitude || null,
      open_now: row.open_now ?? null,
      rating: row.rating ?? null,
      review_count: row.review_count ?? null,
      image_url: row.image_url || null,
      phone: row.phone || null,
      website: row.website || null,
      opening_hours_text: row.opening_hours_text || [],
      metadata: row.metadata || {},
      synced_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    }))),
  }).catch(() => undefined)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = (await request.json()) as SearchBody
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const geoapifyKey = Deno.env.get('GEOAPIFY_API_KEY') || ''
    const tomtomKey = Deno.env.get('TOMTOM_API_KEY') || ''

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ results: [], error: 'Missing Supabase env' }, 500)
    }

    const syncInfo = await fetchLatestSyncInfo(supabaseUrl, serviceRoleKey)
    if (!syncInfo.hasRows || syncInfo.stale) {
      void triggerBackgroundSync(supabaseUrl, serviceRoleKey)
    }

    const localRows = await searchLocalCatalog(supabaseUrl, serviceRoleKey, body)
    if (localRows.length > 0) {
      return json({ results: localRows, source: 'local-catalog', stale: syncInfo.stale })
    }

    if (!syncInfo.hasRows) {
      const fallbackRows = await remoteBootstrap(body, geoapifyKey, tomtomKey)
      await upsertBootstrapRows(supabaseUrl, serviceRoleKey, fallbackRows)
      return json({ results: fallbackRows, source: 'bootstrap-provider-fallback', stale: true })
    }

    return json({ results: [], source: 'local-catalog', stale: syncInfo.stale })
  } catch (error) {
    return json({ results: [], error: String(error) }, 500)
  }
})
