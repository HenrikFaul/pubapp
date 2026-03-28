'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Venue } from '@/types'
import { formatPrice, isVenueOpen } from '@/lib/utils'
import {
  MapPin, Search, QrCode, Star, ChevronRight,
  Bell, User, Beer, Gamepad2, Clock, Heart
} from 'lucide-react'
import toast from 'react-hot-toast'

type Tab = 'discover' | 'games' | 'orders' | 'profile'

export default function CustomerHome() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('discover')
  const [venues, setVenues] = useState<Venue[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLon, setUserLon] = useState<number | null>(null)
  const [user, setUser] = useState<{ email?: string; full_name?: string } | null>(null)

  useEffect(() => {
    checkAuth()
    fetchVenues()
    getUserLocation()
  }, [])

  async function checkAuth() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      router.push('/')
      return
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', authUser.id)
      .single()
    setUser(profile || { email: authUser.email })
  }

  async function fetchVenues() {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('is_active', true)
      .order('rating', { ascending: false })
    if (error) toast.error('Nem sikerült betölteni a helyszíneket')
    setVenues(data || [])
    setLoading(false)
  }

  function getUserLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setUserLat(pos.coords.latitude)
          setUserLon(pos.coords.longitude)
        },
        () => {
          // Default to Budapest center
          setUserLat(47.4979)
          setUserLon(19.0402)
        }
      )
    }
  }

  const filteredVenues = venues.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.address?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-amber-50 pb-20">
      {/* Header */}
      <div className="bg-amber-950 text-white px-4 pt-12 pb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-amber-400 text-sm">Üdv újra,</p>
            <h1 className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
              {user?.full_name || 'Vendég'} 🍺
            </h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/customer/notifications')}
              className="w-10 h-10 bg-amber-900/60 rounded-xl flex items-center justify-center"
            >
              <Bell className="w-5 h-5 text-amber-300" />
            </button>
            <button
              onClick={() => setTab('profile')}
              className="w-10 h-10 bg-amber-900/60 rounded-xl flex items-center justify-center"
            >
              <User className="w-5 h-5 text-amber-300" />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Keress kocsmanevét vagy helyszínt..."
            className="w-full bg-amber-900/50 border border-amber-700/50 text-amber-100 rounded-xl pl-10 pr-12 py-3 text-sm placeholder:text-amber-600 focus:outline-none focus:border-amber-500"
          />
          <button
            onClick={() => router.push('/customer/scan')}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center"
          >
            <QrCode className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-6">
        {tab === 'discover' && (
          <>
            {/* Quick actions */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: 'QR Scan', icon: <QrCode className="w-6 h-6" />, action: () => router.push('/customer/scan'), color: 'bg-amber-500' },
                { label: 'Játékok', icon: <Gamepad2 className="w-6 h-6" />, action: () => setTab('games'), color: 'bg-amber-700' },
                { label: 'Rendeléseim', icon: <Clock className="w-6 h-6" />, action: () => setTab('orders'), color: 'bg-amber-900' },
              ].map(q => (
                <button
                  key={q.label}
                  onClick={q.action}
                  className={`${q.color} text-white rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm`}
                >
                  {q.icon}
                  <span className="text-xs font-medium">{q.label}</span>
                </button>
              ))}
            </div>

            {/* Nearby venues */}
            <h2 className="text-lg font-bold text-amber-950 mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
              {search ? 'Keresési eredmények' : 'Helyszínek közeledben'}
            </h2>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-2xl h-28 animate-pulse" />
                ))}
              </div>
            ) : filteredVenues.length === 0 ? (
              <div className="text-center py-12">
                <Beer className="w-12 h-12 text-amber-300 mx-auto mb-3" />
                <p className="text-amber-700">Nincs találat</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredVenues.map(venue => (
                  <VenueCard
                    key={venue.id}
                    venue={venue}
                    onClick={() => router.push(`/customer/pub/${venue.id}`)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'games' && <GamesSection router={router} />}
        {tab === 'orders' && <OrdersSection router={router} />}
        {tab === 'profile' && <ProfileSection router={router} user={user} />}
      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <div className="flex items-center justify-around py-2 px-4">
          {[
            { id: 'discover' as Tab, icon: <MapPin className="w-5 h-5" />, label: 'Felfedez' },
            { id: 'games' as Tab, icon: <Gamepad2 className="w-5 h-5" />, label: 'Játékok' },
            { id: 'orders' as Tab, icon: <Clock className="w-5 h-5" />, label: 'Rendelések' },
            { id: 'profile' as Tab, icon: <User className="w-5 h-5" />, label: 'Profil' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors ${
                tab === item.id ? 'text-amber-600' : 'text-gray-400'
              }`}
            >
              {item.icon}
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

function VenueCard({ venue, onClick }: { venue: Venue; onClick: () => void }) {
  const open = isVenueOpen(venue.opening_hours)
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl overflow-hidden shadow-sm border border-amber-100 flex items-stretch text-left hover:shadow-md transition-shadow"
    >
      <div className="w-24 h-24 bg-amber-200 flex-shrink-0 relative">
        {venue.cover_url ? (
          <img src={venue.cover_url} alt={venue.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600">
            <Beer className="w-8 h-8 text-white/60" />
          </div>
        )}
        <span className={`absolute top-2 left-2 text-xs px-1.5 py-0.5 rounded-full font-medium ${open ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}>
          {open ? 'Nyitva' : 'Zárva'}
        </span>
      </div>
      <div className="flex-1 p-3 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-amber-950 text-base">{venue.name}</h3>
          <p className="text-amber-600 text-xs mt-0.5 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {venue.address}
          </p>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span className="text-sm font-semibold text-amber-700">{venue.rating.toFixed(1)}</span>
            <span className="text-xs text-amber-400">({venue.review_count})</span>
          </div>
          <div className="flex gap-1">
            {venue.has_table_service && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Table service</span>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-amber-400" />
        </div>
      </div>
    </button>
  )
}

function GamesSection({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-amber-950" style={{ fontFamily: 'Playfair Display, serif' }}>Játékok</h2>
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            title: 'Kocsmakvíz',
            desc: 'Teszteld tudásodat!',
            emoji: '🧠',
            color: 'from-purple-500 to-purple-700',
            action: () => router.push('/customer/games/quiz'),
          },
          {
            title: 'Részegség mérő',
            desc: 'Mennyi ment már le?',
            emoji: '🍺',
            color: 'from-amber-500 to-orange-600',
            action: () => router.push('/customer/games/drunk-o-meter'),
          },
          {
            title: 'Igazság vagy kihívás',
            desc: 'Játssz barátaiddal!',
            emoji: '🎯',
            color: 'from-rose-500 to-pink-600',
            action: () => router.push('/customer/games/truth-or-dare'),
          },
          {
            title: 'Kocka játék',
            desc: 'Ki iszik most?',
            emoji: '🎲',
            color: 'from-emerald-500 to-teal-600',
            action: () => router.push('/customer/games/dice'),
          },
        ].map(game => (
          <button
            key={game.title}
            onClick={game.action}
            className={`bg-gradient-to-br ${game.color} rounded-2xl p-5 text-white text-left shadow-md`}
          >
            <div className="text-4xl mb-3">{game.emoji}</div>
            <h3 className="font-bold text-base">{game.title}</h3>
            <p className="text-white/70 text-xs mt-1">{game.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

function OrdersSection({ router }: { router: ReturnType<typeof useRouter> }) {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrders()
  }, [])

  async function fetchOrders() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('orders')
      .select('*, venue:venues(name)')
      .eq('customer_id', user.id)
      .order('placed_at', { ascending: false })
      .limit(20)
    setOrders(data || [])
    setLoading(false)
  }

  if (loading) return <div className="text-center py-8 text-amber-600">Betöltés...</div>

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-amber-950" style={{ fontFamily: 'Playfair Display, serif' }}>Rendeléseim</h2>
      {orders.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-amber-300 mx-auto mb-3" />
          <p className="text-amber-600">Még nincs rendelésed</p>
          <button
            onClick={() => router.push('/customer/scan')}
            className="mt-4 btn-primary text-sm"
          >
            Első rendelés leadása
          </button>
        </div>
      ) : (
        orders.map(order => (
          <div key={order.id} className="bg-white rounded-2xl p-4 border border-amber-100">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="font-bold text-amber-950">{order.order_number}</span>
                <span className="text-amber-400 text-sm ml-2">{order.venue?.name}</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                order.status === 'ready' ? 'bg-green-100 text-green-700' :
                order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                order.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                'bg-blue-100 text-blue-700'
              }`}>
                {order.status === 'ready' ? '🔔 Kész!' :
                 order.status === 'pending' ? '⏳ Várakozik' :
                 order.status === 'preparing' ? '👨‍🍳 Készítés' :
                 order.status === 'completed' ? '✅ Kész' : order.status}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-amber-600">{formatPrice(order.total)}</span>
              <span className="text-amber-400 text-xs">
                {new Date(order.placed_at).toLocaleDateString('hu-HU')}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function ProfileSection({ router, user }: { router: ReturnType<typeof useRouter>; user: any }) {
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return
    const { data } = await supabase.from('profiles').select('*').eq('id', authUser.id).single()
    setProfile(data)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-amber-950" style={{ fontFamily: 'Playfair Display, serif' }}>Profil</h2>
      
      {profile && (
        <div className="bg-white rounded-2xl p-5 border border-amber-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center text-2xl font-bold text-white">
              {profile.full_name?.[0] || 'K'}
            </div>
            <div>
              <h3 className="font-bold text-amber-950 text-lg">{profile.full_name}</h3>
              <p className="text-amber-500 text-sm">{profile.email}</p>
            </div>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 flex items-center gap-3">
            <Heart className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-xs text-amber-600">Hűségpontok</p>
              <p className="font-bold text-amber-950">{profile.loyalty_points || 0} pont</p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleLogout}
        className="w-full bg-red-50 text-red-600 border border-red-200 py-3 rounded-xl font-medium"
      >
        Kijelentkezés
      </button>
    </div>
  )
}
