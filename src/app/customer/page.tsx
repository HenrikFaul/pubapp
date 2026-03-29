'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { isOpenNow, formatPrice, timeAgo, STATUS_LABELS, STATUS_BADGE } from '@/lib/utils'

type Tab = 'home' | 'pubs' | 'games' | 'orders' | 'profile'

export default function CustomerPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('home')
  const [venues, setVenues] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const init = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/'); return }

    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()

    // Admin redirect — use replace to avoid history entry
    if (p && ['admin', 'staff', 'superadmin'].includes(p.role)) {
      router.replace('/admin')
      return
    }

    setProfile(p)

    const [{ data: v }, { data: o }] = await Promise.all([
      supabase.from('venues').select('*').eq('is_active', true).order('rating', { ascending: false }),
      supabase.from('orders').select('*, venue:venues(name)').eq('customer_id', user.id).order('placed_at', { ascending: false }).limit(20),
    ])
    setVenues(v || [])
    setOrders(o || [])
    setLoading(false)
  }, [router])

  useEffect(() => { init() }, [init])

  async function logout() { await supabase.auth.signOut(); router.replace('/') }

  const filtered = venues.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.address?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div className="min-h-screen dark-bg flex items-center justify-center">
      <div className="text-amber-400 text-4xl animate-pulse">🍺</div>
    </div>
  )

  // ─── Content sections ────────────────────────────────────────────
  const HomeContent = () => (
    <div>
      {/* Search */}
      <div className="relative mb-5">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setTab('pubs') }}
          placeholder="Keress kocsmanevét..."
          className="kap-input pl-10 pr-14"
        />
        <button onClick={() => router.push('/customer/scan')}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-amber-500 text-black rounded-lg px-2 py-1 text-xs font-bold">QR</button>
      </div>

      {/* Desktop: grid cards / Mobile: strips */}
      <div className="hidden lg:grid lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {[
          { icon:'🍺', label:'Kocsma lista', tab:'pubs' as Tab },
          { icon:'🎁', label:'Ajánlatok', tab:'pubs' as Tab },
          { icon:'📱', label:'Rendeléseim', tab:'orders' as Tab },
          { icon:'📲', label:'QR Szkennelés', action:() => router.push('/customer/scan') },
          { icon:'🎮', label:'Játékok', tab:'games' as Tab },
          { icon:'👤', label:'Profilom', tab:'profile' as Tab },
        ].map(item => (
          <button key={item.label}
            onClick={() => item.action ? item.action() : item.tab && setTab(item.tab)}
            className="glass-card p-6 text-left hover:bg-white/15 transition-colors flex items-center gap-4">
            <span className="text-4xl">{item.icon}</span>
            <span className="text-white font-bold text-lg">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Mobile: strips */}
      <div className="lg:hidden space-y-3 mb-6">
        {[
          {icon:'🍺', label:'LIST OF PUBS', action:() => setTab('pubs')},
          {icon:'🎁', label:'SPECIAL OFFER', action:() => setTab('pubs')},
          {icon:'📱', label:'MY ORDERS', action:() => setTab('orders')},
          {icon:'📲', label:'QR CODE', action:() => router.push('/customer/scan')},
          {icon:'🎮', label:'GAMES', action:() => setTab('games')},
        ].map(item => (
          <button key={item.label} onClick={item.action} className="menu-strip w-full text-left">
            <span className="text-2xl">{item.icon}</span>
            <span>{item.label}</span>
            <span className="ml-auto text-amber-500">→</span>
          </button>
        ))}
      </div>

      {/* Nearby pubs */}
      {venues.length > 0 && (
        <div className="bg-black/40 rounded-2xl p-4">
          <h3 className="text-white/50 text-xs uppercase tracking-widest mb-3">OFFERS NEARBY</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {venues.slice(0, 6).map(v => (
              <button key={v.id} onClick={() => router.push(`/customer/pub/${v.id}`)}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 text-left transition-colors">
                <span className="text-amber-400 text-xl">🍺</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{v.name}</p>
                  <p className="text-white/40 text-xs truncate">{v.address}</p>
                </div>
                <span className={`text-xs font-bold flex-shrink-0 ${isOpenNow(v.opening_hours) ? 'text-green-400' : 'text-red-400'}`}>
                  {isOpenNow(v.opening_hours) ? '● NYITVA' : '● ZÁRVA'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const PubsContent = () => (
    <div>
      <div className="flex items-center gap-3 mb-4 lg:hidden">
        <button onClick={() => setTab('home')} className="text-white/50">←</button>
        <h2 className="text-white font-bold text-lg">Kocsma lista</h2>
      </div>
      <div className="relative mb-4">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Keresés..." className="kap-input pl-10" />
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-white/40">Nincs találat</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(v => (
            <button key={v.id} onClick={() => router.push(`/customer/pub/${v.id}`)}
              className="pub-card text-left p-4 flex gap-4 hover:bg-white/10 transition-colors w-full">
              <div className="w-14 h-14 bg-amber-900/50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">🍺</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-white font-bold">{v.name}</p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-amber-400 text-xs">★</span>
                    <span className="text-white/70 text-xs">{v.rating?.toFixed(1) || '—'}</span>
                  </div>
                </div>
                <p className="text-white/50 text-xs mt-1 truncate">{v.address}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`text-xs font-bold ${isOpenNow(v.opening_hours) ? 'text-green-400' : 'text-red-400'}`}>
                    {isOpenNow(v.opening_hours) ? '● Nyitva' : '● Zárva'}
                  </span>
                  {v.has_table_service && <span className="text-white/30 text-xs">🪑 Table service</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )

  const GamesContent = () => (
    <div>
      <div className="flex items-center gap-3 mb-5 lg:hidden">
        <button onClick={() => setTab('home')} className="text-white/50">←</button>
        <h2 className="text-white font-bold text-lg">Játékok</h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {title:'KOCSMAKVÍZ', emoji:'🧠', color:'#6B21A8', sub:'Teszteld a tudásod!', path:'/customer/games/quiz'},
          {title:'RÉSZEGSÉG MÉRŐ', emoji:'🍺', color:'#B45309', sub:'Mennyi ment le?', path:'/customer/games/drunk-o-meter'},
          {title:'IGAZSÁG VAGY MERÉSZSÉG', emoji:'🎯', color:'#9F1239', sub:'Játssz barátaiddal!', path:'/customer/games/truth-or-dare'},
          {title:'KOCKA JÁTÉK', emoji:'🎲', color:'#065F46', sub:'Ki iszik most?', path:'/customer/games/dice'},
        ].map(g => (
          <button key={g.title} onClick={() => router.push(g.path)}
            style={{background: g.color}}
            className="rounded-2xl p-5 text-left text-white shadow-lg hover:brightness-110 transition-all">
            <div className="text-4xl mb-3">{g.emoji}</div>
            <p className="font-bold text-sm leading-tight">{g.title}</p>
            <p className="text-white/60 text-xs mt-1">{g.sub}</p>
          </button>
        ))}
      </div>
    </div>
  )

  const OrdersContent = () => (
    <div>
      <div className="flex items-center gap-3 mb-5 lg:hidden">
        <button onClick={() => setTab('home')} className="text-white/50">←</button>
        <h2 className="text-white font-bold text-lg">Rendeléseim</h2>
      </div>
      {orders.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📱</div>
          <p className="text-white/50">Még nincs rendelésed</p>
          <button onClick={() => router.push('/customer/scan')} className="btn-kapakka mt-6 max-w-xs mx-auto">QR kód szkennelés</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {orders.map(o => (
            <button key={o.id} onClick={() => router.push(`/customer/orders/${o.id}`)}
              className="pub-card w-full text-left p-4 hover:bg-white/10 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-bold">{o.order_number}</span>
                <span className={`badge ${STATUS_BADGE[o.status] || 'badge-done'}`}>{STATUS_LABELS[o.status]}</span>
              </div>
              <p className="text-white/50 text-sm">{o.venue?.name}</p>
              <div className="flex justify-between mt-2 text-xs">
                <span className="text-amber-400 font-semibold">{formatPrice(o.total)}</span>
                <span className="text-white/30">{timeAgo(o.placed_at)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )

  const ProfileContent = () => (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-5 lg:hidden">
        <button onClick={() => setTab('home')} className="text-white/50">←</button>
        <h2 className="text-white font-bold text-lg">Profilom</h2>
      </div>
      <div className="glass-card p-5 mb-4">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center text-2xl font-bold text-black flex-shrink-0">
            {profile?.full_name?.[0]?.toUpperCase() || 'K'}
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">{profile?.full_name}</h3>
            <p className="text-white/50 text-sm">{profile?.email}</p>
          </div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center gap-4">
          <span className="text-3xl">❤️</span>
          <div>
            <p className="text-white/60 text-xs uppercase tracking-wide">Hűségpontok</p>
            <p className="text-amber-400 font-bold text-2xl">{profile?.loyalty_points || 0}</p>
          </div>
        </div>
      </div>
      <div className="space-y-2 mb-6">
        {[
          {icon:'📱', label:'Rendeléseim', action:() => setTab('orders')},
          {icon:'🔔', label:'Értesítések', action:() => router.push('/customer/notifications')},
          {icon:'🍺', label:'Kocsmák', action:() => setTab('pubs')},
        ].map(item => (
          <button key={item.label} onClick={item.action}
            className="w-full flex items-center gap-4 glass-card p-4 text-left hover:bg-white/10 transition-colors">
            <span className="text-xl">{item.icon}</span>
            <span className="text-white font-medium">{item.label}</span>
            <span className="ml-auto text-white/30">→</span>
          </button>
        ))}
      </div>
      <button onClick={logout} className="w-full py-3 rounded-xl border border-red-500/40 text-red-400 hover:border-red-400 hover:bg-red-900/10 transition-colors font-semibold">
        Kijelentkezés
      </button>
    </div>
  )

  // ─── MAIN LAYOUT ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen dark-bg">
      {/* Desktop: top nav */}
      <header className="hidden lg:flex items-center justify-between px-8 py-4 border-b border-white/10 sticky top-0 z-30 backdrop-blur-sm bg-black/40">
        <div className="flex items-center gap-3">
          <span className="text-amber-400 text-2xl">🍺</span>
          <span className="text-white font-black text-xl tracking-wide" style={{fontFamily:'Bebas Neue, sans-serif'}}>KAPAKKA</span>
        </div>
        <nav className="flex items-center gap-2">
          {[
            {id:'home' as Tab, label:'Főoldal'},
            {id:'pubs' as Tab, label:'Kocsmák'},
            {id:'games' as Tab, label:'Játékok'},
            {id:'orders' as Tab, label:'Rendelések'},
          ].map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === item.id ? 'bg-amber-500 text-black' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/customer/scan')} className="bg-amber-500 text-black font-bold px-4 py-2 rounded-lg text-sm hover:bg-amber-400 transition-colors">
            📲 QR Szkennelés
          </button>
          <button onClick={() => setTab('profile')}
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold transition-colors ${tab === 'profile' ? 'bg-amber-500 text-black' : 'bg-white/20 text-white hover:bg-white/30'}`}>
            {profile?.full_name?.[0]?.toUpperCase() || 'K'}
          </button>
        </div>
      </header>

      {/* Mobile header */}
      <div className="lg:hidden px-4 pt-12 pb-4 flex items-center justify-between">
        <div>
          <p className="text-white/50 text-xs uppercase tracking-widest">KAPAKKA</p>
          <h1 className="text-white font-bold text-lg">{profile?.full_name || 'Vendég'} 🍺</h1>
        </div>
        <button onClick={() => setTab('profile')}
          className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center font-bold text-black">
          {profile?.full_name?.[0]?.toUpperCase() || 'K'}
        </button>
      </div>

      {/* Page title for desktop */}
      {tab !== 'home' && (
        <div className="hidden lg:block px-8 pt-8 pb-2">
          <h2 className="text-white text-2xl font-bold">
            {tab === 'pubs' ? '🍺 Kocsma lista' : tab === 'games' ? '🎮 Játékok' : tab === 'orders' ? '📱 Rendelések' : '👤 Profil'}
          </h2>
        </div>
      )}

      {/* Main content */}
      <main className="px-4 lg:px-8 py-4 lg:py-6 pb-24 lg:pb-8">
        {tab === 'home'    && <HomeContent />}
        {tab === 'pubs'    && <PubsContent />}
        {tab === 'games'   && <GamesContent />}
        {tab === 'orders'  && <OrdersContent />}
        {tab === 'profile' && <ProfileContent />}
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden bottom-nav safe-bottom">
        <div className="flex justify-around py-1">
          {[
            {id:'home' as Tab, icon:'🏠', label:'Főoldal'},
            {id:'pubs' as Tab, icon:'🍺', label:'Kocsmák'},
            {id:'games' as Tab, icon:'🎮', label:'Játékok'},
            {id:'orders' as Tab, icon:'📱', label:'Rendelések'},
            {id:'profile' as Tab, icon:'👤', label:'Profil'},
          ].map(item => (
            <button key={item.id} onClick={() => setTab(item.id)} className={`nav-pill ${tab === item.id ? 'active' : ''}`}>
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
