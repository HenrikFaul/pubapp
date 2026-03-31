
// deno-lint-ignore-file no-explicit-any
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
  if (normalized === 'restaurant') return 'catering.restaurant'
  if (normalized === 'cafe') return 'catering.cafe'
  if (normalized === 'bar') return 'catering.bar'
  return 'catering.pub,catering.bar'
}

function normalizeTomTomCategory(category?: string) {
  const normalized = normalizeCategory(category)
  if (normalized === 'restaurant') return 'restaurant'
  if (normalized === 'cafe') return 'cafe'
  if (normalized === 'bar') return 'bar'
  return 'pub'
}

// Score-based text relevance: 0 = no match, 1 = word match, 2 = address/city match, 3 = name match
function scoreMatch(row: any, query: string): number {
  const q = query.toLowerCase().trim()
  if (!q) return 2
  const name = String(row.name || '').toLowerCase()
  const address = String(row.address || '').toLowerCase()
  const city = String(row.city || '').toLowerCase()
  const category = String(row.category || '').toLowerCase()
  const haystack = `${name} ${address} ${city} ${category}`

  if (name.includes(q)) return 3
  if (address.includes(q) || city.includes(q)) return 2

  const words = q.split(/\s+/).filter((w: string) => w.length >= 3)
  if (words.length > 0 && words.some((w: string) => haystack.includes(w))) return 1

  return 0
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

function dedupe(results: any[]) {
  const seen = new Map<string, any>()
  for (const row of results) {
    const key = `${row.name}|${row.address}|${Math.round((row.latitude || 0) * 1000)}|${Math.round((row.longitude || 0) * 1000)}`.toLowerCase()
    const current = seen.get(key)
    if (!current || (row.provider === 'geoapify' && current.provider !== 'geoapify')) {
      seen.set(key, row)
    }
  }
  return Array.from(seen.values())
}

async function geocodeGeoapify(query: string, apiKey: string): Promise<Coordinates | null> {
  const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(query)}&limit=1&apiKey=${apiKey}`
  const response = await fetch(url)
  if (!response.ok) return null
  const payload = await response.json()
  const feature = payload.features?.[0]
  if (!feature?.properties) return null
  return {
    latitude: Number(feature.properties.lat),
    longitude: Number(feature.properties.lon),
  }
}

async function geocodeTomTom(query: string, apiKey: string): Promise<Coordinates | null> {
  const url = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(query)}.json?limit=1&key=${apiKey}`
  const response = await fetch(url)
  if (!response.ok) return null
  const payload = await response.json()
  const row = payload.results?.[0]
  if (!row?.position) return null
  return {
    latitude: Number(row.position.lat),
    longitude: Number(row.position.lon),
  }
}

function mapGeoapifyFeature(feature: any, category: string) {
  return {
    provider: 'geoapify',
    external_id: feature.properties.place_id,
    name: feature.properties.name || feature.properties.address_line1 || 'Helyszín',
    category,
    address: feature.properties.formatted,
    city: feature.properties.city,
    postal_code: feature.properties.postcode,
    latitude: feature.properties.lat,
    longitude: feature.properties.lon,
    website: feature.properties.website,
    phone: feature.properties.contact?.phone,
    open_now: feature.properties.opening_hours?.open_now,
    opening_hours_text: feature.properties.opening_hours?.text || [],
    image_url: feature.properties.datasource?.raw?.image || null,
    rating: feature.properties.datasource?.raw?.rating || null,
    metadata: feature.properties,
  }
}

function mapTomTomResult(result: any, category: string) {
  return {
    provider: 'tomtom',
    external_id: result.id,
    name: result.poi?.name || 'Helyszín',
    category: result.poi?.classifications?.[0]?.code || category,
    address: result.address?.freeformAddress,
    city: result.address?.municipality,
    postal_code: result.address?.postalCode,
    latitude: result.position?.lat,
    longitude: result.position?.lon,
    website: result.poi?.url,
    phone: result.poi?.phone,
    distance_km: typeof result.dist === 'number' ? result.dist / 1000 : undefined,
    metadata: result,
  }
}

// Geoapify: POI name-filtered search using the `name` parameter.
// FIX: `text` is a geocoding-API param silently ignored by v2 Places — use `name` instead.
async function searchGeoapifyByName(
  params: SearchBody,
  apiKey: string,
  center: Coordinates,
  nameQuery: string,
) {
  const category = normalizeCategory(params.category)
  const categories = geoapifyCategoryFilter(params.category)
  const radius = Math.max(1, params.radius_km || 10) * 1000
  const url = [
    'https://api.geoapify.com/v2/places',
    `?categories=${categories}`,
    `&name=${encodeURIComponent(nameQuery)}`,
    `&bias=proximity:${center.longitude},${center.latitude}`,
    `&filter=circle:${center.longitude},${center.latitude},${radius}`,
    `&limit=${params.limit || 24}`,
    `&apiKey=${apiKey}`,
  ].join('')
  const response = await fetch(url)
  if (!response.ok) return []
  const payload = await response.json()
  return (payload.features || []).map((f: any) => mapGeoapifyFeature(f, category))
}

// Geoapify: pure category nearby search (no name filter — returns all matching venues near center)
async function searchGeoapifyNearby(params: SearchBody, apiKey: string, center: Coordinates) {
  const category = normalizeCategory(params.category)
  const categories = geoapifyCategoryFilter(params.category)
  const radius = Math.max(1, params.radius_km || 10) * 1000
  const url = [
    'https://api.geoapify.com/v2/places',
    `?categories=${categories}`,
    `&bias=proximity:${center.longitude},${center.latitude}`,
    `&filter=circle:${center.longitude},${center.latitude},${radius}`,
    `&limit=${params.limit || 24}`,
    `&apiKey=${apiKey}`,
  ].join('')
  const response = await fetch(url)
  if (!response.ok) return []
  const payload = await response.json()
  return (payload.features || []).map((f: any) => mapGeoapifyFeature(f, category))
}

// TomTom: free-text venue name search using fuzzySearch.
// FIX: Uses fuzzySearch (not poiSearch with combined text+category) — fuzzySearch handles
// venue names and city names correctly without mangling them into a combined POI name.
async function searchTomTomByName(
  query: string,
  apiKey: string,
  params: SearchBody,
  center?: Coordinates | null,
) {
  const category = normalizeTomTomCategory(params.category)
  const radius = Math.max(1, params.radius_km || 10) * 1000
  const hasCenter = Boolean(
    center &&
      Number.isFinite(Number(center.latitude)) &&
      Number.isFinite(Number(center.longitude)),
  )
  const locationPart = hasCenter
    ? `lat=${center!.latitude}&lon=${center!.longitude}&radius=${radius}&`
    : ''
  const url = `https://api.tomtom.com/search/2/fuzzySearch/${encodeURIComponent(query)}.json?${locationPart}limit=${params.limit || 24}&key=${apiKey}`
  const response = await fetch(url)
  if (!response.ok) return []
  const payload = await response.json()
  return (payload.results || []).map((r: any) => mapTomTomResult(r, category))
}

// TomTom: category-based nearby search using poiSearch with only the category keyword.
// FIX: Only passes the category keyword ("pub", "restaurant"), not "BUDAPEST restaurant".
async function searchTomTomNearby(apiKey: string, params: SearchBody, center: Coordinates) {
  const category = normalizeTomTomCategory(params.category)
  const radius = Math.max(1, params.radius_km || 10) * 1000
  const url = `https://api.tomtom.com/search/2/poiSearch/${encodeURIComponent(category)}.json?lat=${center.latitude}&lon=${center.longitude}&radius=${radius}&limit=${params.limit || 24}&key=${apiKey}`
  const response = await fetch(url)
  if (!response.ok) return []
  const payload = await response.json()
  return (payload.results || []).map((r: any) => mapTomTomResult(r, category))
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = (await request.json()) as SearchBody
    const trimmedQuery = String(body.query || '').trim()
    const hasCoords =
      Number.isFinite(Number(body.latitude)) && Number.isFinite(Number(body.longitude))
    const explicitCenter = hasCoords
      ? { latitude: Number(body.latitude), longitude: Number(body.longitude) }
      : null

    if (!explicitCenter && !trimmedQuery) {
      return json({ results: [], error: 'query or coordinates are required' }, 400)
    }

    const limit = Math.min(Math.max(Number(body.limit || 24), 1), 48)
    const geoapifyKey = Deno.env.get('GEOAPIFY_API_KEY') || ''
    const tomtomKey = Deno.env.get('TOMTOM_API_KEY') || ''

    // Resolve center: prefer explicit coordinates, fall back to geocoding the query text
    let resolvedCenter = explicitCenter
    if (!resolvedCenter && trimmedQuery) {
      resolvedCenter =
        (geoapifyKey ? await geocodeGeoapify(trimmedQuery, geoapifyKey) : null) ||
        (tomtomKey ? await geocodeTomTom(trimmedQuery, tomtomKey) : null)
    }

    const searchCenter = explicitCenter || resolvedCenter

    // Four parallel provider searches — by-name and nearby are now fully separated:
    //  [0] geoByName:      Geoapify name-filtered (needs both query + center)
    //  [1] tomtomByName:   TomTom fuzzySearch for the text (works without center too)
    //  [2] geoNearby:      Geoapify category nearby (needs center, no text filter)
    //  [3] tomtomNearby:   TomTom poiSearch category nearby (needs center)
    const [geoByNameResults, tomtomByNameResults, geoNearbyResults, tomtomNearbyResults] =
      await Promise.all([
        trimmedQuery && searchCenter && geoapifyKey
          ? searchGeoapifyByName({ ...body, limit }, geoapifyKey, searchCenter, trimmedQuery)
          : Promise.resolve([]),
        trimmedQuery && tomtomKey
          ? searchTomTomByName(trimmedQuery, tomtomKey, { ...body, limit }, searchCenter)
          : Promise.resolve([]),
        searchCenter && geoapifyKey
          ? searchGeoapifyNearby({ ...body, limit }, geoapifyKey, searchCenter)
          : Promise.resolve([]),
        searchCenter && tomtomKey
          ? searchTomTomNearby(tomtomKey, { ...body, limit }, searchCenter)
          : Promise.resolve([]),
      ])

    // Merge, dedupe, compute distance
    let merged = dedupe([
      ...geoByNameResults,
      ...tomtomByNameResults,
      ...geoNearbyResults,
      ...tomtomNearbyResults,
    ]).map((row) => ({
      ...row,
      distance_km:
        typeof row.distance_km === 'number'
          ? row.distance_km
          : searchCenter
            ? haversineKm(
                searchCenter.latitude,
                searchCenter.longitude,
                row.latitude || searchCenter.latitude,
                row.longitude || searchCenter.longitude,
              )
            : undefined,
    }))

    // Score-based relevance filter — replaces the previous hard textMatchesQuery filter.
    // Priority: name match (3) > address/city match (2) > partial word match (1) > no match (0).
    // Lenient fallback: if nothing scores above 0 (e.g. city-name query + unfamiliar venue names)
    // we keep the full merged set sorted purely by distance so the user still gets results.
    if (trimmedQuery) {
      const scored = merged.map((row) => ({ row, score: scoreMatch(row, trimmedQuery) }))
      const topResults = scored.filter((x) => x.score >= 2).map((x) => x.row)
      const anyResults = scored.filter((x) => x.score >= 1).map((x) => x.row)

      if (topResults.length >= 1) {
        merged = topResults
      } else if (anyResults.length >= 1) {
        merged = anyResults
      }
      // score === 0 for all: keep full set (pure distance fallback)
    }

    // Open now filter
    // FIX: Only exclude venues explicitly marked closed (open_now === false).
    // Venues with unknown hours (null/undefined) are kept to avoid hiding valid results.
    if (body.open_now) {
      merged = merged.filter((row) => row.open_now !== false)
    }

    merged.sort((left, right) => {
      const leftDist =
        typeof left.distance_km === 'number' ? left.distance_km : Number.MAX_SAFE_INTEGER
      const rightDist =
        typeof right.distance_km === 'number' ? right.distance_km : Number.MAX_SAFE_INTEGER
      if (leftDist !== rightDist) return leftDist - rightDist
      return (right.rating || 0) - (left.rating || 0)
    })

    // Background cache write — must never block the response
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    if (serviceRoleKey && supabaseUrl && merged.length > 0) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/places_cache?on_conflict=provider,external_id`, {
          method: 'POST',
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates',
          },
          body: JSON.stringify(
            merged.map((row) => ({
              provider: row.provider,
              external_id: row.external_id,
              name: row.name,
              category: row.category,
              address: row.address,
              city: row.city,
              postal_code: row.postal_code,
              latitude: row.latitude,
              longitude: row.longitude,
              rating: row.rating,
              image_url: row.image_url,
              metadata: row.metadata || {},
              updated_at: new Date().toISOString(),
            })),
          ),
        })
      } catch {
        // cache write must never block search results
      }
    }

    const results = merged.slice(0, limit)
    return json({
      results,
      _debug: {
        query: trimmedQuery,
        resolvedCenter: searchCenter,
        providerCounts: {
          geoByName: geoByNameResults.length,
          tomtomByName: tomtomByNameResults.length,
          geoNearby: geoNearbyResults.length,
          tomtomNearby: tomtomNearbyResults.length,
        },
        returned: results.length,
      },
    })
  } catch (error) {
    return json({ results: [], error: String(error) }, 500)
  }
})
