'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Order, OrderStatus } from '@/types'
import { formatPrice, timeAgo } from '@/lib/utils'
import { Check, Clock, ChefHat, Bell, Star, RefreshCw, Zap } from 'lucide-react'
import toast from 'react-hot-toast'

type ViewMode = 'incoming' | 'all'

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [venueId, setVenueId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('incoming')

  const fetchOrders = useCallback(async (vid: string) => {
    const { data } = await supabase
      .from('orders')
      .select('*, items:order_items(*, menu_item:menu_items(name, price)), table:tables(number, name)')
      .eq('venue_id', vid)
      .not('status', 'in', '("completed","cancelled")')
      .order('placed_at', { ascending: true })
    setOrders(data as Order[] || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('venue_id').eq('id', user.id).single()
      if (!profile?.venue_id) return
      setVenueId(profile.venue_id)
      fetchOrders(profile.venue_id)

      // Realtime
      supabase
        .channel('admin-orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `venue_id=eq.${profile.venue_id}` },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              toast.success('🔔 Új rendelés érkezett!', { duration: 5000 })
            }
            fetchOrders(profile.venue_id)
          }
        )
        .subscribe()
    }
    init()
  }, [fetchOrders])

  async function updateStatus(orderId: string, status: OrderStatus) {
    await supabase.from('orders').update({
      status,
      ...(status === 'accepted' ? { accepted_at: new Date().toISOString() } : {}),
      ...(status === 'ready' ? { ready_at: new Date().toISOString() } : {}),
      ...(status === 'delivered' ? { delivered_at: new Date().toISOString() } : {}),
      ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
    }).eq('id', orderId)
  }

  const pendingOrders = orders.filter(o => o.status === 'pending')
  const activeOrders = orders.filter(o => ['accepted', 'preparing', 'ready'].includes(o.status))
  const displayOrders = view === 'incoming' ? [...pendingOrders, ...activeOrders] : orders

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-stone-500 animate-pulse">Betöltés...</div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-stone-800" style={{ fontFamily: 'Playfair Display, serif' }}>Kiszolgálás</h1>
          <p className="text-stone-500 text-sm">Élő rendelések kezelése</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => venueId && fetchOrders(venueId)}
            className="w-9 h-9 bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center justify-center"
          >
            <RefreshCw className="w-4 h-4 text-stone-600" />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Váró', value: pendingOrders.length, color: 'text-yellow-600', bg: 'bg-yellow-50', icon: <Clock className="w-4 h-4" /> },
          { label: 'Aktív', value: activeOrders.filter(o => o.status !== 'ready').length, color: 'text-blue-600', bg: 'bg-blue-50', icon: <ChefHat className="w-4 h-4" /> },
          { label: 'Kész', value: orders.filter(o => o.status === 'ready').length, color: 'text-green-600', bg: 'bg-green-50', icon: <Bell className="w-4 h-4" /> },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-3 flex items-center gap-3`}>
            <div className={`${s.color}`}>{s.icon}</div>
            <div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-stone-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* View toggle */}
      <div className="flex gap-2 mb-5 p-1 bg-stone-100 rounded-xl w-fit">
        {[
          { id: 'incoming' as ViewMode, label: 'Beérkező' },
          { id: 'all' as ViewMode, label: 'Összes' },
        ].map(v => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === v.id ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Order cards */}
      {displayOrders.length === 0 ? (
        <div className="text-center py-16">
          <Zap className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-400 text-lg font-medium">Nincs aktív rendelés</p>
          <p className="text-stone-300 text-sm mt-1">Új rendelés esetén hangjelzés értesít</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayOrders.map(order => (
            <OrderCard key={order.id} order={order} onUpdateStatus={updateStatus} />
          ))}
        </div>
      )}
    </div>
  )
}

function OrderCard({ order, onUpdateStatus }: { order: Order; onUpdateStatus: (id: string, s: OrderStatus) => void }) {
  const isNew = order.status === 'pending'
  const isReady = order.status === 'ready'
  const isVip = order.is_vip

  const statusColors: Record<string, string> = {
    pending: 'border-yellow-300 bg-yellow-50',
    accepted: 'border-blue-200 bg-blue-50',
    preparing: 'border-orange-200 bg-orange-50',
    ready: 'border-green-300 bg-green-50',
    delivered: 'border-purple-200 bg-purple-50',
  }

  return (
    <div className={`rounded-2xl border-2 overflow-hidden shadow-sm transition-all ${statusColors[order.status] || 'border-stone-200 bg-white'} ${isNew ? 'animate-pulse-ring' : ''}`}>
      {/* Card header */}
      <div className="px-4 py-3 bg-white/60 border-b border-black/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-stone-800">{order.order_number}</span>
          {isVip && <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" />}
          {isNew && <span className="bg-yellow-400 text-yellow-900 text-xs px-2 py-0.5 rounded-full font-bold">ÚJ</span>}
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <span>{timeAgo(order.placed_at)}</span>
          {(order as any).table && (
            <span className="bg-stone-200 text-stone-700 px-2 py-0.5 rounded-full">#{(order as any).table.number}</span>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="px-4 py-3 space-y-1">
        {((order.items || []) as any[]).map((item: any) => (
          <div key={item.id} className="flex items-center gap-2 text-sm">
            <span className="font-bold text-stone-700 w-6 text-right">{item.quantity}×</span>
            <span className="text-stone-600">{item.menu_item?.name}</span>
          </div>
        ))}
        {order.notes && (
          <p className="text-xs text-stone-400 mt-2 pt-2 border-t border-stone-200 italic">💬 {order.notes}</p>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-white/60 border-t border-black/5 flex items-center justify-between">
        <div className="text-sm">
          <span className="font-bold text-stone-800">{formatPrice(order.total)}</span>
          <span className="text-stone-400 text-xs ml-2">
            {order.payment_method === 'cash' ? '💵' : '💳'} 
            {order.order_type === 'table_service' ? ' · 🪑' : ' · 🍺'}
          </span>
        </div>

        {/* Action button */}
        {order.status === 'pending' && (
          <button
            onClick={() => onUpdateStatus(order.id, 'accepted')}
            className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Check className="w-3.5 h-3.5" /> Elfogadom
          </button>
        )}
        {order.status === 'accepted' && (
          <button
            onClick={() => onUpdateStatus(order.id, 'preparing')}
            className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
          >
            <ChefHat className="w-3.5 h-3.5" /> Készítés
          </button>
        )}
        {order.status === 'preparing' && (
          <button
            onClick={() => onUpdateStatus(order.id, 'ready')}
            className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
          >
            <Bell className="w-3.5 h-3.5" /> Kész!
          </button>
        )}
        {order.status === 'ready' && (
          <button
            onClick={() => onUpdateStatus(order.id, 'completed')}
            className="bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" /> Átadva
          </button>
        )}
      </div>
    </div>
  )
}
