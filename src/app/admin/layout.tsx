'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  BarChart3,
  CalendarClock,
  ClipboardList,
  FileDown,
  HelpCircle,
  LogOut,
  Menu,
  Monitor,
  Package,
  Settings,
  Shield,
  Sparkles,
  Store,
  UtensilsCrossed,
  X,
  Zap,
} from 'lucide-react'

const NAV = [
  { href: '/admin', label: 'Élő kiszolgálás', icon: Zap },
  { href: '/admin/kds', label: 'Konyha monitor', icon: Monitor },
  { href: '/admin/orders', label: 'Rendelések', icon: ClipboardList },
  { href: '/admin/menu', label: 'Étlap', icon: UtensilsCrossed },
  { href: '/admin/reservations', label: 'Foglalások', icon: CalendarClock },
  { href: '/admin/inventory', label: 'Készlet', icon: Package },
  { href: '/admin/stats', label: 'Statisztikák', icon: BarChart3 },
  { href: '/admin/reports', label: 'Riportok', icon: FileDown },
  { href: '/admin/config', label: 'Konfigurátor', icon: Settings },
  { href: '/admin/help', label: 'Segítség', icon: HelpCircle },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [venue, setVenue] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [pending, setPending] = useState(0)
  const [sideOpen, setSideOpen] = useState(false)
  const [authState, setAuthState] = useState<'loading' | 'ok' | 'no-auth' | 'no-permission'>('loading')

  useEffect(() => {
    let liveChannel: any

    async function init() {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !authUser) {
        setAuthState('no-auth')
        return
      }

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single()
      const userRole = profile?.role || authUser.user_metadata?.role

      if (!userRole || !['admin', 'staff', 'superadmin'].includes(userRole)) {
        setAuthState('no-permission')
        return
      }

      setUser(profile || { id: authUser.id, email: authUser.email, role: userRole })
      setAuthState('ok')

      if (profile?.venue_id) {
        const { data: venueRow } = await supabase.from('venues').select('*').eq('id', profile.venue_id).single()
        setVenue(venueRow || null)

        const fetchPending = async () => {
          const { count } = await supabase
            .from('orders')
            .select('*', { head: true, count: 'exact' })
            .eq('venue_id', profile.venue_id)
            .in('status', ['pending', 'accepted', 'preparing', 'ready'])
          setPending(count || 0)
        }

        await fetchPending()
        liveChannel = supabase
          .channel('admin-live-orders')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchPending)
          .subscribe()
      } else if (!pathname?.startsWith('/admin/setup')) {
        router.push('/admin/setup')
      }
    }

    void init()

    return () => {
      if (liveChannel) supabase.removeChannel(liveChannel)
    }
  }, [pathname, router])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (pathname === '/admin/kds') return <>{children}</>

  if (authState === 'loading') {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-[30px] border border-white/10 bg-white/10 text-white shadow-2xl">
          <Store className="h-10 w-10 anim-pulse" />
        </div>
      </div>
    )
  }

  if (authState === 'no-auth') {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center px-4">
        <div className="hero-card w-full max-w-xl p-8 text-center">
          <h1 className="section-title">Bejelentkezés szükséges</h1>
          <p className="section-subtitle mt-3">Az admin panel használatához be kell jelentkezned.</p>
          <button onClick={() => router.push('/')} className="btn-kapakka mx-auto mt-6 max-w-xs">Vissza a belépéshez</button>
        </div>
      </div>
    )
  }

  if (authState === 'no-permission') {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center px-4">
        <div className="hero-card w-full max-w-xl p-8 text-center">
          <div className="section-kicker mx-auto mb-4 w-fit"><Shield className="h-4 w-4" /> Nincs admin hozzáférés</div>
          <h1 className="section-title">Ez a fiók csak vendég oldalra jogosult.</h1>
          <p className="section-subtitle mt-3">Ha venue kezelő vagy, a site adminnak kell hozzárendelnie a szerepkört.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button onClick={() => router.push('/customer')} className="btn-kapakka sm:w-auto sm:px-6">Vendég felület</button>
            <button onClick={logout} className="btn-outline sm:w-auto sm:px-6">Kijelentkezés</button>
          </div>
        </div>
      </div>
    )
  }

  const isSuperAdmin = user?.role === 'superadmin'

  return (
    <div className="admin-app">
      <aside className={`admin-sidebar ${sideOpen ? 'is-open' : ''}`}>
        <div className="rounded-[26px] border border-white/10 bg-white/5 p-4 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-amber-500 text-black shadow-xl">
                <Store className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-black tracking-[0.2em]">KAPAKKA</p>
                <p className="text-xs text-white/55">{venue?.name || 'Venue control'}</p>
              </div>
            </div>
            <button onClick={() => setSideOpen(false)} className="rounded-full border border-white/10 bg-white/5 p-2 text-white/50 lg:hidden">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 rounded-[20px] border border-white/10 bg-black/10 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">Aktív queue</p>
            <p className="mt-2 text-3xl font-black">{pending}</p>
            <p className="mt-1 text-sm text-white/45">élő rendelés vagy pickup státusz</p>
          </div>
          {isSuperAdmin && (
            <div className="mt-4 rounded-[20px] border border-violet-400/20 bg-violet-500/10 p-4 text-white">
              <p className="text-xs uppercase tracking-[0.2em] text-violet-200/80">Platform szint</p>
              <p className="mt-2 text-sm font-semibold text-white">A Site Admin külön felületre került.</p>
              <p className="mt-1 text-xs text-white/55">A platformszintű common_admin funkciók a venue-admintól elkülönülve érhetők el.</p>
              <button onClick={() => router.push('/siteadmin')} className="btn-outline mt-3 w-full border-violet-400/30 text-violet-100 hover:bg-violet-500/10">
                <Shield className="h-4 w-4" /> Site Admin megnyitása
              </button>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href} onClick={() => setSideOpen(false)} className={`admin-nav-link ${active ? 'active' : ''}`}>
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {item.href === '/admin' && pending > 0 && (
                  <span className="ml-auto inline-flex min-w-[22px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] font-black text-white">{pending}</span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-white">
          <p className="text-sm font-semibold">{user?.full_name || user?.email || 'Venue admin'}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/35">{user?.role || 'admin'}</p>
          <button onClick={logout} className="btn-outline mt-4">
            <LogOut className="h-4 w-4" /> Kijelentkezés
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-page flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setSideOpen(true)} className="inline-flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/10 bg-white/5 text-white lg:hidden">
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <div className="section-kicker mb-2">
                  <Sparkles className="h-4 w-4" />
                  venue control center
                </div>
                <h1 className="text-2xl font-bold text-white lg:text-3xl">{venue?.name || 'Kapakka Admin'}</h1>
              </div>
            </div>
            <div className="hidden rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-right text-white/70 xl:block">
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">Aktív user</p>
              <p className="mt-1 font-semibold text-white">{user?.email}</p>
            </div>
          </div>
        </header>
        <div className="admin-page">{children}</div>
      </main>
    </div>
  )
}
