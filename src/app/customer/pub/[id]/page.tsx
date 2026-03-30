'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatPrice, isOpenNow } from '@/lib/utils'
import toast from 'react-hot-toast'

interface CartItem { item: any; qty: number }

export default function PubPage() {
  const router = useRouter()
  const { id } = useParams() as { id: string }
  const [venue, setVenue] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [orderType, setOrderType] = useState<'bar_pickup' | 'table_service'>('bar_pickup')
  const [tableNum, setTableNum] = useState('')
  const [payMethod, setPayMethod] = useState<'cash' | 'card'>('cash')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    const { data: v } = await supabase.from('venues').select('*').eq('id', id).single()
    setVenue(v)
    const { data: cats } = await supabase.from('menu_categories').select('*').eq('venue_id', id).eq('is_active', true).order('sort_order')
    const { data: its } = await supabase.from('menu_items').select('*').eq('venue_id', id).eq('is_available', true).order('sort_order')
    setCategories(cats || [])
    setItems(its || [])
    if (cats?.length) setActiveCat(cats[0].id)
  }, [id])

  useEffect(() => { load() }, [load])

  const add = (item: any) => setCart(p => {
    const ex = p.find(c => c.item.id === item.id)
    return ex ? p.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c) : [...p, { item, qty: 1 }]
  })
  const remove = (itemId: string) => setCart(p => {
    const ex = p.find(c => c.item.id === itemId)
    if (ex && ex.qty > 1) return p.map(c => c.item.id === itemId ? { ...c, qty: c.qty - 1 } : c)
    return p.filter(c => c.item.id !== itemId)
  })

  const total = cart.reduce((s, c) => s + c.item.price * c.qty, 0)
  const count = cart.reduce((s, c) => s + c.qty, 0)

  async function placeOrder() {
    if (!cart.length) return
    if (orderType === 'table_service' && !tableNum) { alert('Add meg az asztalszámot!'); return }
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()

    let tableId: string | undefined
    if (tableNum) {
      const { data: t } = await supabase.from('tables').select('id').eq('venue_id', id).eq('number', parseInt(tableNum)).single()
      tableId = t?.id
    }

    const { data: order, error } = await supabase.from('orders').insert({
      venue_id: id, customer_id: user?.id, table_id: tableId,
      order_type: orderType, payment_method: payMethod,
      subtotal: total, total, notes,
    }).select().single()

    if (error || !order) { alert('Hiba a rendelés leadásakor'); setSubmitting(false); return }

    await supabase.from('order_items').insert(cart.map(c => ({
      order_id: order.id, menu_item_id: c.item.id,
      quantity: c.qty, unit_price: c.item.price, total_price: c.item.price * c.qty,
    })))

    setCart([])
    setCartOpen(false)
    setSubmitting(false)
    router.push(`/customer/orders/${order.id}`)
  }

  const displayed = activeCat ? items.filter(i => i.category_id === activeCat) : items

  if (!venue) return <div className="min-h-screen dark-bg flex items-center justify-center text-amber-400 text-2xl animate-pulse">🍺</div>

  const open = isOpenNow(venue.opening_hours)

  return (
    <div className="min-h-screen dark-bg pb-32">
      {/* Hero */}
      <div className="relative h-48" style={{ background: 'linear-gradient(to bottom, var(--app-bg-alt), var(--app-bg))' }}>
        {venue.cover_url && <img src={venue.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
        <button onClick={() => router.back()} className="absolute top-12 left-4 bg-black/40 text-white rounded-xl p-2 text-sm">← Vissza</button>
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-end gap-3">
            <div className="w-14 h-14 bg-amber-900 rounded-xl flex items-center justify-center text-2xl border-2 border-amber-500/30">
              {venue.logo_url ? <img src={venue.logo_url} className="w-full h-full object-cover rounded-xl" alt="" /> : '🍺'}
            </div>
            <div>
              <h1 className="text-white font-bold text-xl">{venue.name}</h1>
              <div className="flex gap-3 text-xs">
                <span className={open ? 'text-green-400' : 'text-red-400'}>{open ? '● Nyitva' : '● Zárva'}</span>
                <span className="text-amber-400">★ {venue.rating?.toFixed(1) || '—'}</span>
                <span className="text-white/40">{venue.address}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order type */}
      {venue.has_table_service && venue.has_bar_service && (
        <div className="mx-4 mt-4 flex gap-2 p-1 bg-white/10 rounded-xl">
          {([['bar_pickup','🍺 Pultnál veszem át'],['table_service','🪑 Asztalhoz hozza']] as const).map(([t,l]) => (
            <button key={t} onClick={() => setOrderType(t as any)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${orderType === t ? 'bg-amber-500 text-black' : 'text-white/60'}`}>
              {l}
            </button>
          ))}
        </div>
      )}
      {orderType === 'table_service' && (
        <div className="mx-4 mt-2">
          <input value={tableNum} onChange={e => setTableNum(e.target.value)} type="number"
            placeholder="Asztalszám (pl. 7)" className="kap-input text-center font-bold text-lg" />
        </div>
      )}

      {/* Category tabs */}
      {categories.length > 0 && (
        <div className="sticky top-0 z-10 backdrop-blur-sm pt-3 pb-1" style={{ background: 'color-mix(in srgb, var(--app-bg) 95%, transparent)' }}>
          <div className="flex gap-2 px-4 overflow-x-auto scrollbar-hide pb-2">
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setActiveCat(cat.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors border ${activeCat === cat.id ? 'bg-amber-500 text-black border-amber-500' : 'border-white/20 text-white/60 hover:border-white/40'}`}>
                {cat.icon && <span className="mr-1">{cat.icon}</span>}{cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Menu items */}
      <div className="px-4 pt-3 space-y-2">
        {displayed.length === 0 ? (
          <div className="text-center py-12 text-white/30">Nincs elérhető termék</div>
        ) : displayed.map(item => {
          const inCart = cart.find(c => c.item.id === item.id)
          return (
            <div key={item.id} className="pub-card flex p-3 gap-3">
              {item.image_url && (
                <img src={item.image_url} alt={item.name} className="w-20 h-20 object-cover rounded-xl flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-2">
                  <p className="text-white font-semibold text-sm leading-tight">{item.name}</p>
                  {item.is_featured && <span className="text-amber-400 text-xs flex-shrink-0">⭐</span>}
                </div>
                {item.description && <p className="text-white/40 text-xs mt-1 line-clamp-2">{item.description}</p>}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-amber-400 font-bold">{formatPrice(item.price)}</span>
                  <div className="flex items-center gap-2">
                    {inCart && (
                      <>
                        <button onClick={() => remove(item.id)} className="w-7 h-7 bg-white/10 rounded-full text-white text-lg leading-none flex items-center justify-center">−</button>
                        <span className="text-white font-bold w-5 text-center">{inCart.qty}</span>
                      </>
                    )}
                    <button onClick={() => add(item)} className="w-7 h-7 bg-amber-500 rounded-full text-black font-bold flex items-center justify-center">+</button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Cart button */}
      {count > 0 && !cartOpen && (
        <button onClick={() => setCartOpen(true)}
          className="fixed bottom-6 left-4 right-4 bg-amber-500 text-black font-bold py-4 rounded-2xl flex items-center justify-between px-5 shadow-2xl z-30">
          <span className="bg-black/20 text-black rounded-lg w-7 h-7 flex items-center justify-center font-black">{count}</span>
          <span>Kosár megtekintése</span>
          <span className="font-black">{formatPrice(total)}</span>
        </button>
      )}

      {/* Cart sheet */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setCartOpen(false)} />
          <div className="relative bg-zinc-900 rounded-t-3xl max-h-[85vh] overflow-y-auto anim-up">
            <div className="sticky top-0 bg-zinc-900 px-5 pt-5 pb-3 border-b border-white/10 flex justify-between">
              <h2 className="text-white font-bold text-lg">Kosár ({count})</h2>
              <button onClick={() => setCartOpen(false)} className="text-white/40 text-xl">✕</button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {cart.map(c => (
                <div key={c.item.id} className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => remove(c.item.id)} className="w-7 h-7 bg-white/10 rounded-full text-white flex items-center justify-center">−</button>
                    <span className="text-white font-bold w-5 text-center">{c.qty}</span>
                    <button onClick={() => add(c.item)} className="w-7 h-7 bg-amber-500 rounded-full text-black flex items-center justify-center font-bold">+</button>
                  </div>
                  <span className="flex-1 text-white/80 text-sm">{c.item.name}</span>
                  <span className="text-amber-400 font-bold text-sm">{formatPrice(c.item.price * c.qty)}</span>
                </div>
              ))}

              <div>
                <label className="text-white/50 text-xs mb-1 block">Megjegyzés</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  className="kap-input text-sm h-16 resize-none" placeholder="Allergia, különleges kérés..." />
              </div>

              <div>
                <label className="text-white/50 text-xs mb-2 block">Fizetési mód</label>
                <div className="flex gap-2">
                  {[['cash','💵 Készpénz'],['card','💳 Kártya']] .map(([m,l]) => (
                    <button key={m} onClick={() => setPayMethod(m as any)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${payMethod === m ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-white/20 text-white/40'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between py-3 border-t border-white/10">
                <span className="text-white font-bold">Összesen</span>
                <span className="text-amber-400 font-black text-xl">{formatPrice(total)}</span>
              </div>

              <button onClick={placeOrder} disabled={submitting}
                className="btn-kapakka text-lg font-black py-4">
                {submitting ? 'Küldés...' : '✓ Rendelés leadása'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
