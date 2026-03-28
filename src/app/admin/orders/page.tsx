'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Order, OrderStatus } from '@/types'
import { formatPrice, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, timeAgo } from '@/lib/utils'
import { Search, Filter } from 'lucide-react'

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [venueId, setVenueId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async (vid: string) => {
    let query = supabase
      .from('orders')
      .select('*, table:tables(number), items:order_items(quantity, menu_item:menu_items(name))')
      .eq('venue_id', vid)
      .order('placed_at', { ascending: false })
      .limit(100)

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const { data } = await query
    setOrders(data as Order[] || [])
    setLoading(false)
  }, [statusFilter])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('venue_id').eq('id', user.id).single()
      if (!p?.venue_id) return
      setVenueId(p.venue_id)
      fetchOrders(p.venue_id)
    }
    init()
  }, [fetchOrders])

  useEffect(() => {
    if (venueId) fetchOrders(venueId)
  }, [venueId, statusFilter, fetchOrders])

  const filteredOrders = orders.filter(o =>
    o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-stone-800" style={{ fontFamily: 'Playfair Display, serif' }}>Rendelések</h1>
          <p className="text-stone-500 text-sm">{filteredOrders.length} rendelés</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Keresés rendelésszámra..."
            className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as OrderStatus | 'all')}
          className="input md:w-48"
        >
          <option value="all">Összes státusz</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Orders table */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-stone-400">Betöltés...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <p>Nincs találat</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-100">
                <tr>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">Rendelés</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium hidden md:table-cell">Tételek</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">Státusz</th>
                  <th className="text-right px-4 py-3 text-stone-500 font-medium">Összeg</th>
                  <th className="text-right px-4 py-3 text-stone-500 font-medium hidden md:table-cell">Idő</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-bold text-stone-800">{order.order_number}</p>
                        <p className="text-stone-400 text-xs">
                          {order.order_type === 'table_service' ? `🪑 Asztal #${(order as any).table?.number || '?'}` : '🍺 Pultos'}
                          {' · '}
                          {order.payment_method === 'cash' ? '💵' : '💳'}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-stone-600 text-xs">
                        {((order as any).items || []).slice(0, 2).map((i: any) => `${i.quantity}× ${i.menu_item?.name}`).join(', ')}
                        {(order as any).items?.length > 2 && ` +${(order as any).items.length - 2} más`}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`status-badge ${ORDER_STATUS_COLORS[order.status]}`}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-stone-800">
                      {formatPrice(order.total)}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-400 text-xs hidden md:table-cell">
                      {timeAgo(order.placed_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
