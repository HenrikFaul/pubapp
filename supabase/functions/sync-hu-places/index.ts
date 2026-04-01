// deno-lint-ignore-file no-explicit-any
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const HUNGARY_BBOX = {
  west: 16.1,
  south: 45.7,
  east: 22.95,
  north: 48.62,
}

const TILE_SIZE_LON = 0.8
const TILE_SIZE_LAT = 0.8
const GEO_LIMIT = 500
const TOMTOM_LIMIT = 100
const BATCH_TASKS = 20
const SYNC_KEY = 'hu-venues'
const CYCLE_STALE_HOURS = 24

const GEO_GROUPS = [
  { key: 'catering', categoryGroup: 'restaurant', categories: 'catering.restaurant,catering.cafe,catering.bar,catering.pub' },
  { key: 'entertainment', categoryGroup: 'entertainment', categories: 'entertainment' },
  { key: 'leisure', categoryGroup: 'leisure', categories: 'leisure' },
  { key: 'tourism', categoryGroup: 'tourism', categories: 'tourism' },
] as const

const TOMTOM_GROUPS = [
  { key: 'restaurant', categoryGroup: 'restaurant', query: 'restaurant' },
  { key: 'cafe', categoryGroup: 'cafe', query: 'cafe' },
  { key: 'bar', categoryGroup: 'bar', query: 'bar' },
  { key: 'pub', categoryGroup: 'pub', query: 'pub' },
  { key: 'nightlife', categoryGroup: 'entertainment', query: 'nightlife' },
  { key: 'entertainment', categoryGroup: 'entertainment', query: 'entertainment' },
  { key: 'leisure', categoryGroup: 'leisure', query: 'leisure' },
] as const

const GEO_OFFSETS = [0, 500, 1000, 1500]
const TOMTOM_OFFSETS = [0, 100, 200, 300, 400]

interface Tile {
  id: string
  west: number
  south: number
  east: number
  north: number
}

interface SyncTask {
  id: string
  provider: 'geoapify' | 'tomtom'
  categoryGroup: string
  geoapifyCategories?: string
  tomtomQuery?: string
  tile: Tile
  offset: number
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function buildTiles(): Tile[] {
  const tiles: Tile[] = []
  let row = 0
  for (let south = HUNGARY_BBOX.south; south < HUNGARY_BBOX.north; south += TILE_SIZE_LAT) {
    let col = 0
    for (let west = HUNGARY_BBOX.west; west < HUNGARY_BBOX.east; west += TILE_SIZE_LON) {
      tiles.push({
        id: `hu-${row}-${col}`,
        west,
        south,
        east: Math.min(HUNGARY_BBOX.east, west + TILE_SIZE_LON),
        north: Math.min(HUNGARY_BBOX.north, south + TILE_SIZE_LAT),
      })
      col += 1
    }
    row += 1
  }
  return tiles
}

function buildTasks(): SyncTask[] {
  const tiles = buildTiles()
  const tasks: SyncTask[] = []
  for (const tile of tiles) {
    for (const group of GEO_GROUPS) {
      for (const offset of GEO_OFFSETS) {
        tasks.push({
          id: `geo-${group.key}-${tile.id}-${offset}`,
          provider: 'geoapify',
          categoryGroup: group.categoryGroup,
          geoapifyCategories: group.categories,
          tile,
          offset,
        })
      }
    }
    for (const group of TOMTOM_GROUPS) {
      for (const offset of TOMTOM_OFFSETS) {
        tasks.push({
          id: `tt-${group.key}-${tile.id}-${offset}`,
          provider: 'tomtom',
          categoryGroup: group.categoryGroup,
          tomtomQuery: group.query,
          tile,
          offset,
        })
      }
    }
  }
  return tasks
}

function mapGeoCategory(categories: string[] | undefined, fallback: string) {
  const joined = (categories || []).join(' ').toLowerCase()
  if (joined.includes('catering.restaurant')) return 'restaurant'
  if (joined.includes('catering.cafe')) return 'cafe'
  if (joined.includes('catering.pub')) return 'pub'
  if (joined.includes('catering.bar')) return 'bar'
  return fallback
}

function normalizeGeoapifyRow(feature: any, fallbackGroup: string) {
  const categories = Array.isArray(feature?.properties?.categories) ? feature.properties.categories : []
  return {
    provider: 'geoapify',
    external_id: String(feature?.properties?.place_id || ''),
    name: String(feature?.properties?.name || feature?.properties?.address_line1 || 'Helyszín'),
    category_group: mapGeoCategory(categories, fallbackGroup),
    categories,
    address: feature?.properties?.formatted || null,
    city: feature?.properties?.city || null,
    postal_code: feature?.properties?.postcode || null,
    country_code: String(feature?.properties?.country_code || 'HU').toUpperCase(),
    latitude: typeof feature?.properties?.lat === 'number' ? feature.properties.lat : null,
    longitude: typeof feature?.properties?.lon === 'number' ? feature.properties.lon : null,
    open_now: typeof feature?.properties?.opening_hours?.open_now === 'boolean' ? feature.properties.opening_hours.open_now : null,
    rating: typeof feature?.properties?.datasource?.raw?.rating === 'number' ? feature.properties.datasource.raw.rating : null,
    review_count: typeof feature?.properties?.datasource?.raw?.reviews === 'number' ? feature.properties.datasource.raw.reviews : null,
    image_url: feature?.properties?.datasource?.raw?.image || null,
    phone: feature?.properties?.contact?.phone || null,
    website: feature?.properties?.website || null,
    opening_hours_text: Array.isArray(feature?.properties?.opening_hours?.text) ? feature.properties.opening_hours.text : [],
    metadata: feature?.properties || {},
    synced_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
  }
}

function normalizeTomTomRow(result: any, fallbackGroup: string) {
  return {
    provider: 'tomtom',
    external_id: String(result?.id || ''),
    name: String(result?.poi?.name || 'Helyszín'),
    category_group: fallbackGroup,
    categories: Array.isArray(result?.poi?.categories) ? result.poi.categories : [],
    address: result?.address?.freeformAddress || null,
    city: result?.address?.municipality || null,
    postal_code: result?.address?.postalCode || null,
    country_code: String(result?.address?.countryCode || 'HU').toUpperCase(),
    latitude: typeof result?.position?.lat === 'number' ? result.position.lat : null,
    longitude: typeof result?.position?.lon === 'number' ? result.position.lon : null,
    open_now: null,
    rating: null,
    review_count: null,
    image_url: null,
    phone: result?.poi?.phone || null,
    website: result?.poi?.url || null,
    opening_hours_text: Array.isArray(result?.poi?.openingHours?.timeRanges) ? result.poi.openingHours.timeRanges.map((r: any) => JSON.stringify(r)) : [],
    metadata: result || {},
    synced_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
  }
}

async function restFetch(url: string, init: RequestInit = {}) {
  const response = await fetch(url, init)
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`${response.status} ${response.statusText}: ${text}`)
  }
  return response
}

async function fetchState(supabaseUrl: string, serviceRoleKey: string) {
  const response = await restFetch(`${supabaseUrl}/rest/v1/place_sync_state?key=eq.${SYNC_KEY}&select=*`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  })
  const data = await response.json()
  return Array.isArray(data) && data[0] ? data[0] : null
}

async function updateState(supabaseUrl: string, serviceRoleKey: string, patch: Record<string, unknown>) {
  await restFetch(`${supabaseUrl}/rest/v1/place_sync_state?key=eq.${SYNC_KEY}`, {
    method: 'PATCH',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patch),
  })
}

async function upsertRows(supabaseUrl: string, serviceRoleKey: string, rows: any[]) {
  if (rows.length === 0) return
  await restFetch(`${supabaseUrl}/rest/v1/places_hu_catalog?on_conflict=provider,external_id`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  })
}

async function fetchGeoapifyTask(task: SyncTask, apiKey: string) {
  const filter = `rect:${task.tile.west},${task.tile.south},${task.tile.east},${task.tile.north}`
  const url = `https://api.geoapify.com/v2/places?categories=${encodeURIComponent(task.geoapifyCategories || '')}&filter=${encodeURIComponent(filter)}&limit=${GEO_LIMIT}&offset=${task.offset}&apiKey=${apiKey}`
  const response = await fetch(url)
  if (!response.ok) return []
  const payload = await response.json()
  return (payload.features || [])
    .map((feature: any) => normalizeGeoapifyRow(feature, task.categoryGroup))
    .filter((row: any) => row.external_id && row.country_code === 'HU')
}

async function fetchTomTomTask(task: SyncTask, apiKey: string) {
  const topLeft = `${task.tile.north},${task.tile.west}`
  const btmRight = `${task.tile.south},${task.tile.east}`
  const url = `https://api.tomtom.com/search/2/categorySearch/${encodeURIComponent(task.tomtomQuery || '')}.json?topLeft=${encodeURIComponent(topLeft)}&btmRight=${encodeURIComponent(btmRight)}&countrySet=HU&limit=${TOMTOM_LIMIT}&ofs=${task.offset}&openingHours=nextSevenDays&key=${apiKey}`
  const response = await fetch(url)
  if (!response.ok) return []
  const payload = await response.json()
  return (payload.results || [])
    .map((result: any) => normalizeTomTomRow(result, task.categoryGroup))
    .filter((row: any) => row.external_id && row.country_code === 'HU')
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const geoapifyKey = Deno.env.get('GEOAPIFY_API_KEY') || ''
  const tomtomKey = Deno.env.get('TOMTOM_API_KEY') || ''

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Missing Supabase service env' }, 500)
  }

  try {
    const body = await request.json().catch(() => ({})) as { batch_size?: number; reason?: string }
    const tasks = buildTasks()
    const now = new Date().toISOString()
    let state = await fetchState(supabaseUrl, serviceRoleKey)

    if (!state) {
      await upsertRows(supabaseUrl, serviceRoleKey, [])
      await restFetch(`${supabaseUrl}/rest/v1/place_sync_state`, {
        method: 'POST',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{ key: SYNC_KEY, cursor: 0, task_count: tasks.length, status: 'idle', last_cycle_started_at: now }]),
      })
      state = { key: SYNC_KEY, cursor: 0, task_count: tasks.length, status: 'idle', last_cycle_started_at: now }
    }

    let cursor = Number(state.cursor || 0)
    const lastCycleCompletedAt = state.last_cycle_completed_at ? new Date(state.last_cycle_completed_at).getTime() : 0
    if (!lastCycleCompletedAt || Date.now() - lastCycleCompletedAt > CYCLE_STALE_HOURS * 3600 * 1000) {
      if (cursor >= tasks.length) cursor = 0
    }

    await updateState(supabaseUrl, serviceRoleKey, {
      status: 'running',
      task_count: tasks.length,
      last_run_started_at: now,
      last_error: null,
      last_cycle_started_at: state.last_cycle_started_at || now,
    })

    const batchSize = Math.max(1, Math.min(Number(body.batch_size || BATCH_TASKS), 50))
    const processedTasks: string[] = []
    let inserted = 0

    for (let i = 0; i < batchSize; i += 1) {
      if (cursor >= tasks.length) {
        cursor = 0
        await updateState(supabaseUrl, serviceRoleKey, { last_cycle_completed_at: new Date().toISOString(), last_cycle_started_at: new Date().toISOString() })
      }

      const task = tasks[cursor]
      cursor += 1
      processedTasks.push(task.id)

      let rows: any[] = []
      if (task.provider === 'geoapify' && geoapifyKey) {
        rows = await fetchGeoapifyTask(task, geoapifyKey)
      }
      if (task.provider === 'tomtom' && tomtomKey) {
        rows = await fetchTomTomTask(task, tomtomKey)
      }

      if (rows.length > 0) {
        inserted += rows.length
        await upsertRows(supabaseUrl, serviceRoleKey, rows)
      }
    }

    await updateState(supabaseUrl, serviceRoleKey, {
      cursor,
      task_count: tasks.length,
      status: 'idle',
      last_run_completed_at: new Date().toISOString(),
    })

    return json({
      ok: true,
      processedTasks,
      inserted,
      cursor,
      remaining: Math.max(0, tasks.length - cursor),
      taskCount: tasks.length,
      reason: body.reason || 'manual',
    })
  } catch (error) {
    try {
      await updateState(supabaseUrl, serviceRoleKey, {
        status: 'error',
        last_error: String(error),
        last_run_completed_at: new Date().toISOString(),
      })
    } catch {
      // ignore secondary update failures
    }
    return json({ ok: false, error: String(error) }, 500)
  }
})
