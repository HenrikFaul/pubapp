'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
  Zap, ClipboardList, UtensilsCrossed, Package, BarChart3, Settings, HelpCircle,
  Menu, Bell, LogOut, Shield, ChevronRight, X, Monitor, CalendarClock, FileDown
} from 'lucide-react'

const NAV = [
  { href: '/admin', label: 'Kiszolgálás', icon: Zap },
  { href: '/admin/kds', label: 'Konyha (KDS)', icon: Monitor },
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
    async function init() {
      // Step 1: Check auth
      const { data: { user: u }, error: authError } = await supabase.auth.getUser()
      if (authError || !u) {
        console.log('[Admin] No auth session')
        setAuthState('no-auth')
        return
      }

      // Step 2: Get profile WITHOUT venue join (this is the critical fix!)
      // The venue join can fail if there's no FK constraint or RLS blocks it
      // That failure was causing "no-permission" even for valid admin users
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', u.id)
        .single()

      if (profileError) {
        console.error('[Admin] Profile fetch error:', profileError.message)
        // Fallback: check user metadata for role
        const metaRole = u.user_metadata?.role as string
        if (metaRole && ['admin', 'staff', 'superadmin'].includes(metaRole)) {
          setUser({ id: u.id, email: u.email, full_name: u.user_metadata?.full_name, role: metaRole })
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

      // Step 3: Check role
      const userRole = profile.role || 'customer'
      if (!['admin', 'staff', 'superadmin'].includes(userRole)) {
        setAuthState('no-permission')
        return
      }

      // Step 4: Auth OK! Set user and try to fetch venue separately
      setUser(profile)
      setAuthState('ok')

      if (profile.venue_id) {
        // Venue fetch is NON-BLOCKING - if it fails, admin panel still works
        const { data: venueData } = await supabase
          .from('venues')
          .select('*')
          .eq('id', profile.venue_id)
          .single()
        if (venueData) setVenue(venueData)

        // Pending orders count
        const fetchPending = async () => {
          const { count } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('venue_id', profile.venue_id)
            .eq('status', 'pending')
          setPending(count || 0)
        }
        fetchPending()
        supabase.channel('admin-live')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchPending)
          .subscribe()
      } else if (!pathname?.includes('/setup')) {
        router.push('/admin/setup')
      }
    }
    init()
  }, [router, pathname])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const isKDS = pathname === '/admin/kds'

  if (authState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--admin-bg)' }}>
        <div className="text-amber-500 text-4xl animate-pulse">🍺</div>
      </div>
    )
  }

  if (authState === 'no-auth') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'var(--admin-bg)' }}>
        <div className="text-4xl">🔒</div>
        <h1 className="text-stone-800 text-xl font-bold">Bejelentkezés szükséges</h1>
        <p className="text-stone-500 text-sm">Az admin panel eléréséhez be kell jelentkezned.</p>
        <button onClick={() => router.push('/')} className="px-6 py-2.5 bg-amber-500 text-white rounded-xl font-medium">
          Bejelentkezés →
        </button>
      </div>
    )
  }

  if (authState === 'no-permission') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'var(--admin-bg)' }}>
        <div className="text-4xl">⛔</div>
        <h1 className="text-stone-800 text-xl font-bold">Nincs hozzáférésed</h1>
        <p className="text-stone-500 text-sm text-center max-w-sm">
          Ez a fiók nem rendelkezik admin jogosultsággal.<br/>Ha vendég vagy, használd a vendég felületet.
        </p>
        <div className="flex gap-3">
          <button onClick={() => router.push('/customer')} className="px-6 py-2.5 bg-amber-500 text-white rounded-xl font-medium">Vendég felület →</button>
          <button onClick={logout} className="px-6 py-2.5 border border-stone-300 text-stone-600 rounded-xl font-medium">Kijelentkezés</button>
        </div>
      </div>
    )
  }

  if (isKDS) return <>{children}</>

  const isSuperAdmin = user?.role === 'superadmin'

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--admin-bg)' }}>
      <aside className={`admin-sidebar transition-transform duration-300 ${sideOpen ? 'translate-x-0 !flex' : ''}`}>
        <div className="px-4 py-5 border-b border-white/8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-lg">🍺</div>
            <div>
              <p className="text-white font-bold text-sm">KAPAKKA</p>
              <p className="text-white/40 text-xs truncate max-w-[120px]">{venue?.name || 'Admin'}</p>
            </div>
          </div>
          <button onClick={() => setSideOpen(false)} className="md:hidden text-white/30 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {NAV.map(item => {
            const Icon = item.icon
            const active = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href} onClick={() => setSideOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all relative group ${
                  active
                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
                    : 'text-white/50 hover:text-white hover:bg-white/8'
                }`}>
                <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-white/40 group-hover:text-white/70'}`} />
                {item.label}
                {item.href === '/admin' && pending > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center animate-pulse">{pending}</span>
                )}
              </Link>
            )
          })}

          {isSuperAdmin && (
            <>
              <div className="my-3 mx-3 h-px bg-white/8" />
              <Link href="/siteadmin" onClick={() => setSideOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-indigo-400/70 hover:text-indigo-300 hover:bg-indigo-600/10 transition-all group">
                <Shield className="w-4 h-4 text-indigo-400/50 group-hover:text-indigo-300" />
                Site Admin
                <ChevronRight className="w-3.5 h-3.5 ml-auto text-indigo-400/30" />
              </Link>
            </>
          )}
        </nav>

        <div className="px-3 py-4 border-t border-white/8">
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {user?.full_name?.[0] || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user?.full_name}</p>
              <p className="text-white/30 text-xs capitalize">{user?.role === 'superadmin' ? '🛡️ superadmin' : user?.role}</p>
            </div>
          </div>
          <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 text-white/30 hover:text-red-400 rounded-lg text-xs transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Kijelentkezés
          </button>
        </div>
      </aside>

      {sideOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSideOpen(false)} />}

      <div className="admin-main flex-1 overflow-y-auto">
        <header className="bg-white border-b border-stone-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
          <button onClick={() => setSideOpen(true)} className="md:hidden w-9 h-9 bg-stone-100 rounded-lg flex items-center justify-center">
            <Menu className="w-5 h-5 text-stone-600" />
          </button>
          <span className="font-bold text-stone-800 text-sm flex-1">{venue?.name || 'Kapakka Admin'}</span>
          {pending > 0 && (
            <Link href="/admin" className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-xs font-bold animate-pulse">
              <Bell className="w-3.5 h-3.5" /> {pending} új rendelés
            </Link>
          )}
          <div className="w-2 h-2 bg-green-500 rounded-full" title="Online" />
        </header>
        <main>{children}</main>
      </div>
    </div>
  )
}
