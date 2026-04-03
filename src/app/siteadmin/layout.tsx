'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  Building2,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  Sparkles,
  Store,
  Users,
  X,
} from 'lucide-react'

const SITEADMIN_NAV = [
  { href: '/siteadmin', label: 'Common Admin', icon: LayoutDashboard },
  { href: '/siteadmin/venues', label: 'Venue registry', icon: Building2 },
]

export default function SiteAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [sideOpen, setSideOpen] = useState(false)
  const [authState, setAuthState] = useState<'loading' | 'ok' | 'no-auth' | 'no-permission'>('loading')

  useEffect(() => {
    async function init() {
      const {
        data: { user: authUser },
        error,
      } = await supabase.auth.getUser()

      if (error || !authUser) {
        setAuthState('no-auth')
        return
      }

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single()
      const role = profile?.role || authUser.user_metadata?.role

      if (role !== 'superadmin') {
        setAuthState('no-permission')
        return
      }

      setUser(profile || { id: authUser.id, email: authUser.email, role })
      setAuthState('ok')
    }

    void init()
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/')
  }

  if (authState === 'loading') {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-[30px] border border-white/10 bg-white/10 text-white shadow-2xl">
          <Shield className="h-10 w-10 anim-pulse" />
        </div>
      </div>
    )
  }

  if (authState === 'no-auth') {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center px-4">
        <div className="hero-card w-full max-w-xl p-8 text-center">
          <h1 className="section-title">Bejelentkezés szükséges</h1>
          <p className="section-subtitle mt-3">A Site Admin használatához be kell jelentkezned.</p>
          <button onClick={() => router.push('/')} className="btn-kapakka mx-auto mt-6 max-w-xs">Vissza a belépéshez</button>
        </div>
      </div>
    )
  }

  if (authState === 'no-permission') {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center px-4">
        <div className="hero-card w-full max-w-xl p-8 text-center">
          <div className="section-kicker mx-auto mb-4 w-fit"><Shield className="h-4 w-4" /> Site admin hozzáférés szükséges</div>
          <h1 className="section-title">Ez a felület csak superadmin szerepkörrel érhető el.</h1>
          <p className="section-subtitle mt-3">A venue-admin és a site-admin innentől külön működik. Ha venue-admin vagy, használd a /admin felületet.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button onClick={() => router.push('/admin')} className="btn-kapakka sm:w-auto sm:px-6">Venue admin</button>
            <button onClick={() => router.push('/customer')} className="btn-outline sm:w-auto sm:px-6">Vendég oldal</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-app">
      <aside className={`admin-sidebar ${sideOpen ? 'is-open' : ''}`}>
        <div className="rounded-[26px] border border-white/10 bg-white/5 p-4 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-violet-500 text-white shadow-xl">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-black tracking-[0.2em]">KAPAKKA</p>
                <p className="text-xs text-white/55">Site Admin</p>
              </div>
            </div>
            <button onClick={() => setSideOpen(false)} className="rounded-full border border-white/10 bg-white/5 p-2 text-white/50 lg:hidden">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 rounded-[20px] border border-white/10 bg-black/10 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">Hatókör</p>
            <p className="mt-2 text-xl font-black">Platform szint</p>
            <p className="mt-1 text-sm text-white/45">Common Admin, integrációk, release és teljes venue inventory.</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
          {SITEADMIN_NAV.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || (item.href !== '/siteadmin' && pathname?.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href} onClick={() => setSideOpen(false)} className={`admin-nav-link ${active ? 'active' : ''}`}>
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-white">
          <p className="text-sm font-semibold">{user?.full_name || user?.email || 'Site admin'}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/35">{user?.role || 'superadmin'}</p>
          <div className="mt-4 flex flex-col gap-2">
            <button onClick={() => router.push('/admin')} className="btn-outline">
              <Store className="h-4 w-4" /> Venue admin
            </button>
            <button onClick={logout} className="btn-outline">
              <LogOut className="h-4 w-4" /> Kijelentkezés
            </button>
          </div>
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
                  platform control center
                </div>
                <h1 className="text-2xl font-bold text-white lg:text-3xl">Kapakka Site Admin</h1>
              </div>
            </div>
            <div className="hidden rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-right text-white/70 xl:block">
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">Aktív superadmin</p>
              <p className="mt-1 font-semibold text-white">{user?.email}</p>
            </div>
          </div>
        </header>
        <div className="admin-page">{children}</div>
      </main>
    </div>
  )
}
