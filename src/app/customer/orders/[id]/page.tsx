'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatPrice, STATUS_LABELS, timeAgo } from '@/lib/utils'

const STEPS = [
  { key: 'pending', label: 'Beérkezett', icon: '📥' },
  { key: 'accepted', label: 'Elfogadva', icon: '✅' },
  { key: 'preparing', label: 'Készítés', icon: '👨‍🍳' },
  { key: 'ready', label: 'Kész!', icon: '🔔' },
  { key: 'delivered', label: 'Átadva', icon: '🎉' },
]

export default function OrderTrackingPage() {
  const router = useRouter()
  const { id } = useParams() as { id: string }
  const [order, setOrder] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])

  const load = useCallback(async () => {
    const { data } = await supabase.from('orders').select('*, venue:venues(name,address), table:tables(number)').eq('id', id).single()
    setOrder(data)
    const { data: oi } = await supabase.from('order_items').select('*, menu_item:menu_items(name)').eq('order_id', id)
    setItems(oi || [])
  }, [id])

  useEffect(() => {
    load()
    const ch = supabase.channel(`order-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [id, load])

  if (!order) return <div className="min-h-screen dark-bg flex items-center justify-center text-amber-400 animate-pulse text-3xl">🍺</div>

  const currentStep = STEPS.findIndex(s => s.key === order.status)
  const isReady = order.status === 'ready'
  const isDone = ['completed','delivered','cancelled'].includes(order.status)

  return (
    <div className="min-h-screen dark-bg">
      {/* Header */}
      <div className={`px-4 pt-12 pb-8 text-center transition-colors duration-700 ${isReady ? 'bg-green-900/50' : ''}`}>
        <button onClick={() => router.push('/customer')} className="absolute top-12 left-4 text-white/50 text-sm">← Vissza</button>
        {isReady && <div className="text-6xl mb-3 anim-pulse">🔔</div>}
        <h1 className="text-3xl font-black text-amber-400" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>{order.order_number}</h1>
        <p className="text-white/50 text-sm mt-1">{order.venue?.name}</p>
        <div className="mt-3 inline-block px-4 py-2 rounded-full bg-white/10 text-white font-semibold text-sm">
          {STATUS_LABELS[order.status]}
        </div>
      </div>

      <div className="px-4 space-y-4 pb-10">
        {/* Progress */}
        {!isDone && (
          <div className="glass-card p-5">
            <h2 className="text-white/60 text-xs uppercase tracking-wider mb-4">Rendelés állapota</h2>
            <div className="space-y-3">
              {STEPS.map((step, i) => {
                const done = i < currentStep
                const active = i === currentStep
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0 transition-all ${done ? 'bg-green-500' : active ? 'bg-amber-500 anim-pulse' : 'bg-white/10'}`}>
                      {step.icon}
                    </div>
                    <span className={`text-sm font-medium ${active ? 'text-white' : done ? 'text-green-400' : 'text-white/30'}`}>{step.label}</span>
                    {active && <span className="ml-auto text-amber-400 text-xs animate-pulse">● Folyamatban</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Items */}
        <div className="glass-card p-5">
          <h2 className="text-white/60 text-xs uppercase tracking-wider mb-3">Rendelt tételek</h2>
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-white/70"><span className="text-white font-bold">{item.quantity}×</span> {item.menu_item?.name}</span>
                <span className="text-amber-400 font-semibold">{formatPrice(item.total_price)}</span>
              </div>
            ))}
            {order.notes && <p className="text-white/30 text-xs pt-2 border-t border-white/10 mt-2">💬 {order.notes}</p>}
          </div>
          <div className="flex justify-between pt-3 mt-2 border-t border-white/10">
            <span className="text-white font-bold">Összesen</span>
            <span className="text-amber-400 font-black text-lg">{formatPrice(order.total)}</span>
          </div>
        </div>

        {/* Info */}
        <div className="glass-card p-5 text-sm space-y-2">
          <div className="flex justify-between"><span className="text-white/40">Típus</span><span className="text-white">{order.order_type === 'table_service' ? '🪑 Asztali' : '🍺 Pult'}</span></div>
          {order.table && <div className="flex justify-between"><span className="text-white/40">Asztal</span><span className="text-white">#{order.table.number}</span></div>}
          <div className="flex justify-between"><span className="text-white/40">Fizetés</span><span className="text-white">{order.payment_method === 'cash' ? '💵 Készpénz' : '💳 Kártya'}</span></div>
          <div className="flex justify-between"><span className="text-white/40">Leadva</span><span className="text-white">{timeAgo(order.placed_at)}</span></div>
        </div>

        {isDone && (
          <button onClick={() => router.push('/customer')} className="btn-kapakka">
            Vissza a főoldalra
          </button>
        )}
      </div>
    </div>
  )
}
