'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
  LayoutDashboard, ShoppingBag, UtensilsCrossed, BarChart3,
  Settings, Package, HelpCircle, LogOut, Menu, X, Beer, Bell
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/admin', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Kiszolgálás' },
  { href: '/admin/orders', icon: <ShoppingBag className="w-5 h-5" />, label: 'Rendelések' },
  { href: '/admin/menu', icon: <UtensilsCrossed className="w-5 h-5" />, label: 'Étlap' },
  { href: '/admin/inventory', icon: <Package className="w-5 h-5" />, label: 'Készlet' },
  { href: '/admin/stats', icon: <BarChart3 className="w-5 h-5" />, label: 'Statisztikák' },
  { href: '/admin/config', icon: <Settings className="w-5 h-5" />, label: 'Konfigurátor' },
  { href: '/admin/help', icon: <HelpCircle className="w-5 h-5" />, label: 'Segítség' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [venue, setVenue] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    checkAuthAndVenue()
  }, [])

  async function checkAuthAndVenue() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { router.push('/'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*, venue:venues(*)')
      .eq('id', authUser.id)
      .single()

    if (!profile || !['admin', 'staff', 'superadmin'].includes(profile.role)) {
      router.push('/customer')
      return
    }

    setUser(profile)
    setVenue(profile.venue)

    // If admin has no venue yet, redirect to setup (unless already there)
    if (!profile.venue_id && !pathname?.includes('/setup')) {
      router.push('/admin/setup')
      return
    }

    if (profile.venue_id) {
      subscribeToPendingOrders(profile.venue_id)
    }
  }

  function subscribeToPendingOrders(venueId: string) {
    const fetchCount = async () => {
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('venue_id', venueId)
        .eq('status', 'pending')
      setPendingCount(count || 0)
    }
    fetchCount()

    supabase
      .channel('admin-pending')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchCount)
      .subscribe()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-50 w-56 bg-stone-900 text-stone-100 flex flex-col
        transform transition-transform md:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="px-4 py-5 border-b border-stone-700/50 flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
            <Beer className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm" style={{ fontFamily: 'Playfair Display, serif' }}>Kapakka</p>
            <p className="text-stone-400 text-xs truncate max-w-[120px]">{venue?.name || 'Admin'}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1">
          {NAV_ITEMS.map(item => {
            const active = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${
                  active ? 'bg-amber-600 text-white' : 'text-stone-400 hover:text-white hover:bg-stone-800'
                }`}
              >
                {item.icon}
                {item.label}
                {item.href === '/admin' && pendingCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {pendingCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        <div className="px-3 py-4 border-t border-stone-700/50">
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {user?.full_name?.[0] || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user?.full_name || 'Admin'}</p>
              <p className="text-stone-400 text-xs capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-stone-400 hover:text-red-400 hover:bg-stone-800 rounded-lg text-sm transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Kijelentkezés
          </button>
        </div>
      </aside>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-stone-200 px-4 py-3 flex items-center gap-4 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden w-9 h-9 bg-stone-100 rounded-lg flex items-center justify-center"
          >
            <Menu className="w-5 h-5 text-stone-600" />
          </button>

          <div className="flex-1">
            <h1 className="font-semibold text-stone-800 text-sm">{venue?.name || 'Kapakka Admin'}</h1>
          </div>

          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium animate-pulse">
                <Bell className="w-4 h-4" />
                {pendingCount} új rendelés
              </div>
            )}
            <div className="w-2 h-2 bg-green-500 rounded-full" title="Rendszer aktív" />
            <span className="text-xs text-stone-400">Élő</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
