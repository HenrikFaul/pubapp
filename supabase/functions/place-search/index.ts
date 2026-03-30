// deno-lint-ignore-file no-explicit-any

declare const Deno: {
  env: {
    get: (name: string) => string | undefined
  }
  serve: (handler: (request: Request) => Response | Promise<Response>) => void
}

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

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
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

async function searchGeoapify(params: SearchBody, apiKey: string) {
  const category = normalizeCategory(params.category)
  const hasCoords = Number.isFinite(Number(params.latitude)) && Number.isFinite(Number(params.longitude))
  const radius = Math.max(1, params.radius_km || 10) * 1000
  const bias = hasCoords ? `&bias=proximity:${params.longitude},${params.latitude}` : ''
  const filter = hasCoords ? `&filter=circle:${params.longitude},${params.latitude},${radius}` : ''
  const query = params.query ? `&text=${encodeURIComponent(params.query)}` : ''
  const url = `https://api.geoapify.com/v2/places?categories=catering.${category}${bias}${filter}${query}&limit=${params.limit || 24}&apiKey=${apiKey}`
  const response = await fetch(url)
  if (!response.ok) return []
  const payload = await response.json()
  return (payload.features || []).map((feature: any) => ({
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
  }))
}

async function searchTomTom(params: SearchBody, apiKey: string) {
  const category = normalizeCategory(params.category)
  const radius = Math.max(1, params.radius_km || 10) * 1000
  const query = params.query ? encodeURIComponent(params.query) : category
  const hasCoords = Number.isFinite(Number(params.latitude)) && Number.isFinite(Number(params.longitude))
  const locationPart = hasCoords ? `lat=${params.latitude}&lon=${params.longitude}&radius=${radius}&` : ''
  const url = `https://api.tomtom.com/search/2/poiSearch/${query}.json?${locationPart}limit=${params.limit || 24}&key=${apiKey}`
  const response = await fetch(url)
  if (!response.ok) return []
  const payload = await response.json()
  return (payload.results || []).map((result: any) => ({
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
  }))
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = (await request.json()) as SearchBody
    const hasCoords = Number.isFinite(Number(body.latitude)) && Number.isFinite(Number(body.longitude))
    const latitude = Number(body.latitude)
    const longitude = Number(body.longitude)

    if (!hasCoords && !body.query) {
      return json({ results: [], error: 'query or coordinates are required' }, 400)
    }

    const limit = Math.min(Math.max(Number(body.limit || 24), 1), 48)
    const geoapifyKey = Deno.env.get('GEOAPIFY_API_KEY') || ''
    const tomtomKey = Deno.env.get('TOMTOM_API_KEY') || ''

    const [geoapifyResults, tomtomResults] = await Promise.all([
      geoapifyKey ? searchGeoapify({ ...body, latitude, longitude, limit }, geoapifyKey) : Promise.resolve([]),
      tomtomKey ? searchTomTom({ ...body, latitude, longitude, limit }, tomtomKey) : Promise.resolve([]),
    ])

    let merged = dedupe([...geoapifyResults, ...tomtomResults]).map((row) => ({
      ...row,
      distance_km: typeof row.distance_km === 'number'
        ? row.distance_km
        : hasCoords
          ? haversineKm(latitude, longitude, row.latitude || latitude, row.longitude || longitude)
          : undefined,
    }))

    if (body.open_now) {
      merged = merged.filter((row) => row.open_now === true || Array.isArray(row.opening_hours_text) === false)
    }

    merged.sort((left, right) => {
      const leftDistance = typeof left.distance_km === 'number' ? left.distance_km : Number.MAX_SAFE_INTEGER
      const rightDistance = typeof right.distance_km === 'number' ? right.distance_km : Number.MAX_SAFE_INTEGER
      if (leftDistance !== rightDistance) return leftDistance - rightDistance
      return (right.rating || 0) - (left.rating || 0)
    })

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
            }))
          ),
        })
      } catch {
        // cache write should not block search results
      }
    }

    return json({ results: merged.slice(0, limit) })
  } catch (error) {
    return json({ results: [], error: String(error) }, 500)
  }
})
