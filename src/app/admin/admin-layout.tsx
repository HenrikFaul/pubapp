'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const NAV = [
  { href: '/admin', label: 'Kiszolgálás', icon: '⚡' },
  { href: '/admin/orders', label: 'Rendelések', icon: '📋' },
  { href: '/admin/menu', label: 'Étlap', icon: '🍽' },
  { href: '/admin/inventory', label: 'Készlet', icon: '📦' },
  { href: '/admin/stats', label: 'Statisztikák', icon: '📊' },
  { href: '/admin/config', label: 'Konfigurátor', icon: '⚙️' },
  { href: '/admin/help', label: 'Segítség', icon: '❓' },
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
      // Check auth
      const { data: { user: u }, error: authError } = await supabase.auth.getUser()
      if (authError || !u) {
        setAuthState('no-auth')
        return
      }

      // Get profile
      const { data: p, error: profileError } = await supabase
        .from('profiles')
        .select('*, venue:venues(*)')
        .eq('id', u.id)
        .single()

      // If profile doesn't exist or role isn't admin - show error screen, DON'T redirect
      // Redirecting to /customer which redirects back to /admin = infinite loop
      if (profileError || !p) {
        console.error('Profile fetch failed:', profileError)
        setAuthState('no-permission')
        return
      }

      if (!['admin', 'staff', 'superadmin'].includes(p.role)) {
        setAuthState('no-permission')
        return
      }

      setUser(p)
      setVenue(p.venue)
      setAuthState('ok')

      // If no venue assigned and not on setup page, go to setup
      if (!p.venue_id && !pathname?.includes('/setup')) {
        router.push('/admin/setup')
        return
      }

      // Fetch pending orders count
      if (p.venue_id) {
        const fetchPending = async () => {
          const { count } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('venue_id', p.venue_id)
            .eq('status', 'pending')
          setPending(count || 0)
        }
        fetchPending()
        supabase.channel('admin-live')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchPending)
          .subscribe()
      }
    }
    init()
  }, [router, pathname])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  // ─── AUTH STATES ────────────────────────────────────────────────

  if (authState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f5f0eb' }}>
        <div className="text-amber-500 text-4xl animate-pulse">🍺</div>
      </div>
    )
  }

  if (authState === 'no-auth') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#f5f0eb' }}>
        <div className="text-4xl">🔒</div>
        <h1 className="text-stone-800 text-xl font-bold">Bejelentkezés szükséges</h1>
        <p className="text-stone-500 text-sm">Az admin panel eléréséhez be kell jelentkezned.</p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-2.5 bg-amber-500 text-white rounded-xl font-medium"
        >
          Bejelentkezés →
        </button>
      </div>
    )
  }

  if (authState === 'no-permission') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#f5f0eb' }}>
        <div className="text-4xl">⛔</div>
        <h1 className="text-stone-800 text-xl font-bold">Nincs hozzáférésed</h1>
        <p className="text-stone-500 text-sm text-center max-w-sm">
          Ez a fiók nem rendelkezik admin jogosultsággal.<br/>
          Ha vendég vagy, használd a vendég felületet.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/customer')}
            className="px-6 py-2.5 bg-amber-500 text-white rounded-xl font-medium"
          >
            Vendég felület →
          </button>
          <button
            onClick={logout}
            className="px-6 py-2.5 border border-stone-300 text-stone-600 rounded-xl font-medium"
          >
            Kijelentkezés
          </button>
        </div>
      </div>
    )
  }

  // ─── ADMIN LAYOUT ──────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f5f0eb' }}>
      {/* Sidebar */}
      <aside className={`admin-sidebar transition-transform duration-300 ${sideOpen ? 'translate-x-0' : ''}`}>
        {/* Logo */}
        <div className="px-4 py-5 border-b border-white/8 flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-lg">🍺</div>
          <div>
            <p className="text-white font-bold text-sm">KAPAKKA</p>
            <p className="text-white/40 text-xs truncate max-w-[130px]">{venue?.name || 'Admin'}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {NAV.map(item => {
            const active = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href} onClick={() => setSideOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${active ? 'bg-amber-600 text-white' : 'text-white/50 hover:text-white hover:bg-white/10'}`}>
                <span className="text-base">{item.icon}</span>
                {item.label}
                {item.href === '/admin' && pending > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{pending}</span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-white/8">
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {user?.full_name?.[0] || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user?.full_name}</p>
              <p className="text-white/30 text-xs capitalize">{user?.role}</p>
            </div>
          </div>
          <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 text-white/30 hover:text-red-400 rounded-lg text-xs transition-colors">
            🚪 Kijelentkezés
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sideOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSideOpen(false)} />}

      {/* Main */}
      <div className="admin-main flex-1 overflow-y-auto">
        {/* Top bar */}
        <header className="bg-white border-b border-stone-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
          <button onClick={() => setSideOpen(true)} className="md:hidden w-9 h-9 bg-stone-100 rounded-lg flex items-center justify-center text-lg">☰</button>
          <span className="font-bold text-stone-800 text-sm flex-1">{venue?.name || 'Kapakka Admin'}</span>
          {pending > 0 && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-xs font-bold animate-pulse">
              🔔 {pending} új rendelés
            </div>
          )}
          <div className="w-2 h-2 bg-green-500 rounded-full" />
        </header>
        <main>{children}</main>
      </div>
    </div>
  )
}
