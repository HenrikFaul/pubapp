'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  Bell,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  FileDown,
  HelpCircle,
  LogOut,
  Menu,
  Monitor,
  Package,
  Settings,
  Shield,
  Store,
  UtensilsCrossed,
  X,
  Zap,
  BarChart3,
} from 'lucide-react'

const NAV = [
  { href: '/admin', label: 'Kiszolgálás', description: 'Élő rendelések és vendégáramlás', icon: Zap },
  { href: '/admin/kds', label: 'Konyha (KDS)', description: 'Konyhai kijelző és tempó', icon: Monitor },
  { href: '/admin/orders', label: 'Rendelések', description: 'Teljes rendeléslista', icon: ClipboardList },
  { href: '/admin/menu', label: 'Étlap', description: 'Termékek, kategóriák, árak', icon: UtensilsCrossed },
  { href: '/admin/reservations', label: 'Foglalások', description: 'Asztalfoglalások és kapacitás', icon: CalendarClock },
  { href: '/admin/inventory', label: 'Készlet', description: 'Stock és figyelmeztetések', icon: Package },
  { href: '/admin/stats', label: 'Statisztikák', description: 'Teljesítmény és trendek', icon: BarChart3 },
  { href: '/admin/reports', label: 'Riportok', description: 'Exportok és összefoglalók', icon: FileDown },
  { href: '/admin/config', label: 'Konfigurátor', description: 'Venue, staff, design, szolgáltatások', icon: Settings },
  { href: '/admin/help', label: 'Segítség', description: 'Támogatás és útmutatók', icon: HelpCircle },
] as const

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [venue, setVenue] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [pending, setPending] = useState(0)
  const [sideOpen, setSideOpen] = useState(false)
  const [authState, setAuthState] = useState<'loading' | 'ok' | 'no-auth' | 'no-permission'>('loading')

  useEffect(() => {
    async function init() {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !authUser) {
        setAuthState('no-auth')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (profileError) {
        const metaRole = authUser.user_metadata?.role as string
        if (metaRole && ['admin', 'staff', 'superadmin'].includes(metaRole)) {
          setUser({ id: authUser.id, email: authUser.email, full_name: authUser.user_metadata?.full_name, role: metaRole })
          setAuthState('ok')
          router.push('/admin/setup')
          return
        }
        setAuthState('no-permission')
        return
      }

      if (!profile) {
        setAuthState('no-permission')
        return
      }

      const userRole = profile.role || 'customer'
      if (!['admin', 'staff', 'superadmin'].includes(userRole)) {
        setAuthState('no-permission')
        return
      }

      setUser(profile)
      setAuthState('ok')

      if (profile.venue_id) {
        const { data: venueData } = await supabase.from('venues').select('*').eq('id', profile.venue_id).single()
        if (venueData) setVenue(venueData)

        const fetchPending = async () => {
          const { count } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('venue_id', profile.venue_id)
            .eq('status', 'pending')
          setPending(count || 0)
        }

        fetchPending()
        supabase.channel('admin-live').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchPending).subscribe()
      } else if (!pathname?.includes('/setup')) {
        router.push('/admin/setup')
      }
    }

    init()
  }, [pathname, router])

  useEffect(() => {
    setSideOpen(false)
  }, [pathname])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const currentNav = useMemo(() => {
    return NAV.find((item) => pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href))) || NAV[0]
  }, [pathname])

  if (pathname === '/admin/kds' && authState === 'ok') {
    return <>{children}</>
  }

  if (authState === 'loading') {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center px-4">
        <div className="hero-card flex w-full max-w-md flex-col items-center gap-4 p-8 text-center">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-[28px] border border-white/10 bg-white/10 text-amber-400">
            <Store className="h-9 w-9 anim-pulse" />
          </div>
          <p className="text-lg font-semibold text-white">Admin felület betöltése...</p>
          <p className="text-sm text-white/50">Ellenőrizzük a jogosultságokat és a venue kapcsolatot.</p>
        </div>
      </div>
    )
  }

  if (authState === 'no-auth') {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center px-4">
        <div className="hero-card w-full max-w-lg p-8 text-center">
          <div className="section-kicker mx-auto mb-4 w-fit">Admin belépés szükséges</div>
          <h1 className="text-3xl font-bold text-white">Jelentkezz be, hogy elérd a venue admin felületet.</h1>
          <p className="mt-3 text-sm text-white/50">A Kapakka admin oldala csak jogosult staff, admin vagy superadmin felhasználóknak érhető el.</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button onClick={() => router.push('/')} className="btn-kapakka sm:w-auto sm:px-6">
              Főoldal megnyitása
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (authState === 'no-permission') {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center px-4">
        <div className="hero-card w-full max-w-xl p-8 text-center">
          <div className="section-kicker mx-auto mb-4 w-fit">Nincs hozzáférés</div>
          <h1 className="text-3xl font-bold text-white">Ez a fiók nem rendelkezik admin jogosultsággal.</h1>
          <p className="mt-3 text-sm text-white/50">Vendégként a customer felületet használhatod, venue oldali hozzáféréshez pedig admin vagy staff szerep szükséges.</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button onClick={() => router.push('/customer')} className="btn-kapakka sm:w-auto sm:px-6">
              Vendég felület
            </button>
            <button onClick={logout} className="btn-outline sm:w-auto sm:px-6">
              Kijelentkezés
            </button>
          </div>
        </div>
      </div>
    )
  }

  const isSuperAdmin = user?.role === 'superadmin'

  return (
    <div className="admin-app">
      <aside className={`admin-sidebar ${sideOpen ? 'is-open' : ''}`}>
        <div className="modern-card overflow-hidden p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-amber-500 text-black shadow-xl">
                <Store className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">KAPAKKA Admin</p>
                <p className="truncate text-xs text-white/40">{venue?.name || 'Venue panel'}</p>
              </div>
            </div>
            <button onClick={() => setSideOpen(false)} className="rounded-2xl border border-white/10 bg-white/5 p-2 text-white/50 lg:hidden">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 rounded-[20px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-white/30">Venue állapot</p>
            <p className="mt-2 text-lg font-bold text-white">{venue?.name || 'Beállítás szükséges'}</p>
            <p className="mt-2 text-sm text-white/50">Rendelés, étlap, riportok és designvezérlés egy adminból.</p>
          </div>
        </div>

        <div className="overflow-y-auto pr-1 scrollbar-hide">
          <p className="mb-3 px-2 text-xs uppercase tracking-[0.26em] text-white/30">Műveletek</p>
          <nav className="space-y-1.5">
            {NAV.map((item) => {
              const Icon = item.icon
              const active = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href))

              return (
                <Link key={item.href} href={item.href} className={`admin-nav-link ${active ? 'active' : ''}`}>
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{item.label}</p>
                    <p className={`truncate text-xs ${active ? 'text-black/65' : 'text-white/30'}`}>{item.description}</p>
                  </div>
                  {item.href === '/admin' && pending > 0 && (
                    <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${active ? 'bg-black/10 text-black' : 'bg-red-500 text-white'}`}>{pending}</span>
                  )}
                </Link>
              )
            })}

            {isSuperAdmin && (
              <Link href="/siteadmin" className="admin-nav-link mt-4 border border-indigo-500/20 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/15">
                <Shield className="h-4 w-4 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate">Site Admin</p>
                  <p className="truncate text-xs text-indigo-200/60">Rendszerszintű felügyelet</p>
                </div>
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </nav>
        </div>

        <div className="modern-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-white/10 text-sm font-black text-white shadow-xl">
              {user?.full_name?.[0] || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user?.full_name || user?.email}</p>
              <p className="truncate text-xs capitalize text-white/40">{user?.role === 'superadmin' ? 'superadmin' : user?.role}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            {venue?.id && (
              <button onClick={() => router.push(`/customer/pub/${venue.id}`)} className="btn-outline justify-between px-4 py-3">
                Vendég nézet megnyitása
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
            <button onClick={logout} className="btn-outline justify-between border-red-500/20 px-4 py-3 text-red-300 hover:bg-red-500/10">
              Kijelentkezés
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-page flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setSideOpen(true)} className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] border border-black/5 bg-white/70 text-[color:var(--admin-heading)] shadow-sm lg:hidden">
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--admin-subtle)]">Kapakka venue admin</p>
                <h1 className="text-2xl font-bold text-[color:var(--admin-heading)]">{currentNav.label}</h1>
                <p className="mt-1 text-sm text-[color:var(--admin-muted)]">{currentNav.description}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/70 px-3 py-2 text-sm font-semibold text-[color:var(--admin-heading)]">
                <Bell className="h-4 w-4 text-[color:var(--accent)]" />
                {pending} függő rendelés
              </div>
              {venue?.name && (
                <div className="hidden rounded-full border border-black/5 bg-white/70 px-3 py-2 text-sm text-[color:var(--admin-muted)] sm:inline-flex">
                  {venue.name}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="admin-page">{children}</main>
      </div>

      {sideOpen && <button aria-label="Sidebar bezárása" className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSideOpen(false)} />}
    </div>
  )
}
