'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import {
  copyText,
  formatDistanceKm,
  formatPrice,
  getDistanceKm,
  isOpenNow,
  STATUS_BADGE,
  STATUS_LABELS,
  timeAgo,
} from '@/lib/utils'
import { searchPlaces, type ExternalPlace } from '@/lib/place-search'
import PlaceAutocomplete from '@/components/PlaceAutocomplete'
import {
  AlertCircle,
  Bell,
  Calendar,
  Check,
  ChevronRight,
  ClipboardList,
  Clock,
  Filter,
  Info,
  LayoutDashboard,
  MapPin,
  Search,
  Send,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  User,
  Users,
  X,
} from 'lucide-react'
import type { Friendship, PlaceFavorite, Profile, SharedPlaceList, Venue } from '@/types'

type Tab = 'home' | 'discover' | 'social' | 'orders' | 'profile'
type PlaceCategory = 'pub' | 'bar' | 'restaurant' | 'cafe'

interface DisplayPlace {
  id: string
  source: 'local' | 'external'
  provider: string
  name: string
  category: string
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
  description?: string
  open_now?: boolean
  tags?: string[]
  opening_hours_text?: string[]
  venue_id?: string
  metadata?: Record<string, unknown>
}



interface CheckedInContext {
  venueId: string
  venueName: string
  tableNumber?: string
}
const CATEGORY_OPTIONS: Array<{ value: PlaceCategory; label: string }> = [
  { value: 'pub', label: 'Pub' },
  { value: 'bar', label: 'Bár' },
  { value: 'restaurant', label: 'Étterem' },
  { value: 'cafe', label: 'Kávézó' },
]

function placeCategoryLabel(value: string | undefined) {
  if (!value) return 'Helyszín'
  if (value === 'pub') return 'Pub'
  if (value === 'bar') return 'Bár'
  if (value === 'restaurant') return 'Étterem'
  if (value === 'cafe') return 'Kávézó'
  return value
}

function normalizeLocalVenue(venue: Venue, latitude?: number, longitude?: number): DisplayPlace {
  const inferredCategory: PlaceCategory = venue.has_kitchen ? 'restaurant' : venue.has_table_service ? 'pub' : 'bar'
  const distance =
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    typeof venue.latitude === 'number' &&
    typeof venue.longitude === 'number'
      ? getDistanceKm(latitude, longitude, venue.latitude, venue.longitude)
      : undefined

  return {
    id: venue.id,
    source: 'local',
    provider: 'kapakka',
    venue_id: venue.id,
    name: venue.name,
    category: inferredCategory,
    address: venue.address,
    city: venue.city,
    postal_code: venue.postal_code,
    latitude: venue.latitude,
    longitude: venue.longitude,
    distance_km: distance,
    rating: venue.rating,
    review_count: venue.review_count,
    image_url: venue.cover_url || venue.logo_url,
    phone: venue.phone,
    website: venue.website,
    description: venue.description,
    open_now: isOpenNow(venue.opening_hours),
    tags: [
      venue.has_reservations ? 'Foglalható' : '',
      venue.has_table_service ? 'Asztali rendelés' : '',
      venue.has_loyalty_program ? 'Hűségprogram' : '',
    ].filter(Boolean),
  }
}

function normalizeExternalDisplay(place: ExternalPlace): DisplayPlace {
  return {
    id: `${place.provider}-${place.external_id}`,
    source: 'external',
    provider: place.provider,
    name: place.name,
    category: place.category || 'place',
    address: place.address,
    city: place.city,
    postal_code: place.postal_code,
    latitude: place.latitude,
    longitude: place.longitude,
    distance_km: place.distance_km,
    rating: place.rating,
    review_count: place.review_count,
    image_url: place.image_url,
    phone: place.phone,
    website: place.website,
    description: place.description,
    open_now: place.open_now,
    tags: place.tags,
    opening_hours_text: place.opening_hours_text,
    metadata: place.metadata,
  }
}

function favoriteMatches(favorite: PlaceFavorite, place: DisplayPlace) {
  if (place.source === 'local') return favorite.venue_id === place.venue_id
  return favorite.external_place_id === place.id && favorite.provider === place.provider
}

function sortPlaces(a: DisplayPlace, b: DisplayPlace) {
  const distanceA = typeof a.distance_km === 'number' ? a.distance_km : Number.MAX_SAFE_INTEGER
  const distanceB = typeof b.distance_km === 'number' ? b.distance_km : Number.MAX_SAFE_INTEGER
  if (distanceA !== distanceB) return distanceA - distanceB
  const ratingA = typeof a.rating === 'number' ? a.rating : -1
  const ratingB = typeof b.rating === 'number' ? b.rating : -1
  return ratingB - ratingA
}

export default function CustomerPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('home')
  const [loading, setLoading] = useState(true)
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [venues, setVenues] = useState<Venue[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [favorites, setFavorites] = useState<PlaceFavorite[]>([])
  const [friendships, setFriendships] = useState<Friendship[]>([])
  const [lists, setLists] = useState<SharedPlaceList[]>([])
  const [discoverPlaces, setDiscoverPlaces] = useState<DisplayPlace[]>([])
  const [selectedPlace, setSelectedPlace] = useState<DisplayPlace | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<PlaceCategory>('pub')
  const [onlyOpenNow, setOnlyOpenNow] = useState(false)
  const [radiusKm, setRadiusKm] = useState(10)
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationStatus, setLocationStatus] = useState('Kapcsold be a helymeghatározást, és távolság szerint rendezzük a helyeket.')
  const [friendInviteEmail, setFriendInviteEmail] = useState('')
  const [newListTitle, setNewListTitle] = useState('')
  const [listCollaboratorId, setListCollaboratorId] = useState('')
  const [checkedInContext, setCheckedInContext] = useState<CheckedInContext | null>(null)

  const acceptedFriends = useMemo(
    () => friendships.filter((row) => row.status === 'accepted'),
    [friendships]
  )
  const pendingInvites = useMemo(
    () => friendships.filter((row) => row.status === 'pending' && row.addressee_id === profile?.id),
    [friendships, profile?.id]
  )
  const favoriteCount = favorites.length
  const liveOrder = orders.find((order) => ['pending', 'accepted', 'preparing', 'ready'].includes(order.status))


  const requestLocation = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationStatus('A böngésző nem támogatja a helyzetmeghatározást.')
      return null
    }

    return new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (geo) => {
          const coords = {
            latitude: geo.coords.latitude,
            longitude: geo.coords.longitude,
          }
          setPosition(coords)
          setLocationStatus('A lista a jelenlegi helyedhez képest távolság szerint rendezett.')
          resolve(coords)
        },
        () => {
          setLocationStatus('A távolságszűréshez engedélyezned kell a helyzet-hozzáférést.')
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 8000 }
      )
    })
  }, [])

  const loadFriends = useCallback(async (userId: string) => {
    const [{ data: sent, error: sentError }, { data: received, error: receivedError }] = await Promise.all([
      supabase.from('friendships').select('*').eq('requester_id', userId).order('created_at', { ascending: false }),
      supabase.from('friendships').select('*').eq('addressee_id', userId).order('created_at', { ascending: false }),
    ])

    if (sentError || receivedError) {
      setFriendships([])
      return
    }

    const merged = [...(sent || []), ...(received || [])]
    const otherIds = Array.from(
      new Set(merged.map((row: any) => (row.requester_id === userId ? row.addressee_id : row.requester_id)).filter(Boolean))
    )

    let profilesById: Record<string, Profile> = {}
    if (otherIds.length > 0) {
      const { data: profileRows } = await supabase.from('profiles').select('*').in('id', otherIds)
      profilesById = Object.fromEntries(((profileRows || []) as Profile[]).map((row) => [row.id, row]))
    }

    setFriendships(
      merged.map((row: any) => ({
        ...row,
        requester: profilesById[row.requester_id],
        addressee: profilesById[row.addressee_id],
      })) as Friendship[]
    )
  }, [])

  const loadSharedLists = useCallback(async (userId: string) => {
    const [{ data: ownedLists, error: ownedError }, { data: memberships, error: memberError }] = await Promise.all([
      supabase.from('place_lists').select('*').eq('owner_id', userId).order('created_at', { ascending: false }),
      supabase.from('place_list_members').select('*').eq('user_id', userId),
    ])

    if (ownedError || memberError) {
      setLists([])
      return
    }

    const membershipIds = (memberships || []).map((row: any) => row.list_id)
    let extraLists: any[] = []
    if (membershipIds.length > 0) {
      const { data } = await supabase.from('place_lists').select('*').in('id', membershipIds)
      extraLists = data || []
    }

    const map = new Map<string, SharedPlaceList>()
    ;[...(ownedLists || []), ...extraLists].forEach((list: any) => map.set(list.id, list as SharedPlaceList))
    setLists(Array.from(map.values()))
  }, [])

  const init = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.replace('/')
      return
    }

    const { data: profileRow } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile((profileRow || null) as Profile | null)

    if (profileRow && ['admin', 'staff', 'superadmin'].includes(profileRow.role)) {
      setIsAdmin(true)
    }

    const [{ data: venueRows }, { data: orderRows }, { data: favoriteRows, error: favoriteError }] = await Promise.all([
      supabase.from('venues').select('*').eq('is_active', true).order('rating', { ascending: false }),
      supabase
        .from('orders')
        .select('*, venue:venues(name)')
        .eq('customer_id', user.id)
        .order('placed_at', { ascending: false })
        .limit(20),
      supabase.from('place_favorites').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ])

    setVenues((venueRows || []) as Venue[])
    setOrders(orderRows || [])
    setFavorites(favoriteError ? [] : ((favoriteRows || []) as PlaceFavorite[]))

    await Promise.all([loadFriends(user.id), loadSharedLists(user.id)])
    setLoading(false)
  }, [loadFriends, loadSharedLists, router])

  useEffect(() => {
    init()
  }, [init])


  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem('kapakka_checked_in_context')
      if (!raw) return
      const parsed = JSON.parse(raw) as CheckedInContext
      if (parsed?.venueId && parsed?.venueName) {
        setCheckedInContext(parsed)
      }
    } catch {
      // ignore malformed local context
    }
  }, [])

  const runDiscover = useCallback(
    async (explicitQuery?: string) => {
      setDiscoverLoading(true)
      const nextQuery = explicitQuery ?? query
      const coords = position || (await requestLocation())

      const localMatches = venues
        .map((venue) => normalizeLocalVenue(venue, coords?.latitude, coords?.longitude))
        .filter((place) => {
          if (category && place.category !== category) return false
          if (onlyOpenNow && place.open_now === false) return false
          if (typeof place.distance_km === 'number' && place.distance_km > radiusKm) return false
          if (nextQuery) {
            const haystack = `${place.name} ${place.address || ''} ${place.city || ''}`.toLowerCase()
            return haystack.includes(nextQuery.toLowerCase())
          }
          return true
        })

      const externalResults = await searchPlaces({
        query: nextQuery,
        category,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        radiusKm,
        openNow: onlyOpenNow,
        limit: 24,
      })

      const externalMatches = externalResults.map((item) => normalizeExternalDisplay(item))
      const deduped = new Map<string, DisplayPlace>()
      ;[...localMatches, ...externalMatches].forEach((place) => {
        const key = `${place.name.toLowerCase()}|${place.address?.toLowerCase() || ''}`
        if (!deduped.has(key) || place.source === 'local') deduped.set(key, place)
      })

      const merged = Array.from(deduped.values()).sort(sortPlaces)
      setDiscoverPlaces(merged)
      if (merged.length > 0) {
        setSelectedPlace((current) => {
          if (!current) return merged[0]
          const stillVisible = merged.find((place) => place.id === current.id)
          return stillVisible || merged[0]
        })
      } else {
        setSelectedPlace(null)
      }
      if (merged.length === 0) {
        toast('Nem találtam helyet ezekkel a szűrőkkel.')
      }
      setDiscoverLoading(false)
    },
    [category, onlyOpenNow, position, query, radiusKm, requestLocation, selectedPlace, venues]
  )

  useEffect(() => {
    if (!loading && tab === 'discover') {
      runDiscover().catch(() => {
        setDiscoverLoading(false)
      })
    }
  }, [loading, runDiscover, tab])

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/')
  }

  async function toggleFavorite(place: DisplayPlace) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.id) return

    const existing = favorites.find((favorite) => favoriteMatches(favorite, place))
    if (existing) {
      const { error } = await supabase.from('place_favorites').delete().eq('id', existing.id).eq('user_id', user.id)
      if (error) {
        toast.error('A kedvencek frissítése nem sikerült.')
        return
      }
      setFavorites((prev) => prev.filter((favorite) => favorite.id !== existing.id))
      toast.success('Eltávolítva a kedvencek közül.')
      return
    }

    const payload = {
      user_id: user.id,
      venue_id: place.venue_id || null,
      external_place_id: place.source === 'external' ? place.id : null,
      provider: place.provider,
      name: place.name,
      category: placeCategoryLabel(place.category),
      address: place.address,
      image_url: place.image_url,
      rating: place.rating,
      metadata: place.metadata || null,
    }

    const { data, error } = await supabase.from('place_favorites').insert(payload).select().single()
    if (error || !data) {
      toast.error('A kedvenc mentése nem sikerült.')
      return
    }
    setFavorites((prev) => [data as PlaceFavorite, ...prev])
    toast.success('Mentve a kedvencekhez.')
  }

  async function sharePlace(place: DisplayPlace) {
    const link = place.venue_id ? `${window.location.origin}/customer/pub/${place.venue_id}` : `${window.location.origin}/customer`
    const message = `${place.name}${place.address ? ` — ${place.address}` : ''}\n${link}`

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: place.name,
          text: `${place.name} — nézd meg ezt a helyet!`,
          url: link,
        })
        return
      } catch {
        // fallback below
      }
    }

    const ok = await copyText(message)
    if (ok) {
      toast.success('A hely linkje vágólapra került.')
    }
  }

  async function inviteFriend() {
    const email = friendInviteEmail.trim().toLowerCase()
    if (!profile?.id || !email) return

    const { data: friendProfile } = await supabase.from('profiles').select('*').eq('email', email).maybeSingle()
    if (!friendProfile?.id) {
      toast.error('Ehhez az emailhez nem találtam Kapakka fiókot.')
      return
    }
    if (friendProfile.id === profile.id) {
      toast.error('Saját magadnak nem küldhetsz meghívót.')
      return
    }

    const { data, error } = await supabase
      .from('friendships')
      .insert({
        requester_id: profile.id,
        addressee_id: friendProfile.id,
        status: 'pending',
      })
      .select()
      .single()

    if (error || !data) {
      toast.error('A barátmeghívó elküldése nem sikerült.')
      return
    }

    setFriendInviteEmail('')
    await loadFriends(profile.id)
    toast.success('Barátmeghívó elküldve.')
  }

  async function respondToInvite(inviteId: string, nextStatus: 'accepted' | 'declined') {
    if (!profile?.id) return
    const { error } = await supabase.from('friendships').update({ status: nextStatus }).eq('id', inviteId)
    if (error) {
      toast.error('A meghívó frissítése nem sikerült.')
      return
    }
    await loadFriends(profile.id)
    toast.success(nextStatus === 'accepted' ? 'Barát hozzáadva.' : 'Meghívó elutasítva.')
  }

  async function createSharedList() {
    const title = newListTitle.trim()
    if (!profile?.id || !title) {
      toast.error('Adj címet a közös listának.')
      return
    }

    const { data: listRow, error } = await supabase
      .from('place_lists')
      .insert({
        owner_id: profile.id,
        title,
        description: 'Közös esti helylista',
        is_public: false,
      })
      .select()
      .single()

    if (error || !listRow) {
      toast.error('A közös lista létrehozása nem sikerült.')
      return
    }

    if (listCollaboratorId) {
      await supabase.from('place_list_members').insert({
        list_id: listRow.id,
        user_id: listCollaboratorId,
        role: 'editor',
      })
    }

    setNewListTitle('')
    setListCollaboratorId('')
    await loadSharedLists(profile.id)
    toast.success('Közös lista létrehozva.')
  }

  async function addPlaceToList(listId: string, place: DisplayPlace) {
    const { error } = await supabase.from('place_list_items').insert({
      list_id: listId,
      venue_id: place.venue_id || null,
      external_place_id: place.source === 'external' ? place.id : null,
      provider: place.provider,
      name: place.name,
      category: placeCategoryLabel(place.category),
      address: place.address,
      image_url: place.image_url,
      metadata: place.metadata || null,
    })

    if (error) {
      toast.error('Nem sikerült hozzáadni a helyet a listához.')
      return
    }

    toast.success('A hely felkerült a közös listára.')
  }

  const navItems = [
    { id: 'home' as Tab, label: 'Főoldal', icon: <LayoutDashboard className="h-5 w-5" /> },
    { id: 'discover' as Tab, label: 'Helyek', icon: <Store className="h-5 w-5" /> },
    { id: 'social' as Tab, label: 'Barátok', icon: <Users className="h-5 w-5" /> },
    { id: 'orders' as Tab, label: 'Rendelések', icon: <ClipboardList className="h-5 w-5" /> },
    { id: 'profile' as Tab, label: 'Profil', icon: <User className="h-5 w-5" /> },
  ]

  const homeCards = [
    {
      title: 'Közelben lévő helyek',
      description: 'TomTom + Geoapify discovery kategóriával, nyitvatartással és távolságszűrővel.',
      action: () => setTab('discover'),
    },
    {
      title: 'Közös esti lista',
      description: 'Mentsetek közös kedvenceket és hívjátok át a társaságot egy koppintással.',
      action: () => setTab('social'),
    },
  ]

  const activeVenueCards = checkedInContext
    ? [
        {
          title: 'Digitális étlap megnyitása',
          description: `${checkedInContext.venueName}${checkedInContext.tableNumber ? ` · Asztal ${checkedInContext.tableNumber}` : ''} — nyisd meg a venue menüjét és rendelj onnan.`,
          action: () => router.push(`/customer/pub/${checkedInContext.venueId}${checkedInContext.tableNumber ? `?table=${checkedInContext.tableNumber}` : ''}`),
        },
        {
          title: 'Asztali vagy pultos rendelés',
          description: 'Digitális étlap, QR belépés és élő státuszkövetés a becsekkolt venue-ra.',
          action: () => router.push(`/customer/pub/${checkedInContext.venueId}${checkedInContext.tableNumber ? `?table=${checkedInContext.tableNumber}` : ''}`),
        },
      ]
    : []


  const selectedIsFavorite = selectedPlace
    ? favorites.some((favorite) => favoriteMatches(favorite, selectedPlace))
    : false

  const discoverSummary = useMemo(() => {
    if (discoverPlaces.length === 0) return 'Még nincs találat.'
    const openCount = discoverPlaces.filter((place) => place.open_now).length
    return `${discoverPlaces.length} találat · ${openCount} most nyitva`
  }, [discoverPlaces])

  const HomeContent = () => (
    <div className="space-y-6 lg:space-y-8">
      <section className="hero-card p-5 sm:p-7">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <div className="section-kicker mb-4">
              <Sparkles className="h-4 w-4" />
              cool, social, order-first élmény
            </div>
            <h1 className="section-title">Találj helyet gyorsabban, rendelj könnyebben, hívd át a társaságot egyből.</h1>
            <p className="section-subtitle mt-4 max-w-2xl">
              A Kapakka most még fiatalosabb, még vizuálisabb, és ugyanazzal a funkciókészlettel sokkal élőbb mobilos és webes élményt ad.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="metric-card p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-white/30">Aktív helyek</p>
                <p className="mt-2 text-3xl font-black text-white">{venues.length}</p>
              </div>
              <div className="metric-card p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-white/30">Kedvencek</p>
                <p className="mt-2 text-3xl font-black text-white">{favoriteCount}</p>
              </div>
              <div className="metric-card p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-white/30">Pontok</p>
                <p className="mt-2 text-3xl font-black text-white">{profile?.loyalty_points || 0}</p>
              </div>
            </div>
          </div>

          <div className="modern-card p-4 sm:p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-white/30">Express venue search</p>
            <div className="mt-3">
              <PlaceAutocomplete
                placeholder="Hely vagy cím gyors keresése…"
                category={category}
                openNow={onlyOpenNow}
                radiusKm={radiusKm}
                latitude={position?.latitude}
                longitude={position?.longitude}
                value={query}
                onChange={setQuery}
                onSubmit={(searchQuery) => {
                  setTab('discover')
                  void runDiscover(searchQuery)
                }}
                onSelect={(place) => {
                  const normalized = normalizeExternalDisplay(place)
                  setQuery(place.name)
                  setSelectedPlace(normalized)
                  setTab('discover')
                }}
              />
            </div>
            <p className="mt-3 text-sm text-white/50">Geoapify primary és TomTom fallback összevont helylistával.</p>
            {liveOrder ? (
              <div className="mt-4 rounded-[22px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-white/30">Aktív rendelés</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{liveOrder.order_number}</p>
                    <p className="mt-1 text-sm text-white/50">{liveOrder.venue?.name || 'Kapakka venue'} · {timeAgo(liveOrder.placed_at)}</p>
                  </div>
                  <span className={`badge ${STATUS_BADGE[liveOrder.status] || 'badge-done'}`}>{STATUS_LABELS[liveOrder.status]}</span>
                </div>
                <button onClick={() => setTab('orders')} className="btn-outline mt-4 w-full">
                  Élő követés
                </button>
              </div>
            ) : (
              <div className="mt-4 rounded-[22px] border border-white/10 bg-white/5 p-4 text-sm text-white/50">
                Ha leadsz rendelést, a Kapakka automatikus státuszjelzésekkel figyelmeztet, amikor feldolgozás alá kerül és amikor átvehető.
              </div>
            )}
          </div>
        </div>
      </section>

      {checkedInContext && (
        <section className="feature-card p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="section-kicker mb-3">
                <ShoppingBag className="h-4 w-4" />
                aktív venue kontextus
              </div>
              <h3 className="text-2xl font-bold text-white">Jelenleg itt vagy becsekkolva: {checkedInContext.venueName}</h3>
              <p className="mt-2 text-sm text-white/55">
                {checkedInContext.tableNumber ? `Asztal ${checkedInContext.tableNumber} · ` : ''}a gyors étlap- és rendeléscsempék csak aktív venue kontextusnál jelennek meg.
              </p>
            </div>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.localStorage.removeItem('kapakka_checked_in_context')
                }
                setCheckedInContext(null)
              }}
              className="btn-outline w-auto px-5"
            >
              Aktív venue törlése
            </button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {activeVenueCards.map((item) => (
              <button key={item.title} onClick={item.action} className="quick-action-card p-5 text-left">
                <div className="mb-4 inline-flex rounded-2xl border border-white/10 bg-white/10 p-3 text-white">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-sm text-white/50">{item.description}</p>
                  </div>
                  <ChevronRight className="mt-0.5 h-5 w-5 flex-shrink-0 text-white/30" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white">Most ezt érdemes csinálni</h3>
            <p className="mt-1 text-sm text-white/50">Minden fontos vendégművelet egyből kézre áll.</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {homeCards.map((item) => (
            <button key={item.title} onClick={item.action} className="quick-action-card p-5 text-left">
              <div className="mb-4 inline-flex rounded-2xl border border-white/10 bg-white/10 p-3 text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-sm text-white/50">{item.description}</p>
                </div>
                <ChevronRight className="mt-0.5 h-5 w-5 flex-shrink-0 text-white/30" />
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="feature-card p-5">
          <div className="flex items-center gap-3 text-white">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3 text-[var(--accent)]">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Venue explorer</p>
              <p className="text-sm text-white/50">Szűrők: kategória, most nyitva, távolság, rendezés helyzet alapján.</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="filter-chip active">{CATEGORY_OPTIONS.find((item) => item.value === category)?.label}</span>
            <span className={`filter-chip ${onlyOpenNow ? 'active' : ''}`}>Csak most nyitva</span>
            <span className="filter-chip">{radiusKm} km</span>
          </div>
          <button onClick={() => setTab('discover')} className="btn-kapakka mt-5">
            Venue finder megnyitása
          </button>
        </div>

        <div className="feature-card p-5">
          <div className="flex items-center gap-3 text-white">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3 text-[var(--accent)]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Közösségi esték</p>
              <p className="text-sm text-white/50">Barátmeghívás, kedvencek és közös helylisták szervezéshez.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/30">Elfogadott barátok</p>
              <p className="mt-2 text-3xl font-black text-white">{acceptedFriends.length}</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/30">Közös listák</p>
              <p className="mt-2 text-3xl font-black text-white">{lists.length}</p>
            </div>
          </div>
          <button onClick={() => setTab('social')} className="btn-outline mt-5">
            Social funkciók
          </button>
        </div>
      </section>
    </div>
  )

  const DiscoverContent = () => (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <div className="discovery-panel flex-1 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="section-kicker mb-3">
                <Search className="h-4 w-4" />
                venue finder
              </div>
              <h2 className="text-3xl font-bold text-white lg:text-4xl">Kocsma / bár / étterem kereső a közeledben</h2>
              <p className="mt-3 max-w-3xl text-sm text-white/55">
                Kategória alapú discovery, open now szűrés, távolságrendezés és részletes helyprofil egy oldalon.
              </p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/55">{discoverSummary}</div>
          </div>

          <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.8fr))]">
            <div className="rounded-[22px] border border-white/10 bg-white/5 p-3">
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                <Search className="h-4 w-4" />
                Keresés
              </label>
              <PlaceAutocomplete
                placeholder="Név vagy cím alapján…"
                category={category}
                openNow={onlyOpenNow}
                radiusKm={radiusKm}
                latitude={position?.latitude}
                longitude={position?.longitude}
                value={query}
                onChange={setQuery}
                onSubmit={(searchQuery) => {
                  void runDiscover(searchQuery)
                }}
                onSelect={(place) => {
                  const normalized = normalizeExternalDisplay(place)
                  setQuery(place.name)
                  setSelectedPlace(normalized)
                  setDiscoverPlaces((prev) => {
                    const existing = prev.find((row) => row.id === normalized.id)
                    if (existing) return prev
                    return [normalized, ...prev].sort(sortPlaces)
                  })
                }}
              />
            </div>

            <div className="rounded-[22px] border border-white/10 bg-white/5 p-3">
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                <Filter className="h-4 w-4" />
                Kategória
              </label>
              <select value={category} onChange={(event) => setCategory(event.target.value as PlaceCategory)} className="kap-input">
                {CATEGORY_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-white/5 p-3">
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                <Clock className="h-4 w-4" />
                Nyitvatartás
              </label>
              <button onClick={() => setOnlyOpenNow((prev) => !prev)} className={`btn-outline ${onlyOpenNow ? 'border-amber-500/30 text-amber-300' : ''}`}>
                {onlyOpenNow ? 'Csak nyitva most' : 'Minden venue'}
              </button>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-white/5 p-3">
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                <MapPin className="h-4 w-4" />
                Távolság
              </label>
              <div className="flex items-center gap-3">
                <input type="range" min={1} max={50} value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))} className="w-full accent-[var(--accent)]" />
                <span className="text-sm font-semibold text-white">{radiusKm} km</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button onClick={() => void runDiscover()} className="btn-kapakka w-auto px-5">
              <Search className="h-4 w-4" />
              Keresés frissítése
            </button>
            <button onClick={() => void requestLocation()} className="btn-outline w-auto px-5">
              <MapPin className="h-4 w-4" />
              Helyzet frissítése
            </button>
            <span className="text-sm text-white/45">{locationStatus}</span>
          </div>
          <p className="text-sm text-white/35">A kereső a beírt nevet vagy címet is felhasználja, és a Kapakka venue-khez külön étlap gombot is mutat.</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(340px,0.75fr)]">
        <section className="space-y-3">
          {discoverLoading ? (
            <div className="place-card p-6 text-center text-white/55">Venue keresés folyamatban…</div>
          ) : discoverPlaces.length === 0 ? (
            <div className="place-card p-6 text-center text-white/55">Nincs találat a jelenlegi szűrőkkel.</div>
          ) : (
            discoverPlaces.map((place) => {
              const favorite = favorites.some((row) => favoriteMatches(row, place))
              return (
                <button key={place.id} onClick={() => setSelectedPlace(place)} className={`place-card w-full p-4 text-left ${selectedPlace?.id === place.id ? 'ring-2 ring-amber-500/40' : ''}`}>
                  <div className="grid gap-4 md:grid-cols-[132px_minmax(0,1fr)]">
                    <div>
                      {place.image_url ? (
                        <img src={place.image_url} alt="" className="place-photo" />
                      ) : (
                        <div className="place-photo flex items-center justify-center text-white/45">
                          <Store className="h-10 w-10" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="status-pill active">{place.source === 'local' ? 'Kapakka venue' : place.provider}</span>
                            {typeof place.distance_km === 'number' && <span className="status-pill">{formatDistanceKm(place.distance_km)}</span>}
                            {place.open_now === true && <span className="status-pill active">Nyitva most</span>}
                          </div>
                          <p className="truncate text-xl font-bold text-white">{place.name}</p>
                          <p className="mt-1 text-sm text-white/50">{placeCategoryLabel(place.category)}</p>
                        </div>
                        <button
                          onClick={(event) => {
                            event.stopPropagation()
                            toggleFavorite(place)
                          }}
                          className={`rounded-2xl border px-3 py-2 text-sm font-semibold ${favorite ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-white/10 bg-white/5 text-white/65'}`}
                        >
                          <span className="inline-flex items-center gap-2">
                            <Star className={`h-4 w-4 ${favorite ? 'fill-current' : ''}`} />
                            {favorite ? 'Kedvenc' : 'Mentés'}
                          </span>
                        </button>
                      </div>

                      <div className="mt-4 grid gap-2 text-sm text-white/58">
                        {place.address && <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> <span>{place.address}</span></div>}
                        {typeof place.rating === 'number' && <div className="flex items-center gap-2"><Star className="h-4 w-4 fill-current text-amber-300" /> <span>{place.rating.toFixed(1)} értékelés {place.review_count ? `· ${place.review_count} vélemény` : ''}</span></div>}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {(place.tags || []).slice(0, 3).map((tag) => (
                          <span key={tag} className="filter-chip">{tag}</span>
                        ))}
                        {place.venue_id && <span className="filter-chip active">Digitális étlap</span>}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </section>

        <aside className="detail-sheet p-5 sm:p-6">
          {selectedPlace ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="section-kicker mb-3">
                    <Info className="h-4 w-4" />
                    részletes helyprofil
                  </div>
                  <h3 className="text-2xl font-bold text-white">{selectedPlace.name}</h3>
                  <p className="mt-2 text-sm text-white/55">{placeCategoryLabel(selectedPlace.category)} · {selectedPlace.provider}</p>
                </div>
                <button onClick={() => setSelectedPlace(null)} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-white/65">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {selectedPlace.image_url ? (
                <img src={selectedPlace.image_url} alt="" className="place-photo" />
              ) : (
                <div className="place-photo flex items-center justify-center text-white/45">
                  <Store className="h-10 w-10" />
                </div>
              )}

              <div className="grid gap-3 text-sm text-white/62">
                {selectedPlace.address && <div className="rounded-[20px] border border-white/10 bg-white/5 p-4"><span className="font-semibold text-white">Cím:</span> {selectedPlace.address}</div>}
                {selectedPlace.city && <div className="rounded-[20px] border border-white/10 bg-white/5 p-4"><span className="font-semibold text-white">Város:</span> {selectedPlace.city}</div>}
                {typeof selectedPlace.distance_km === 'number' && <div className="rounded-[20px] border border-white/10 bg-white/5 p-4"><span className="font-semibold text-white">Távolság:</span> {formatDistanceKm(selectedPlace.distance_km)}</div>}
                {typeof selectedPlace.rating === 'number' && <div className="rounded-[20px] border border-white/10 bg-white/5 p-4"><span className="font-semibold text-white">Értékelés:</span> {selectedPlace.rating.toFixed(1)} {selectedPlace.review_count ? `(${selectedPlace.review_count} vélemény)` : ''}</div>}
                {selectedPlace.phone && <div className="rounded-[20px] border border-white/10 bg-white/5 p-4"><span className="font-semibold text-white">Telefon:</span> {selectedPlace.phone}</div>}
                {selectedPlace.website && <div className="rounded-[20px] border border-white/10 bg-white/5 p-4"><span className="font-semibold text-white">Web:</span> <a href={selectedPlace.website} target="_blank" rel="noreferrer" className="text-amber-300 underline">{selectedPlace.website}</a></div>}
                {selectedPlace.description && <div className="rounded-[20px] border border-white/10 bg-white/5 p-4"><span className="font-semibold text-white">Leírás:</span> {selectedPlace.description}</div>}
                {selectedPlace.opening_hours_text && selectedPlace.opening_hours_text.length > 0 && (
                  <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                    <span className="font-semibold text-white">Nyitvatartási info:</span>
                    <ul className="mt-2 space-y-1">
                      {selectedPlace.opening_hours_text.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button onClick={() => toggleFavorite(selectedPlace)} className={`btn-outline w-auto px-4 ${selectedIsFavorite ? 'border-amber-500/30 text-amber-300' : ''}`}>
                  <Star className={`h-4 w-4 ${selectedIsFavorite ? 'fill-current' : ''}`} />
                  {selectedIsFavorite ? 'Kedvencként mentve' : 'Kedvencbe'}
                </button>
                <button onClick={() => sharePlace(selectedPlace)} className="btn-outline w-auto px-4">
                  <Send className="h-4 w-4" />
                  Megosztás
                </button>
                {selectedPlace.venue_id && (
                  <button onClick={() => router.push(`/customer/pub/${selectedPlace.venue_id}`)} className="btn-kapakka w-auto px-4">
                    <ShoppingBag className="h-4 w-4" />
                    Étlap megnyitása
                  </button>
                )}
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">Mentés közös listába</p>
                {lists.length === 0 ? (
                  <p className="mt-2 text-sm text-white/50">Még nincs listád — hozz létre egyet a Barátok fülön.</p>
                ) : (
                  <div className="mt-3 grid gap-2">
                    {lists.map((list) => (
                      <button key={list.id} onClick={() => addPlaceToList(list.id, selectedPlace)} className="btn-outline justify-between px-4 text-left">
                        <span>{list.title}</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center text-white/45">
              <Store className="mb-4 h-12 w-12" />
              <p className="text-lg font-semibold text-white/80">Válassz ki egy helyet a listából</p>
              <p className="mt-2 max-w-sm text-sm">Itt megjelenik minden fontos adat: kategória, távolság, értékelés, elérhetőségek és a további akciók.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )

  const SocialContent = () => (
    <div className="space-y-5">
      <div className="admin-card-soft p-5 text-white">
        <div className="section-kicker mb-3">
          <Users className="h-4 w-4" />
          social planning
        </div>
        <h2 className="text-3xl font-bold">Hívd át a társaságot, és építsetek közös listát.</h2>
        <p className="mt-3 max-w-3xl text-sm text-white/55">Barátmeghívók, elfogadások, kedvenc helyek és közösen szerkeszthető esti venue listák.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="social-panel p-5 sm:p-6">
          <p className="text-sm font-semibold text-white">Barátmeghívó küldése</p>
          <p className="mt-1 text-sm text-white/50">Csak olyan usernek küldhetsz meghívót, akinek már van Kapakka fiókja.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input value={friendInviteEmail} onChange={(event) => setFriendInviteEmail(event.target.value)} className="kap-input flex-1" placeholder="barat@email.hu" />
            <button onClick={inviteFriend} className="btn-kapakka sm:w-auto sm:px-5">
              <Send className="h-4 w-4" />
              Meghívás
            </button>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="social-stat p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/30">Elfogadott barátok</p>
              <p className="mt-2 text-3xl font-black text-white">{acceptedFriends.length}</p>
            </div>
            <div className="social-stat p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/30">Bejövő meghívók</p>
              <p className="mt-2 text-3xl font-black text-white">{pendingInvites.length}</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <p className="text-sm font-semibold text-white">Bejövő meghívások</p>
            {pendingInvites.length === 0 ? (
              <div className="friend-card p-4 text-sm text-white/50">Jelenleg nincs függő meghívód.</div>
            ) : (
              pendingInvites.map((invite) => (
                <div key={invite.id} className="friend-card p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-white">{invite.requester?.full_name || 'Kapakka user'}</p>
                      <p className="mt-1 text-sm text-white/50">{invite.requester?.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => respondToInvite(invite.id, 'accepted')} className="btn-kapakka sm:w-auto sm:px-4">
                        <Check className="h-4 w-4" />
                        Elfogad
                      </button>
                      <button onClick={() => respondToInvite(invite.id, 'declined')} className="btn-outline sm:w-auto sm:px-4">
                        <X className="h-4 w-4" />
                        Elutasít
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="social-panel p-5 sm:p-6">
          <p className="text-sm font-semibold text-white">Közös helylista</p>
          <p className="mt-1 text-sm text-white/50">Készíts privát listát, és vond be egy barátodat szerkesztőként.</p>
          <div className="mt-4 grid gap-3">
            <input value={newListTitle} onChange={(event) => setNewListTitle(event.target.value)} className="kap-input" placeholder="Péntek esti körút" />
            <select value={listCollaboratorId} onChange={(event) => setListCollaboratorId(event.target.value)} className="kap-input">
              <option value="">Kollaborátor később</option>
              {acceptedFriends.map((friend) => {
                const person = friend.requester_id === profile?.id ? friend.addressee : friend.requester
                return (
                  <option key={friend.id} value={person?.id}>{person?.full_name || person?.email}</option>
                )
              })}
            </select>
            <button onClick={createSharedList} className="btn-kapakka">
              <Calendar className="h-4 w-4" />
              Lista létrehozása
            </button>
          </div>

          <div className="mt-6 space-y-3">
            <p className="text-sm font-semibold text-white">Meglévő listák</p>
            {lists.length === 0 ? (
              <div className="list-card p-4 text-sm text-white/50">Még nincs mentett helylistád.</div>
            ) : (
              lists.map((list) => (
                <div key={list.id} className="list-card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{list.title}</p>
                      <p className="mt-1 text-sm text-white/50">{list.description || 'Közös venue lista'}</p>
                    </div>
                    <span className="filter-chip">{new Date(list.created_at).toLocaleDateString('hu-HU')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )

  const OrdersContent = () => (
    <div className="space-y-5">
      <div className="admin-card-soft p-5 text-white">
        <div className="section-kicker mb-3">
          <Bell className="h-4 w-4" />
          order tracking
        </div>
        <h2 className="text-3xl font-bold">Élő rendeléskövetés és automatikus jelzések</h2>
        <p className="mt-3 max-w-3xl text-sm text-white/55">A venue beállíthatja, hogy automatikus értesítés menjen, amikor a rendelésed feldolgozás alá kerül vagy amikor átvehető.</p>
      </div>

      {orders.length === 0 ? (
        <div className="order-panel p-8 text-center sm:p-10">
          <div className="mx-auto mb-5 inline-flex h-20 w-20 items-center justify-center rounded-[28px] border border-white/10 bg-white/10 text-white">
            <ClipboardList className="h-9 w-9" />
          </div>
          <p className="text-lg font-semibold text-white">Még nincs rendelésed</p>
          <p className="mt-2 text-sm text-white/50">Szkenneld be az asztali QR kódot, vagy nyiss meg egy venue oldalt.</p>
          <button onClick={() => router.push('/customer/scan')} className="btn-kapakka mx-auto mt-6 max-w-xs">
            Rendelés indítása
          </button>
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-3">
          {orders.map((order) => (
            <button key={order.id} onClick={() => router.push(`/customer/orders/${order.id}`)} className="order-panel p-5 text-left">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-white/30">Rendelés</p>
                  <p className="mt-1 text-lg font-bold text-white">{order.order_number}</p>
                </div>
                <span className={`badge ${STATUS_BADGE[order.status] || 'badge-done'}`}>{STATUS_LABELS[order.status]}</span>
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">{order.venue?.name || 'Kapakka venue'}</p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-semibold text-amber-300">{formatPrice(order.total)}</span>
                  <span className="text-white/40">{timeAgo(order.placed_at)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )

  const ProfileContent = () => (
    <div className="space-y-5">
      <div className="hero-card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-[var(--accent)] text-2xl font-black text-[var(--accent-contrast)] shadow-xl">
            {profile?.full_name?.[0]?.toUpperCase() || 'K'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-2xl font-bold text-white">{profile?.full_name || 'Kapakka vendég'}</p>
            <p className="truncate text-sm text-white/50">{profile?.email}</p>
          </div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="metric-card p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/30">Pontok</p>
            <p className="mt-2 text-3xl font-black text-white">{profile?.loyalty_points || 0}</p>
          </div>
          <div className="metric-card p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/30">Kedvencek</p>
            <p className="mt-2 text-3xl font-black text-white">{favoriteCount}</p>
          </div>
          <div className="metric-card p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/30">Barátok</p>
            <p className="mt-2 text-3xl font-black text-white">{acceptedFriends.length}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <div className="profile-option-card p-5 text-left">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3 text-white"><Star className="h-5 w-5" /></div>
            <div className="flex-1">
              <p className="font-semibold text-white">Hűségpontok</p>
              <p className="mt-1 text-sm text-white/50">A profilban maradnak fókuszban: {profile?.loyalty_points || 0} pont áll rendelkezésedre.</p>
            </div>
          </div>
        </div>
        <button onClick={() => setTab('social')} className="profile-option-card p-5 text-left">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3 text-white"><Users className="h-5 w-5" /></div>
            <div className="flex-1">
              <p className="font-semibold text-white">Barátok és listák</p>
              <p className="mt-1 text-sm text-white/50">Közös mentések és esték szervezése.</p>
            </div>
            <ChevronRight className="h-5 w-5 text-white/30" />
          </div>
        </button>
        <button onClick={() => setTab('orders')} className="profile-option-card p-5 text-left">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3 text-white"><Bell className="h-5 w-5" /></div>
            <div className="flex-1">
              <p className="font-semibold text-white">Rendelésjelzések</p>
              <p className="mt-1 text-sm text-white/50">Élő státuszváltozások és átvételi értesítés.</p>
            </div>
            <ChevronRight className="h-5 w-5 text-white/30" />
          </div>
        </button>
      </div>

      <div className="feature-card p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-3 text-white"><Sparkles className="h-5 w-5" /></div>
          <div>
            <p className="font-semibold text-white">Egyéni ajánlataim</p>
            <p className="mt-1 text-sm text-white/50">A venue-k személyes akciói és ajánlatai ide kerülhetnek. Jelenleg még nincs személyre szabott ajánlatod.</p>
          </div>
        </div>
      </div>

      <button onClick={logout} className="btn-outline border-red-500/30 text-red-300 hover:bg-red-500/10 hover:text-red-200">
        Kijelentkezés
      </button>
    </div>
  )

  if (loading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-[30px] border border-white/10 bg-white/10 text-white shadow-2xl">
          <Store className="h-10 w-10 anim-pulse" />
        </div>
      </div>
    )
  }

  if (isAdmin) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center px-4">
        <div className="hero-card w-full max-w-2xl p-6 text-center sm:p-8">
          <div className="section-kicker mx-auto mb-5 w-fit">
            <Sparkles className="h-4 w-4" />
            venue account detected
          </div>
          <h1 className="section-title">Ezzel a fiókkal admin oldalra is be tudsz lépni.</h1>
          <p className="section-subtitle mx-auto mt-4 max-w-xl">
            Az admin panelen design váltás, foglalási beállítások, rendelésjelzések és place-discovery funkciók is konfigurálhatók redeploy nélkül.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button onClick={() => router.replace('/admin')} className="btn-kapakka sm:w-auto sm:px-6">
              Admin panel megnyitása
            </button>
            <button onClick={logout} className="btn-outline sm:w-auto sm:px-6">
              Kijelentkezés
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell pb-28 md:pb-10">
      <header className="hidden border-b border-white/10 bg-black/20 backdrop-blur-xl lg:block">
        <div className="customer-container flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/10 bg-white/10 text-white shadow-2xl">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.34em] text-white/30">Kapakka</p>
              <p className="text-sm text-white/70">Guest platform</p>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            {navItems.map((item) => (
              <button key={item.id} onClick={() => setTab(item.id)} className={`desktop-nav-pill ${tab === item.id ? 'active' : ''}`}>
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/customer/scan')} className="btn-kapakka w-auto px-5 py-3">
              <ShoppingBag className="h-4 w-4" />
              QR / rendelés
            </button>
            <button onClick={() => setTab('profile')} className={`inline-flex h-12 w-12 items-center justify-center rounded-[18px] border ${tab === 'profile' ? 'border-amber-500 bg-amber-500 text-black' : 'border-white/10 bg-white/10 text-white'} font-black shadow-xl transition-colors`}>
              {profile?.full_name?.[0]?.toUpperCase() || 'K'}
            </button>
          </div>
        </div>
      </header>

      <div className="customer-container pt-6 md:pt-8">
        <div className="mb-6 flex items-center justify-between gap-4 lg:hidden">
          <div>
            <div className="section-kicker mb-3">
              <Sparkles className="h-4 w-4" />
              vendég oldal
            </div>
            <p className="text-2xl font-bold text-white">Szia, {profile?.full_name?.split(' ')?.[0] || 'Vendég'}!</p>
            <p className="mt-1 text-sm text-white/50">Fiatalos venue finder, social planning és order tracking.</p>
          </div>
          <button onClick={() => router.push('/customer/scan')} className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-amber-500 text-black shadow-xl">
            <ShoppingBag className="h-5 w-5" />
          </button>
        </div>

        {tab === 'home' && HomeContent()}
        {tab === 'discover' && DiscoverContent()}
        {tab === 'social' && SocialContent()}
        {tab === 'orders' && OrdersContent()}
        {tab === 'profile' && ProfileContent()}
      </div>

      <nav className="mobile-tabbar lg:hidden">
        {navItems.map((item) => (
          <button key={item.id} onClick={() => setTab(item.id)} className={`mobile-tab-item ${tab === item.id ? 'active' : ''}`}>
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
