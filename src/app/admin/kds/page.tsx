'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { formatPrice, timeAgo } from '@/lib/utils'
import { Volume2, VolumeX, Maximize, Minimize, RefreshCw, Check, Clock, AlertTriangle } from 'lucide-react'

const STATUS_FLOW: Record<string, string> = {
  pending: 'accepted', accepted: 'preparing', preparing: 'ready',
}

export default function KDSPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [venueId, setVenueId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [soundOn, setSoundOn] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [allDayView, setAllDayView] = useState(false)
  const [kdsSettings, setKdsSettings] = useState({ warning: 10, urgent: 20 })
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const load = useCallback(async (vid: string) => {
    const { data } = await supabase
      .from('orders')
      .select('*, items:order_items(quantity, notes, selected_modifiers, menu_item:menu_items(name, category:menu_categories(name))), table:tables(number)')
      .eq('venue_id', vid)
      .in('status', ['pending', 'accepted', 'preparing', 'ready'])
      .order('placed_at', { ascending: true })
    setOrders(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('venue_id').eq('id', user.id).single()
      if (!p?.venue_id) return
      setVenueId(p.venue_id)
      load(p.venue_id)

      // Venue KDS settings
      const { data: v } = await supabase.from('venues').select('kds_warning_minutes, kds_urgent_minutes').eq('id', p.venue_id).single()
      if (v) setKdsSettings({ warning: v.kds_warning_minutes || 10, urgent: v.kds_urgent_minutes || 20 })

      // Real-time subscription
      supabase.channel('kds-live')
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'orders',
          filter: `venue_id=eq.${p.venue_id}`
        }, (payload) => {
          if (payload.eventType === 'INSERT' && soundOn) {
            try { new Audio('/notification.mp3').play() } catch {}
          }
          load(p.venue_id!)
        })
        .subscribe()
    }
    init()
  }, [load, soundOn])

  async function advanceOrder(orderId: string, currentStatus: string) {
    const next = STATUS_FLOW[currentStatus]
    if (!next) return
    const ts: Record<string, string> = {}
    if (next === 'accepted') ts.accepted_at = new Date().toISOString()
    if (next === 'ready') ts.ready_at = new Date().toISOString()
    await supabase.from('orders').update({ status: next, ...ts }).eq('id', orderId)
  }

  async function completeOrder(orderId: string) {
    await supabase.from('orders').update({
      status: 'completed',
      completed_at: new Date().toISOString()
    }).eq('id', orderId)
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  function getTicketAge(placedAt: string): { minutes: number; color: string; label: string } {
    const minutes = Math.floor((Date.now() - new Date(placedAt).getTime()) / 60000)
    if (minutes >= kdsSettings.urgent) return { minutes, color: 'kds-urgent', label: 'SÜRGŐS' }
    if (minutes >= kdsSettings.warning) return { minutes, color: 'kds-warning', label: 'Figyelem' }
    return { minutes, color: 'kds-fresh', label: 'Friss' }
  }

  // All-day summary: aggregate item quantities
  const allDayItems: Record<string, number> = {}
  orders.filter(o => ['pending', 'accepted', 'preparing'].includes(o.status)).forEach(order => {
    (order.items || []).forEach((item: any) => {
      const name = item.menu_item?.name || '?'
      allDayItems[name] = (allDayItems[name] || 0) + item.quantity
    })
  })

  const grouped = {
    pending: orders.filter(o => o.status === 'pending'),
    accepted: orders.filter(o => o.status === 'accepted'),
    preparing: orders.filter(o => o.status === 'preparing'),
    ready: orders.filter(o => o.status === 'ready'),
  }

  return (
    <div className="min-h-screen bg-stone-950 text-white">
      {/* KDS Header */}
      <header className="bg-stone-900 border-b border-stone-800 px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
          <span className="font-bold text-sm tracking-wide">KONYHA KIJELZŐ</span>
        </div>

        <div className="flex-1" />

        {/* Stats */}
        <div className="hidden md:flex items-center gap-4 text-xs">
          <span className="text-yellow-400 font-bold">{grouped.pending.length} Váró</span>
          <span className="text-blue-400 font-bold">{grouped.accepted.length + grouped.preparing.length} Aktív</span>
          <span className="text-green-400 font-bold">{grouped.ready.length} Kész</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button onClick={() => setAllDayView(!allDayView)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${allDayView ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-400 hover:text-white'}`}>
            Összesítő
          </button>
          <button onClick={() => setSoundOn(!soundOn)}
            className="w-8 h-8 bg-stone-800 rounded-lg flex items-center justify-center hover:bg-stone-700">
            {soundOn ? <Volume2 className="w-4 h-4 text-green-400" /> : <VolumeX className="w-4 h-4 text-stone-500" />}
          </button>
          <button onClick={toggleFullscreen}
            className="w-8 h-8 bg-stone-800 rounded-lg flex items-center justify-center hover:bg-stone-700">
            {isFullscreen ? <Minimize className="w-4 h-4 text-stone-400" /> : <Maximize className="w-4 h-4 text-stone-400" />}
          </button>
          <button onClick={() => venueId && load(venueId)}
            className="w-8 h-8 bg-stone-800 rounded-lg flex items-center justify-center hover:bg-stone-700">
            <RefreshCw className="w-4 h-4 text-stone-400" />
          </button>
        </div>
      </header>

      {/* All-day view */}
      {allDayView && Object.keys(allDayItems).length > 0 && (
        <div className="bg-amber-950/50 border-b border-amber-900/50 px-4 py-3">
          <h2 className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">Mai összesítő — Összes aktív tétel</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(allDayItems).sort((a, b) => b[1] - a[1]).map(([name, qty]) => (
              <span key={name} className="bg-amber-900/40 text-amber-200 text-sm px-3 py-1.5 rounded-lg font-mono">
                <span className="font-black text-amber-400">{qty}×</span> {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-stone-500 animate-pulse">
          <Clock className="w-8 h-8" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-6xl mb-4">✅</div>
          <p className="text-stone-400 text-lg font-medium">Nincs aktív rendelés</p>
          <p className="text-stone-600 text-sm">Új rendelés esetén automatikusan megjelenik</p>
        </div>
      ) : (
        /* Ticket Grid */
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
          {orders.map(order => {
            const age = getTicketAge(order.placed_at)
            const isNew = order.status === 'pending'
            const isReady = order.status === 'ready'

            return (
              <div key={order.id}
                className={`rounded-xl overflow-hidden border-2 transition-all ${
                  isReady ? 'border-green-500 bg-green-950/30 shadow-lg shadow-green-500/10' :
                  isNew ? `border-yellow-500 bg-stone-900 shadow-lg shadow-yellow-500/10 ${age.color === 'kds-urgent' ? 'animate-pulse' : ''}` :
                  'border-stone-700 bg-stone-900'
                }`}
              >
                {/* Ticket header */}
                <div className={`px-4 py-2.5 flex items-center justify-between ${
                  isReady ? 'bg-green-900/50' :
                  isNew ? 'bg-yellow-900/30' :
                  order.status === 'preparing' ? 'bg-orange-900/20' :
                  'bg-stone-800/50'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-lg">{order.order_number}</span>
                    {isNew && <span className="bg-yellow-500 text-yellow-950 text-xs px-2 py-0.5 rounded-full font-black animate-pulse">ÚJ</span>}
                    {isReady && <span className="bg-green-500 text-green-950 text-xs px-2 py-0.5 rounded-full font-black">KÉSZ</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {order.table && (
                      <span className="bg-stone-700 text-stone-300 text-xs px-2 py-0.5 rounded-full font-bold">
                        #{order.table.number}
                      </span>
                    )}
                    <span className={`text-xs font-bold ${
                      age.color === 'kds-urgent' ? 'text-red-400' :
                      age.color === 'kds-warning' ? 'text-amber-400' :
                      'text-stone-500'
                    }`}>
                      {age.minutes}p
                    </span>
                  </div>
                </div>

                {/* Age indicator bar */}
                <div className={`h-1 ${
                  age.color === 'kds-urgent' ? 'bg-red-500' :
                  age.color === 'kds-warning' ? 'bg-amber-500' :
                  'bg-green-500'
                }`} />

                {/* Items */}
                <div className="px-4 py-3 space-y-1.5">
                  {(order.items || []).map((item: any, idx: number) => (
                    <div key={idx}>
                      <div className="flex gap-2 text-sm">
                        <span className="font-black text-amber-400 w-6">{item.quantity}×</span>
                        <span className="text-white font-medium">{item.menu_item?.name}</span>
                      </div>
                      {/* Modifiers */}
                      {item.selected_modifiers && Array.isArray(item.selected_modifiers) && item.selected_modifiers.length > 0 && (
                        <div className="ml-8 mt-0.5">
                          {item.selected_modifiers.map((mod: any, mi: number) => (
                            <span key={mi} className="text-xs text-blue-400 mr-2">
                              + {mod.option}{mod.price > 0 ? ` (+${mod.price})` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Special instructions */}
                      {item.notes && (
                        <div className="ml-8 mt-0.5 flex items-start gap-1">
                          <AlertTriangle className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                          <span className="text-xs text-yellow-400 font-medium">{item.notes}</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {order.notes && (
                    <div className="pt-2 mt-2 border-t border-stone-700/50">
                      <p className="text-xs text-yellow-400 italic">💬 {order.notes}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="px-4 py-3 bg-stone-800/30 border-t border-stone-700/30 flex items-center gap-2">
                  <span className="text-stone-500 text-xs flex-1">
                    {order.order_type === 'table_service' ? '🪑' : '🍺'}
                    {' '}
                    {order.payment_method === 'cash' ? '💵' : '💳'}
                    {' · '}
                    {formatPrice(order.total)}
                  </span>

                  {STATUS_FLOW[order.status] && (
                    <button
                      onClick={() => advanceOrder(order.id, order.status)}
                      className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                        isNew ? 'bg-yellow-500 hover:bg-yellow-400 text-yellow-950' :
                        order.status === 'accepted' ? 'bg-blue-600 hover:bg-blue-500 text-white' :
                        order.status === 'preparing' ? 'bg-orange-500 hover:bg-orange-400 text-orange-950' :
                        'bg-stone-600 hover:bg-stone-500 text-white'
                      }`}
                    >
                      {order.status === 'pending' && '✓ Elfogad'}
                      {order.status === 'accepted' && '👨‍🍳 Készítés'}
                      {order.status === 'preparing' && '🔔 Kész!'}
                    </button>
                  )}

                  {isReady && (
                    <button
                      onClick={() => completeOrder(order.id)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-black transition-all"
                    >
                      <Check className="w-4 h-4 inline mr-1" /> Átadva
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
