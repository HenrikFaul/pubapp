'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { formatDateTime, formatPrice, STATUS_LABELS, timeAgo } from '@/lib/utils'
import { AlertCircle, ArrowLeft, Bell, Check, Clock, Info, Store } from 'lucide-react'

const STEPS = [
  { key: 'pending', label: 'Beérkezett' },
  { key: 'accepted', label: 'Elfogadva' },
  { key: 'preparing', label: 'Feldolgozás alatt' },
  { key: 'ready', label: 'Átvehető' },
  { key: 'completed', label: 'Lezárva' },
]

export default function OrderTrackingPage() {
  const router = useRouter()
  const { id } = useParams() as { id: string }
  const [order, setOrder] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [notifyEnabled, setNotifyEnabled] = useState(false)
  const previousStatusRef = useRef<string | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('orders').select('*, venue:venues(name,address), table:tables(number)').eq('id', id).single()
    setOrder(data)
    const { data: itemRows } = await supabase.from('order_items').select('*, menu_item:menu_items(name)').eq('order_id', id)
    setItems(itemRows || [])
  }, [id])

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`order-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, (payload) => {
        const nextStatus = payload.new?.status as string | undefined
        if (nextStatus && previousStatusRef.current && previousStatusRef.current !== nextStatus) {
          if (notifyEnabled && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('Kapakka rendelés frissítés', {
              body: `A rendelésed új állapota: ${STATUS_LABELS[nextStatus] || nextStatus}`,
            })
          }
          toast.success(`Rendelés frissítve: ${STATUS_LABELS[nextStatus] || nextStatus}`)
        }
        load()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, load, notifyEnabled])

  useEffect(() => {
    if (order?.status) {
      previousStatusRef.current = order.status
    }
  }, [order?.status])

  async function enableNotifications() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('A böngésző nem támogatja a rendszerértesítéseket.')
      return
    }
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      setNotifyEnabled(true)
      toast.success('Bekapcsoltad a rendelési értesítéseket.')
    }
  }

  if (!order) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-[30px] border border-white/10 bg-white/10 text-white shadow-2xl">
          <Store className="h-10 w-10 anim-pulse" />
        </div>
      </div>
    )
  }

  const currentStep = Math.max(STEPS.findIndex((step) => step.key === order.status), 0)
  const isReady = order.status === 'ready'
  const isDone = ['completed', 'delivered', 'cancelled'].includes(order.status)

  return (
    <div className="app-shell min-h-screen pb-16">
      <div className="customer-container pt-5 sm:pt-8">
        <div className={`hero-card p-5 sm:p-7 ${isReady ? 'border-green-400/30' : ''}`}>
          <div className="relative z-10">
            <button onClick={() => router.push('/customer')} className="btn-outline mb-5 w-auto px-4 py-3">
              <ArrowLeft className="h-4 w-4" /> Vissza
            </button>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="section-kicker mb-4">
                  <Clock className="h-4 w-4" /> élő rendeléskövetés
                </div>
                <h1 className="section-title">{order.order_number}</h1>
                <p className="section-subtitle mt-3">{order.venue?.name} · {order.venue?.address}</p>
                <div className="mt-4 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white">
                  {STATUS_LABELS[order.status]}
                </div>
              </div>
              <button onClick={enableNotifications} className="btn-kapakka w-full lg:w-auto lg:px-6">
                <Bell className="h-4 w-4" /> {notifyEnabled ? 'Értesítések aktívak' : 'Automatikus jelzés bekapcsolása'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="order-panel p-5">
            <div className="flex items-center gap-2 text-white/70">
              <Check className="h-4 w-4" />
              <span className="text-sm font-semibold">Státusz folyamat</span>
            </div>
            <div className="mt-5 space-y-3">
              {STEPS.map((step, index) => {
                const done = index < currentStep
                const active = index === currentStep
                return (
                  <div key={step.key} className="flex items-center gap-3 rounded-[20px] border border-white/10 bg-white/5 px-4 py-3">
                    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${done ? 'bg-green-500/20 text-green-400' : active ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-white/35'}`}>
                      {done ? <Check className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold ${active ? 'text-white' : done ? 'text-green-300' : 'text-white/45'}`}>{step.label}</p>
                      {active && <p className="text-xs text-amber-300">Éppen ez a fázis fut.</p>}
                    </div>
                  </div>
                )
              })}
            </div>
            {isReady && (
              <div className="mt-5 rounded-[22px] border border-green-400/25 bg-green-500/10 p-4 text-green-300">
                <div className="flex items-center gap-2 font-semibold">
                  <Bell className="h-4 w-4" /> A rendelésed átvehető.
                </div>
                <p className="mt-2 text-sm text-green-200/80">A venue jelezte, hogy a rendelésed elkészült és mehetsz érte.</p>
              </div>
            )}
            {order.status === 'cancelled' && (
              <div className="mt-5 rounded-[22px] border border-red-400/25 bg-red-500/10 p-4 text-red-300">
                <div className="flex items-center gap-2 font-semibold"><AlertCircle className="h-4 w-4" /> A rendelés törölve lett.</div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="order-panel p-5">
              <div className="flex items-center gap-2 text-white/70">
                <ShoppingBagIcon />
                <span className="text-sm font-semibold">Rendelt tételek</span>
              </div>
              <div className="mt-4 space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="rounded-[20px] border border-white/10 bg-white/5 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{item.quantity}× {item.menu_item?.name}</p>
                        {item.notes && <p className="mt-1 text-xs text-white/45">{item.notes}</p>}
                      </div>
                      <span className="font-semibold text-amber-400">{formatPrice(item.total_price)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-[20px] border border-white/10 bg-white/5 px-4 py-4">
                <span className="font-semibold text-white">Összesen</span>
                <span className="text-xl font-black text-amber-400">{formatPrice(order.total)}</span>
              </div>
            </div>

            <div className="order-panel p-5">
              <div className="flex items-center gap-2 text-white/70">
                <Info className="h-4 w-4" />
                <span className="text-sm font-semibold">Rendelési információk</span>
              </div>
              <div className="mt-4 space-y-3 text-sm text-white/60">
                <div className="flex items-center justify-between"><span>Típus</span><span className="text-white">{order.order_type === 'table_service' ? 'Asztali' : 'Pult pickup'}</span></div>
                {order.table?.number && <div className="flex items-center justify-between"><span>Asztal</span><span className="text-white">#{order.table.number}</span></div>}
                <div className="flex items-center justify-between"><span>Fizetés</span><span className="text-white">{order.payment_method === 'cash' ? 'Készpénz' : 'Kártya'}</span></div>
                <div className="flex items-center justify-between"><span>Leadva</span><span className="text-white">{formatDateTime(order.placed_at)}</span></div>
                <div className="flex items-center justify-between"><span>Eltelt idő</span><span className="text-white">{timeAgo(order.placed_at)}</span></div>
              </div>
            </div>
          </div>
        </div>

        {isDone && (
          <button onClick={() => router.push('/customer')} className="btn-kapakka mt-5 w-full lg:w-auto lg:px-6">
            Vissza a főoldalra
          </button>
        )}
      </div>
    </div>
  )
}

function ShoppingBagIcon() {
  return <Store className="h-4 w-4" />
}
