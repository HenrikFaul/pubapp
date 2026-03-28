'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, ShoppingBag, Users, DollarSign } from 'lucide-react'

type Period = 'today' | 'week' | 'month'

const COLORS = ['#F59E0B', '#D97706', '#92400E', '#78350F', '#451A03', '#fbbf24', '#fde68a']

export default function StatsPage() {
  const [period, setPeriod] = useState<Period>('today')
  const [stats, setStats] = useState<any>(null)
  const [hourlyData, setHourlyData] = useState<any[]>([])
  const [categoryData, setCategoryData] = useState<any[]>([])
  const [topItems, setTopItems] = useState<any[]>([])
  const [venueId, setVenueId] = useState<string | null>(null)

  const fetchStats = useCallback(async (vid: string, p: Period) => {
    const now = new Date()
    let startDate: string
    if (p === 'today') startDate = new Date(now.setHours(0,0,0,0)).toISOString()
    else if (p === 'week') { const d = new Date(); d.setDate(d.getDate() - 7); startDate = d.toISOString() }
    else { const d = new Date(); d.setDate(1); startDate = d.toISOString() }

    // Aggregate stats
    const { data: orders } = await supabase
      .from('orders')
      .select('total, placed_at, status')
      .eq('venue_id', vid)
      .gte('placed_at', startDate)
      .not('status', 'eq', 'cancelled')

    if (orders) {
      const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0)
      setStats({
        total_orders: orders.length,
        total_revenue: totalRevenue,
        avg_order: orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0,
      })

      // Hourly breakdown
      const hourMap: Record<number, number> = {}
      orders.forEach(o => {
        const h = new Date(o.placed_at).getHours()
        hourMap[h] = (hourMap[h] || 0) + 1
      })
      setHourlyData(
        Array.from({ length: 24 }, (_, h) => ({
          hour: `${h}:00`,
          rendelés: hourMap[h] || 0,
        })).filter((_, h) => h >= 10)
      )
    }

    // Top items
    const { data: items } = await supabase
      .from('order_items')
      .select('quantity, menu_item:menu_items(name, category:menu_categories(name))')
      .gte('created_at', startDate)

    if (items) {
      const itemMap: Record<string, { name: string; quantity: number; category: string }> = {}
      items.forEach((i: any) => {
        const name = i.menu_item?.name || 'Unknown'
        if (!itemMap[name]) itemMap[name] = { name, quantity: 0, category: i.menu_item?.category?.name || '' }
        itemMap[name].quantity += i.quantity
      })
      const sorted = Object.values(itemMap).sort((a, b) => b.quantity - a.quantity).slice(0, 10)
      setTopItems(sorted)

      // Category breakdown
      const catMap: Record<string, number> = {}
      items.forEach((i: any) => {
        const cat = i.menu_item?.category?.name || 'Egyéb'
        catMap[cat] = (catMap[cat] || 0) + (i.quantity || 1)
      })
      setCategoryData(Object.entries(catMap).map(([name, value]) => ({ name, value })))
    }
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('venue_id').eq('id', user.id).single()
      if (!profile?.venue_id) return
      setVenueId(profile.venue_id)
      fetchStats(profile.venue_id, period)
    }
    init()
  }, [fetchStats, period])

  useEffect(() => {
    if (venueId) fetchStats(venueId, period)
  }, [venueId, period, fetchStats])

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-stone-800" style={{ fontFamily: 'Playfair Display, serif' }}>Statisztikák</h1>
          <p className="text-stone-500 text-sm">Teljesítmény áttekintése</p>
        </div>
        <div className="flex gap-2 bg-stone-100 p-1 rounded-xl">
          {(['today', 'week', 'month'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${period === p ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}
            >
              {p === 'today' ? 'Ma' : p === 'week' ? 'Hét' : 'Hónap'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Rendelések', value: stats?.total_orders || 0, format: 'n', icon: <ShoppingBag className="w-4 h-4" />, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Bevétel', value: stats?.total_revenue || 0, format: 'price', icon: <DollarSign className="w-4 h-4" />, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Átlag rendelés', value: stats?.avg_order || 0, format: 'price', icon: <TrendingUp className="w-4 h-4" />, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map(kpi => (
          <div key={kpi.label} className={`${kpi.bg} rounded-2xl p-4`}>
            <div className={`${kpi.color} mb-2`}>{kpi.icon}</div>
            <p className={`text-2xl font-bold ${kpi.color}`}>
              {kpi.format === 'price' ? formatPrice(kpi.value) : kpi.value}
            </p>
            <p className="text-stone-500 text-xs mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Hourly chart */}
      {hourlyData.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-stone-100 mb-4">
          <h2 className="font-bold text-stone-700 text-sm mb-4 uppercase tracking-wide">Rendelések óránként</h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={hourlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="rendelés" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Category pie */}
        {categoryData.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-stone-100">
            <h2 className="font-bold text-stone-700 text-sm mb-4 uppercase tracking-wide">Kategóriák</h2>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={0}>
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {categoryData.slice(0, 5).map((cat, i) => (
                  <div key={cat.name} className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-stone-600 truncate">{cat.name}</span>
                    <span className="ml-auto font-semibold text-stone-800">{cat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Top items */}
        {topItems.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-stone-100">
            <h2 className="font-bold text-stone-700 text-sm mb-4 uppercase tracking-wide">Népszerű rendelések</h2>
            <div className="space-y-2">
              {topItems.slice(0, 6).map((item, i) => {
                const max = topItems[0].quantity
                return (
                  <div key={item.name}>
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="text-stone-600 truncate flex-1">{item.name}</span>
                      <span className="font-bold text-stone-800 ml-2">{item.quantity}</span>
                    </div>
                    <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all"
                        style={{ width: `${(item.quantity / max) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {(!stats || stats.total_orders === 0) && (
        <div className="text-center py-12 text-stone-400">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 text-stone-200" />
          <p>Még nincs adat erre az időszakra</p>
        </div>
      )}
    </div>
  )
}
