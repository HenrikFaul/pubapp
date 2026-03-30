'use client'

import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatPrice, isOpenNow, STATUS_BADGE, STATUS_LABELS, timeAgo } from '@/lib/utils'
import {
  Bell,
  Brain,
  ChevronRight,
  ClipboardList,
  Gamepad2,
  Gift,
  Heart,
  House,
  MapPin,
  QrCode,
  Sparkles,
  Star,
  Store,
  UserCircle2,
} from 'lucide-react'

type Tab = 'home' | 'pubs' | 'games' | 'orders' | 'profile'

interface ShortcutCard {
  label: string
  caption: string
  icon: ReactNode
  action: () => void
}

export default function CustomerPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('home')
  const [venues, setVenues] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const init = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.replace('/')
      return
    }

    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()

    if (p && ['admin', 'staff', 'superadmin'].includes(p.role)) {
      setIsAdmin(true)
    }

    setProfile(p)

    const [{ data: venueData }, { data: orderData }] = await Promise.all([
      supabase.from('venues').select('*').eq('is_active', true).order('rating', { ascending: false }),
      supabase
        .from('orders')
        .select('*, venue:venues(name)')
        .eq('customer_id', user.id)
        .order('placed_at', { ascending: false })
        .limit(20),
    ])

    setVenues(venueData || [])
    setOrders(orderData || [])
    setLoading(false)
  }, [router])

  useEffect(() => {
    init()
  }, [init])

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/')
  }

  const filtered = venues.filter((venue) =>
    venue.name.toLowerCase().includes(search.toLowerCase()) || venue.address?.toLowerCase().includes(search.toLowerCase())
  )

  const quickActions: ShortcutCard[] = [
    {
      label: 'QR szkennelés',
      caption: 'Belépés az asztalhoz vagy a helyszínhez egy mozdulattal.',
      icon: <QrCode className="h-5 w-5" />,
      action: () => router.push('/customer/scan'),
    },
    {
      label: 'Kocsmák',
      caption: 'Fedezz fel helyeket a közelben és nyisd meg az étlapot.',
      icon: <Store className="h-5 w-5" />,
      action: () => setTab('pubs'),
    },
    {
      label: 'Játékok',
      caption: 'Kvíz, truth or dare és társas hangulatfokozók.',
      icon: <Gamepad2 className="h-5 w-5" />,
      action: () => setTab('games'),
    },
    {
      label: 'Rendeléseim',
      caption: 'Kövesd élőben az aktuális és korábbi rendeléseket.',
      icon: <ClipboardList className="h-5 w-5" />,
      action: () => setTab('orders'),
    },
  ]

  const navItems: Array<{ id: Tab; label: string; icon: ReactNode }> = [
    { id: 'home', label: 'Főoldal', icon: <House className="h-5 w-5" /> },
    { id: 'pubs', label: 'Kocsmák', icon: <Store className="h-5 w-5" /> },
    { id: 'games', label: 'Játékok', icon: <Gamepad2 className="h-5 w-5" /> },
    { id: 'orders', label: 'Rendelések', icon: <ClipboardList className="h-5 w-5" /> },
    { id: 'profile', label: 'Profil', icon: <UserCircle2 className="h-5 w-5" /> },
  ]

  function renderSectionHeader(title: string, subtitle: string, backTarget?: Tab) {
    return (
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="section-kicker mb-3">
            <Sparkles className="h-4 w-4" />
            Kapakka vendégélmény
          </div>
          <h2 className="text-2xl font-bold text-white md:text-3xl">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/50 md:text-base">{subtitle}</p>
        </div>
        {backTarget && (
          <button onClick={() => setTab(backTarget)} className="btn-outline hidden w-auto px-4 py-3 md:inline-flex">
            Vissza
          </button>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-[30px] border border-white/10 bg-white/10 text-amber-400 shadow-2xl">
          <Store className="h-10 w-10 anim-pulse" />
        </div>
      </div>
    )
  }

  if (isAdmin) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center px-4">
        <div className="hero-card w-full max-w-xl p-6 text-center sm:p-8">
          <div className="mx-auto mb-5 inline-flex h-20 w-20 items-center justify-center rounded-[28px] border border-white/10 bg-white/10 text-amber-400 shadow-2xl">
            <Store className="h-9 w-9" />
          </div>
          <div className="section-kicker mx-auto mb-4 w-fit">Admin fiók észlelve</div>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">Ez a fiók venue oldali jogosultsággal rendelkezik.</h1>
          <p className="mt-4 text-sm text-white/50 sm:text-base">Ugyanazzal a belépéssel megnyithatod az admin felületet, és ott válthatod az aktív dizájnt is.</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
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

  const HomeContent = () => (
    <div className="space-y-6 lg:space-y-8">
      <div className="hero-card overflow-hidden p-5 sm:p-7">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <div className="section-kicker mb-4">
              <Gift className="h-4 w-4" />
              fiatalos, gyors és fogyasztásra ösztönző élmény
            </div>
            <h1 className="section-title">
              Szia, {profile?.full_name?.split(' ')?.[0] || 'Vendég'} — ma mire vagy hangolva?
            </h1>
            <p className="section-subtitle mt-4 max-w-2xl">
              Találj helyet, nyisd meg a digitális étlapot, rendelj gyorsabban és tartsd együtt a társaságot a játékokkal.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="metric-card p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-white/30">Aktív helyek</p>
                <p className="mt-2 text-3xl font-black text-white">{venues.length}</p>
              </div>
              <div className="metric-card p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-white/30">Rendelések</p>
                <p className="mt-2 text-3xl font-black text-white">{orders.length}</p>
              </div>
              <div className="metric-card p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-white/30">Hűségpontok</p>
                <p className="mt-2 text-3xl font-black text-white">{profile?.loyalty_points || 0}</p>
              </div>
            </div>
          </div>

          <div className="modern-card p-4 sm:p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-white/30">Gyors indítás</p>
            <div className="relative mt-3">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                <MapPin className="h-4 w-4" />
              </span>
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setTab('pubs')
                }}
                placeholder="Keress helyszínre vagy címre..."
                className="kap-input pl-11 pr-28"
              />
              <button onClick={() => router.push('/customer/scan')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-2xl bg-amber-500 px-3 py-2 text-sm font-bold text-black shadow-lg transition hover:bg-amber-400">
                QR
              </button>
            </div>
            <p className="mt-3 text-sm text-white/50">A Kapakka mobilon natív érzetű, weben pedig tágas és gyors adminisztrációt ad.</p>
          </div>
        </div>
      </div>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white">Mit csinálnál most?</h3>
            <p className="mt-1 text-sm text-white/50">A leggyakoribb vendégműveletek egy helyen.</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((item) => (
            <button key={item.label} onClick={item.action} className="quick-action-card p-5 text-left">
              <div className="mb-4 inline-flex rounded-2xl border border-white/10 bg-white/10 p-3 text-amber-400">{item.icon}</div>
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-white">{item.label}</p>
                  <p className="mt-1 text-sm text-white/50">{item.caption}</p>
                </div>
                <ChevronRight className="mt-0.5 h-5 w-5 flex-shrink-0 text-white/30" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {venues.length > 0 && (
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white">Ajánlott helyek</h3>
              <p className="mt-1 text-sm text-white/50">Nyitvatartás, digitális étlap és azonnali belépés a rendeléshez.</p>
            </div>
            <button onClick={() => setTab('pubs')} className="btn-outline hidden w-auto px-4 py-3 md:inline-flex">
              Összes hely
            </button>
          </div>

          <div className="grid gap-3 xl:grid-cols-3">
            {venues.slice(0, 6).map((venue) => (
              <button key={venue.id} onClick={() => router.push(`/customer/pub/${venue.id}`)} className="venue-card-modern p-4 text-left sm:p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[22px] border border-white/10 bg-white/10 text-2xl text-amber-400 shadow-xl">
                    {venue.logo_url ? <img src={venue.logo_url} alt="" className="h-full w-full rounded-[22px] object-cover" /> : <Store className="h-7 w-7" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="truncate text-lg font-bold text-white">{venue.name}</p>
                        <p className="mt-1 flex items-center gap-1 text-sm text-white/50">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{venue.address}</span>
                        </p>
                      </div>
                      <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm font-semibold text-amber-400">
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-4 w-4 fill-current" />
                          {venue.rating?.toFixed(1) || '—'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
                      <span className={`rounded-full px-3 py-1 ${isOpenNow(venue.opening_hours) ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                        {isOpenNow(venue.opening_hours) ? 'Nyitva most' : 'Jelenleg zárva'}
                      </span>
                      {venue.has_table_service && <span className="rounded-full bg-white/10 px-3 py-1 text-white/60">Asztali kiszolgálás</span>}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )

  const PubsContent = () => (
    <div className="space-y-5">
      {renderSectionHeader('Kocsma lista', 'Keresd meg a hozzád illő helyet, és nyisd meg egyből a digitális étlapot.', 'home')}
      <div className="modern-card p-4">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
            <MapPin className="h-4 w-4" />
          </span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Keresés név vagy cím alapján..." className="kap-input pl-11" />
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="modern-card p-10 text-center text-white/40">Nincs találat</div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((venue) => (
            <button key={venue.id} onClick={() => router.push(`/customer/pub/${venue.id}`)} className="venue-card-modern p-5 text-left">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[22px] border border-white/10 bg-white/10 text-amber-400 shadow-xl">
                  {venue.logo_url ? <img src={venue.logo_url} alt="" className="h-full w-full rounded-[22px] object-cover" /> : <Store className="h-7 w-7" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-bold text-white">{venue.name}</p>
                      <p className="mt-1 truncate text-sm text-white/50">{venue.address}</p>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm font-semibold text-amber-400">
                      {venue.rating?.toFixed(1) || '—'}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <span className={`rounded-full px-3 py-1 ${isOpenNow(venue.opening_hours) ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                      {isOpenNow(venue.opening_hours) ? 'Nyitva' : 'Zárva'}
                    </span>
                    {venue.has_table_service && <span className="rounded-full bg-white/10 px-3 py-1 text-white/60">Table service</span>}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )

  const GamesContent = () => (
    <div className="space-y-5">
      {renderSectionHeader('Játékok', 'Tartsd bent a társaságot még egy körre — könnyű, gyors, közösségi játékok.', 'home')}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: 'Kocsmakvíz',
            subtitle: 'Teszteld a tudásod és versenyezz a barátokkal.',
            icon: <Brain className="h-7 w-7" />,
            style: 'linear-gradient(135deg, #6d28d9, #9333ea)',
            path: '/customer/games/quiz',
          },
          {
            title: 'Részegség mérő',
            subtitle: 'Számolj, nevess, és nézd meg, mennyi ment le.',
            icon: <Store className="h-7 w-7" />,
            style: 'linear-gradient(135deg, #c2410c, #f59e0b)',
            path: '/customer/games/drunk-o-meter',
          },
          {
            title: 'Igazság vagy merészség',
            subtitle: 'Pár kattintás, és már indul is a társasjáték hangulat.',
            icon: <Sparkles className="h-7 w-7" />,
            style: 'linear-gradient(135deg, #be185d, #e11d48)',
            path: '/customer/games/truth-or-dare',
          },
          {
            title: 'Kocka játék',
            subtitle: 'Pörgős ivós játék, ha kell egy újabb fordulat.',
            icon: <Star className="h-7 w-7" />,
            style: 'linear-gradient(135deg, #0f766e, #14b8a6)',
            path: '/customer/games/dice',
          },
        ].map((game) => (
          <button key={game.title} onClick={() => router.push(game.path)} className="game-card p-5 text-left text-white" style={{ background: game.style }}>
            <div className="mb-12 inline-flex rounded-2xl border border-white/20 bg-white/10 p-3">{game.icon}</div>
            <p className="text-xl font-bold">{game.title}</p>
            <p className="mt-2 text-sm text-white/80">{game.subtitle}</p>
          </button>
        ))}
      </div>
    </div>
  )

  const OrdersContent = () => (
    <div className="space-y-5">
      {renderSectionHeader('Rendeléseim', 'Kövesd élőben a státuszt, és nyisd meg bármelyik rendelésedet részletes nézetben.', 'home')}
      {orders.length === 0 ? (
        <div className="hero-card p-8 text-center sm:p-10">
          <div className="mx-auto mb-5 inline-flex h-20 w-20 items-center justify-center rounded-[28px] border border-white/10 bg-white/10 text-amber-400">
            <ClipboardList className="h-9 w-9" />
          </div>
          <p className="text-lg font-semibold text-white">Még nincs rendelésed</p>
          <p className="mt-2 text-sm text-white/50">Kezdd egy QR szkenneléssel vagy válassz helyet a listából.</p>
          <button onClick={() => router.push('/customer/scan')} className="btn-kapakka mx-auto mt-6 max-w-xs">
            QR kód szkennelés
          </button>
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-3">
          {orders.map((order) => (
            <button key={order.id} onClick={() => router.push(`/customer/orders/${order.id}`)} className="venue-card-modern p-5 text-left">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-white/30">Rendelés</p>
                  <p className="mt-1 text-lg font-bold text-white">{order.order_number}</p>
                </div>
                <span className={`badge ${STATUS_BADGE[order.status] || 'badge-done'}`}>{STATUS_LABELS[order.status]}</span>
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">{order.venue?.name}</p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-semibold text-amber-400">{formatPrice(order.total)}</span>
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
      {renderSectionHeader('Profil', 'Gyors hozzáférés a személyes adataidhoz, pontjaidhoz és legfontosabb vendégműveleteidhez.', 'home')}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_0.9fr]">
        <div className="hero-card p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-amber-500 text-2xl font-black text-black shadow-xl">
              {profile?.full_name?.[0]?.toUpperCase() || 'K'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-2xl font-bold text-white">{profile?.full_name || 'Kapakka vendég'}</p>
              <p className="truncate text-sm text-white/50">{profile?.email}</p>
            </div>
          </div>
          <div className="mt-6 rounded-[24px] border border-amber-500/20 bg-amber-500/10 p-5">
            <div className="flex items-center gap-3 text-amber-400">
              <Heart className="h-6 w-6" />
              <span className="text-sm uppercase tracking-[0.24em]">Hűségpontok</span>
            </div>
            <p className="mt-3 text-4xl font-black text-white">{profile?.loyalty_points || 0}</p>
          </div>
        </div>

        <div className="space-y-3">
          {[
            {
              icon: <ClipboardList className="h-5 w-5" />,
              label: 'Rendeléseim',
              caption: 'Korábbi és folyamatban lévő rendelések',
              action: () => setTab('orders'),
            },
            {
              icon: <Bell className="h-5 w-5" />,
              label: 'Értesítések',
              caption: 'Státuszok, akciók és helyszín frissítések',
              action: () => router.push('/customer/notifications'),
            },
            {
              icon: <Store className="h-5 w-5" />,
              label: 'Kocsmák',
              caption: 'Nyisd meg a helylistát és a digitális étlapokat',
              action: () => setTab('pubs'),
            },
          ].map((item) => (
            <button key={item.label} onClick={item.action} className="profile-option-card w-full p-4 text-left">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-3 text-amber-400">{item.icon}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white">{item.label}</p>
                  <p className="mt-1 text-sm text-white/50">{item.caption}</p>
                </div>
                <ChevronRight className="h-5 w-5 flex-shrink-0 text-white/30" />
              </div>
            </button>
          ))}

          <button onClick={logout} className="btn-outline border-red-500/30 text-red-300 hover:bg-red-500/10 hover:text-red-200">
            Kijelentkezés
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="app-shell pb-28 md:pb-10">
      <header className="hidden border-b border-white/10 bg-black/20 backdrop-blur-xl lg:block">
        <div className="customer-container flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/10 bg-white/10 text-amber-400 shadow-2xl">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.34em] text-white/30">Kapakka</p>
              <p className="text-sm text-white/70">Vendég app</p>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            {navItems.slice(0, 4).map((item) => (
              <button key={item.id} onClick={() => setTab(item.id)} className={`desktop-nav-pill ${tab === item.id ? 'active' : ''}`}>
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/customer/scan')} className="btn-kapakka w-auto px-5 py-3">
              <QrCode className="h-4 w-4" />
              QR szkennelés
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
            <p className="mt-1 text-sm text-white/50">Gyorsabban rendelhetsz, játszhatsz és nyomon követhetsz mindent.</p>
          </div>
          <button onClick={() => router.push('/customer/scan')} className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-amber-500 text-black shadow-xl">
            <QrCode className="h-5 w-5" />
          </button>
        </div>

        {tab === 'home' && <HomeContent />}
        {tab === 'pubs' && <PubsContent />}
        {tab === 'games' && <GamesContent />}
        {tab === 'orders' && <OrdersContent />}
        {tab === 'profile' && <ProfileContent />}
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
