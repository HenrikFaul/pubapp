'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatPrice, timeAgo } from '@/lib/utils'
import { ArrowLeft, Search, Store, MapPin, Star, ShoppingBag, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function VenuesPage() {
  const [venues, setVenues] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [venueStats, setVenueStats] = useState<Record<string, { orders: number; revenue: number }>>({})

  useEffect(() => {
    async function fetchData() {
      const { data: v } = await supabase
        .from('venues')
        .select('*, owner:profiles(full_name, email)')
        .order('created_at', { ascending: false })
      setVenues(v || [])

      const { data: orders } = await supabase
        .from('orders')
        .select('venue_id, total')
        .not('status', 'eq', 'cancelled')

      const statsMap: Record<string, { orders: number; revenue: number }> = {}
      orders?.forEach((o: any) => {
        if (!statsMap[o.venue_id]) statsMap[o.venue_id] = { orders: 0, revenue: 0 }
        statsMap[o.venue_id].orders += 1
        statsMap[o.venue_id].revenue += o.total || 0
      })
      setVenueStats(statsMap)
      setLoading(false)
    }

    void fetchData()
  }, [])

  async function toggleActive(venueId: string, isActive: boolean) {
    await supabase
      .from('venues')
      .update({ is_active: !isActive, updated_at: new Date().toISOString() })
      .eq('id', venueId)
    setVenues((prev) => prev.map((v) => (v.id === venueId ? { ...v, is_active: !isActive } : v)))
    toast.success(isActive ? 'Helyszín deaktiválva' : 'Helyszín aktiválva')
  }

  const filtered = venues.filter(
    (v) =>
      v.name?.toLowerCase().includes(search.toLowerCase()) ||
      v.address?.toLowerCase().includes(search.toLowerCase()) ||
      v.city?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <section className="admin-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="section-kicker mb-3">platform venue inventory</div>
            <h2 className="text-3xl font-bold text-white lg:text-4xl">Site Admin - teljes venue registry</h2>
            <p className="mt-3 max-w-3xl text-sm text-white/60">
              Ez a nézet a különálló Site Admin része. A Common Admin dashboard a /siteadmin főoldalon érhető el,
              itt pedig az összes regisztrált venue platformszintű áttekintése és aktiválása történik.
            </p>
          </div>
          <Link href="/siteadmin" className="btn-outline w-full justify-between px-5 py-4 xl:w-auto">
            <span className="inline-flex items-center gap-2"><ArrowLeft className="h-4 w-4" /> Vissza a Common Adminra</span>
          </Link>
        </div>
      </section>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Helyszínek</h1>
          <p className="text-slate-400 text-sm mt-1">{venues.length} regisztrált helyszín</p>
        </div>
      </div>

      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Keresés névre, címre, városra..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 animate-pulse">Betöltés...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Store className="w-10 h-10 mx-auto mb-3 text-slate-600" />
          <p>Nincs regisztrált helyszín</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((venue) => {
            const stats = venueStats[venue.id] || { orders: 0, revenue: 0 }
            return (
              <div
                key={venue.id}
                className={`bg-slate-800/30 border rounded-2xl overflow-hidden transition-all ${
                  venue.is_active ? 'border-slate-700/30' : 'border-red-500/20 opacity-60'
                }`}
              >
                <div
                  className="h-2"
                  style={{
                    background: venue.is_active
                      ? 'linear-gradient(90deg, #6366f1, #8b5cf6)'
                      : 'linear-gradient(90deg, #ef4444, #dc2626)',
                  }}
                />

                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-base truncate">{venue.name}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                        <span className="text-slate-400 text-xs truncate">{venue.address || venue.city}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleActive(venue.id, venue.is_active)}
                      className="flex-shrink-0 ml-2"
                      title={venue.is_active ? 'Deaktiválás' : 'Aktiválás'}
                    >
                      {venue.is_active ? (
                        <ToggleRight className="w-7 h-7 text-green-400" />
                      ) : (
                        <ToggleLeft className="w-7 h-7 text-slate-600" />
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-slate-900/50 rounded-lg p-2.5 text-center">
                      <ShoppingBag className="w-3.5 h-3.5 text-amber-400 mx-auto mb-1" />
                      <p className="text-white font-bold text-sm">{stats.orders}</p>
                      <p className="text-slate-500 text-xs">Rendelés</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-2.5 text-center">
                      <Star className="w-3.5 h-3.5 text-amber-400 mx-auto mb-1" />
                      <p className="text-white font-bold text-sm">{venue.rating?.toFixed(1) || '—'}</p>
                      <p className="text-slate-500 text-xs">Értékelés</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-emerald-400 font-bold mb-0.5">HUF</p>
                      <p className="text-white font-bold text-sm">
                        {stats.revenue > 0 ? Math.round(stats.revenue / 1000) + 'k' : '0'}
                      </p>
                      <p className="text-slate-500 text-xs">Bevétel</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {venue.has_table_service && <span className="bg-slate-700/30 text-slate-400 text-xs px-2 py-0.5 rounded-full">🪑 Asztal</span>}
                    {venue.has_bar_service && <span className="bg-slate-700/30 text-slate-400 text-xs px-2 py-0.5 rounded-full">🍺 Pult</span>}
                    {venue.has_kitchen && <span className="bg-slate-700/30 text-slate-400 text-xs px-2 py-0.5 rounded-full">👨‍🍳 Konyha</span>}
                    {venue.accepts_card && <span className="bg-slate-700/30 text-slate-400 text-xs px-2 py-0.5 rounded-full">💳</span>}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-700/30">
                    <span className="text-slate-500 text-xs">
                      Tulajdonos: {venue.owner?.full_name || venue.owner?.email || '?'}
                    </span>
                    <span className="text-slate-600 text-xs">{timeAgo(venue.created_at)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
