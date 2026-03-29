'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { formatPrice, timeAgo } from '@/lib/utils'

const STATUS_FLOW: Record<string, string> = {
  pending: 'accepted', accepted: 'preparing', preparing: 'ready', ready: 'completed',
}
const STATUS_BTN: Record<string, string> = {
  pending: '✓ Elfogadom', accepted: '👨‍🍳 Készítés', preparing: '🔔 Kész!', ready: '✅ Átadva',
}
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-50 border-yellow-300',
  accepted: 'bg-blue-50 border-blue-300',
  preparing: 'bg-orange-50 border-orange-300',
  ready: 'bg-green-50 border-green-400',
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState<any[]>([])
  const [venueId, setVenueId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'active' | 'all'>('active')

  const load = useCallback(async (vid: string) => {
    const q = supabase
      .from('orders')
      .select('*, items:order_items(quantity, menu_item:menu_items(name, price)), table:tables(number)')
      .eq('venue_id', vid)
      .order('placed_at', { ascending: true })
    const { data } = view === 'active'
      ? await q.not('status', 'in', '("completed","cancelled")')
      : await q.order('placed_at', { ascending: false }).limit(50)
    setOrders(data || [])
    setLoading(false)
  }, [view])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('venue_id').eq('id', user.id).single()
      if (!p?.venue_id) return
      setVenueId(p.venue_id)
      load(p.venue_id)
      supabase.channel('orders-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `venue_id=eq.${p.venue_id}` }, (pl) => {
          if (pl.eventType === 'INSERT') {
            // Play notification sound
            try { new Audio('/notification.mp3').play() } catch {}
          }
          load(p.venue_id)
        })
        .subscribe()
    }
    init()
  }, [load])

  useEffect(() => { if (venueId) load(venueId) }, [view, venueId, load])

  async function advance(orderId: string, currentStatus: string) {
    const next = STATUS_FLOW[currentStatus]
    if (!next) return
    const ts: Record<string, string> = {}
    if (next === 'accepted') ts.accepted_at = new Date().toISOString()
    if (next === 'ready') ts.ready_at = new Date().toISOString()
    if (next === 'completed') ts.completed_at = new Date().toISOString()
    await supabase.from('orders').update({ status: next, ...ts }).eq('id', orderId)
  }

  async function cancel(orderId: string) {
    if (!confirm('Biztosan törlöd?')) return
    await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId)
  }

  const pending = orders.filter(o => o.status === 'pending').length
  const active = orders.filter(o => ['accepted','preparing'].includes(o.status)).length
  const ready = orders.filter(o => o.status === 'ready').length

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-stone-800">Kiszolgálás</h1>
          <p className="text-stone-400 text-sm">Valós idejű rendelések</p>
        </div>
        <button onClick={() => venueId && load(venueId)} className="w-9 h-9 bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center justify-center text-lg transition-colors">↻</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Váró', value: pending, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Aktív', value: active, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Kész', value: ready, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-stone-500 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* View toggle */}
      <div className="flex gap-2 mb-5 p-1 bg-stone-100 rounded-xl w-fit">
        {[['active','Aktív'],['all','Összes']] .map(([v,l]) => (
          <button key={v} onClick={() => setView(v as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === v ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-stone-400 animate-pulse">Betöltés...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">⚡</div>
          <p className="text-stone-400 text-lg font-medium">Nincs aktív rendelés</p>
          <p className="text-stone-300 text-sm">Új rendelés esetén automatikusan megjelenik</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map(order => (
            <div key={order.id} className={`rounded-2xl border-2 overflow-hidden shadow-sm ${STATUS_COLOR[order.status] || 'bg-white border-stone-200'} ${order.status === 'pending' ? 'ring-2 ring-yellow-400' : ''}`}>
              {/* Card header */}
              <div className="px-4 py-3 bg-white/60 border-b border-black/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-black text-stone-800">{order.order_number}</span>
                  {order.status === 'pending' && <span className="bg-yellow-400 text-yellow-900 text-xs px-2 py-0.5 rounded-full font-black">ÚJ</span>}
                  {order.is_vip && <span className="text-yellow-500">⭐</span>}
                </div>
                <div className="flex items-center gap-2 text-xs text-stone-400">
                  {order.table && <span className="bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full">#{order.table.number}</span>}
                  <span>{timeAgo(order.placed_at)}</span>
                </div>
              </div>

              {/* Items */}
              <div className="px-4 py-3 space-y-1">
                {(order.items || []).map((item: any) => (
                  <div key={item.id} className="flex gap-2 text-sm text-stone-700">
                    <span className="font-bold text-stone-800">{item.quantity}×</span>
                    <span>{item.menu_item?.name}</span>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 bg-white/40 border-t border-black/5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-stone-800">{formatPrice(order.total)}</span>
                  <span className="text-stone-400 text-xs ml-2">
                    {order.payment_method === 'cash' ? '💵' : '💳'} {order.order_type === 'table_service' ? '🪑' : '🍺'}
                  </span>
                </div>
                <div className="flex gap-2">
                  {STATUS_FLOW[order.status] && (
                    <button onClick={() => advance(order.id, order.status)}
                      className="bg-stone-800 hover:bg-black text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                      {STATUS_BTN[order.status]}
                    </button>
                  )}
                  {order.status === 'pending' && (
                    <button onClick={() => cancel(order.id)}
                      className="text-red-400 text-xs px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors">✕</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
