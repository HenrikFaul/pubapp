'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Order } from '@/types'
import { formatPrice, ORDER_STATUS_LABELS, timeAgo } from '@/lib/utils'
import { ArrowLeft, Clock, CheckCircle, Package, ChefHat, Bell } from 'lucide-react'

const STATUS_STEPS = ['pending', 'accepted', 'preparing', 'ready', 'delivered', 'completed']

export default function OrderTrackingPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string
  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<any[]>([])

  const fetchOrder = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, venue:venues(name, address), table:tables(number, name)')
      .eq('id', orderId)
      .single()
    setOrder(data)

    const { data: orderItems } = await supabase
      .from('order_items')
      .select('*, menu_item:menu_items(name, price)')
      .eq('order_id', orderId)
    setItems(orderItems || [])
  }, [orderId])

  useEffect(() => {
    fetchOrder()

    // Realtime subscription
    const channel = supabase
      .channel(`order-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`,
      }, () => fetchOrder())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [orderId, fetchOrder])

  if (!order) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-amber-600 animate-pulse">Betöltés...</div>
      </div>
    )
  }

  const currentStepIdx = STATUS_STEPS.indexOf(order.status)
  const isReady = order.status === 'ready'
  const isDone = order.status === 'completed' || order.status === 'delivered'

  const stepIcons = [
    <Clock className="w-5 h-5" key="clock" />,
    <CheckCircle className="w-5 h-5" key="check" />,
    <ChefHat className="w-5 h-5" key="chef" />,
    <Bell className="w-5 h-5" key="bell" />,
    <Package className="w-5 h-5" key="pkg" />,
    <CheckCircle className="w-5 h-5" key="done" />,
  ]

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Header */}
      <div className={`${isReady ? 'bg-green-600' : 'bg-amber-950'} text-white px-4 pt-12 pb-8 transition-colors duration-500`}>
        <button onClick={() => router.push('/customer')} className="flex items-center gap-2 text-amber-300 mb-6">
          <ArrowLeft className="w-5 h-5" /> Vissza
        </button>

        <div className="text-center">
          {isReady && (
            <div className="text-6xl mb-3 animate-pulse-ring inline-block">🔔</div>
          )}
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
            {order.order_number}
          </h1>
          <p className="text-amber-300/80 mt-1">{(order as any).venue?.name}</p>

          <div className={`mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm ${
            isReady ? 'bg-white/20' : 'bg-amber-900/60'
          }`}>
            {ORDER_STATUS_LABELS[order.status]}
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-5">
        {/* Progress tracker */}
        {!isDone && (
          <div className="bg-white rounded-2xl p-5 border border-amber-100">
            <h2 className="font-bold text-amber-950 mb-4 text-sm uppercase tracking-wide">Rendelés állapota</h2>
            <div className="space-y-3">
              {['Beérkezett', 'Elfogadva', 'Készítés alatt', 'Kész', 'Átadva'].map((label, i) => {
                const done = i < currentStepIdx
                const active = i === currentStepIdx
                return (
                  <div key={label} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                      done ? 'bg-green-500 text-white' :
                      active ? 'bg-amber-500 text-white animate-pulse' :
                      'bg-amber-100 text-amber-300'
                    }`}>
                      {stepIcons[i]}
                    </div>
                    <span className={`text-sm font-medium ${active ? 'text-amber-950' : done ? 'text-green-700' : 'text-amber-300'}`}>
                      {label}
                    </span>
                    {active && (
                      <span className="ml-auto text-xs text-amber-500 animate-pulse">● Folyamatban</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Order summary */}
        <div className="bg-white rounded-2xl p-5 border border-amber-100">
          <h2 className="font-bold text-amber-950 mb-3 text-sm uppercase tracking-wide">Rendelt tételek</h2>
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between">
                <span className="text-sm text-amber-800">
                  <span className="font-semibold text-amber-950">{item.quantity}×</span> {item.menu_item?.name}
                </span>
                <span className="text-sm font-medium text-amber-700">{formatPrice(item.total_price)}</span>
              </div>
            ))}
            {order.notes && (
              <div className="pt-2 border-t border-amber-50">
                <p className="text-xs text-amber-500">Megjegyzés: {order.notes}</p>
              </div>
            )}
          </div>
          <div className="flex justify-between pt-3 mt-3 border-t border-amber-100">
            <span className="font-bold text-amber-950">Összesen</span>
            <span className="font-bold text-lg text-amber-700">{formatPrice(order.total)}</span>
          </div>
        </div>

        {/* Order info */}
        <div className="bg-white rounded-2xl p-5 border border-amber-100">
          <h2 className="font-bold text-amber-950 mb-3 text-sm uppercase tracking-wide">Részletek</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-amber-500">Típus</span>
              <span className="text-amber-900 font-medium">
                {order.order_type === 'table_service' ? '🪑 Asztali kiszolgálás' : '🍺 Pultás átvétel'}
              </span>
            </div>
            {(order as any).table && (
              <div className="flex justify-between">
                <span className="text-amber-500">Asztal</span>
                <span className="text-amber-900 font-medium">#{(order as any).table.number}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-amber-500">Fizetés</span>
              <span className="text-amber-900 font-medium">
                {order.payment_method === 'cash' ? '💵 Készpénz' : '💳 Kártya'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-500">Leadva</span>
              <span className="text-amber-900 font-medium">{timeAgo(order.placed_at)}</span>
            </div>
          </div>
        </div>

        {isDone && (
          <button
            onClick={() => router.push('/customer')}
            className="w-full bg-amber-500 text-white font-bold py-4 rounded-2xl"
          >
            Vissza a főoldalra
          </button>
        )}
      </div>
    </div>
  )
}
