'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatPrice, isOpenNow } from '@/lib/utils'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  MapPin,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
} from 'lucide-react'

interface CartItem {
  item: any
  qty: number
}

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
    const { data: venueData } = await supabase.from('venues').select('*').eq('id', id).single()
    setVenue(venueData)

    const { data: categoryData } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('venue_id', id)
      .eq('is_active', true)
      .order('sort_order')

    const { data: itemData } = await supabase
      .from('menu_items')
      .select('*')
      .eq('venue_id', id)
      .eq('is_available', true)
      .order('sort_order')

    setCategories(categoryData || [])
    setItems(itemData || [])
    if (categoryData?.length) setActiveCat(categoryData[0].id)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const add = (item: any) =>
    setCart((previous) => {
      const existing = previous.find((cartItem) => cartItem.item.id === item.id)
      return existing
        ? previous.map((cartItem) =>
            cartItem.item.id === item.id ? { ...cartItem, qty: cartItem.qty + 1 } : cartItem
          )
        : [...previous, { item, qty: 1 }]
    })

  const remove = (itemId: string) =>
    setCart((previous) => {
      const existing = previous.find((cartItem) => cartItem.item.id === itemId)
      if (existing && existing.qty > 1) {
        return previous.map((cartItem) =>
          cartItem.item.id === itemId ? { ...cartItem, qty: cartItem.qty - 1 } : cartItem
        )
      }
      return previous.filter((cartItem) => cartItem.item.id !== itemId)
    })

  const total = cart.reduce((sum, cartItem) => sum + cartItem.item.price * cartItem.qty, 0)
  const count = cart.reduce((sum, cartItem) => sum + cartItem.qty, 0)
  const displayed = activeCat ? items.filter((item) => item.category_id === activeCat) : items

  async function placeOrder() {
    if (!cart.length) return

    if (orderType === 'table_service' && !tableNum) {
      toast.error('Add meg az asztalszámot!')
      return
    }

    setSubmitting(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    let tableId: string | undefined
    if (tableNum) {
      const { data: tableData } = await supabase
        .from('tables')
        .select('id')
        .eq('venue_id', id)
        .eq('number', parseInt(tableNum, 10))
        .single()
      tableId = tableData?.id
    }

    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        venue_id: id,
        customer_id: user?.id,
        table_id: tableId,
        order_type: orderType,
        payment_method: payMethod,
        subtotal: total,
        total,
        notes,
      })
      .select()
      .single()

    if (error || !order) {
      toast.error('Hiba a rendelés leadásakor')
      setSubmitting(false)
      return
    }

    await supabase.from('order_items').insert(
      cart.map((cartItem) => ({
        order_id: order.id,
        menu_item_id: cartItem.item.id,
        quantity: cartItem.qty,
        unit_price: cartItem.item.price,
        total_price: cartItem.item.price * cartItem.qty,
      }))
    )

    setCart([])
    setCartOpen(false)
    setSubmitting(false)
    router.push(`/customer/orders/${order.id}`)
  }

  function OrderSummary({ compact = false }: { compact?: boolean }) {
    return (
      <div className={`modern-card p-5 ${compact ? '' : 'sticky top-24'}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/30">Kosár</p>
            <p className="mt-1 text-xl font-bold text-white">{count} tétel</p>
          </div>
          <div className="rounded-full bg-amber-500/10 px-3 py-1 text-sm font-semibold text-amber-400">{formatPrice(total)}</div>
        </div>

        {cart.length === 0 ? (
          <div className="mt-5 rounded-[22px] border border-white/10 bg-white/5 p-5 text-center text-sm text-white/40">
            Adj hozzá valamit a menüből, és itt látod majd az összesítést.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <div className="space-y-3">
              {cart.map((cartItem) => (
                <div key={cartItem.item.id} className="rounded-[20px] border border-white/10 bg-white/5 p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => remove(cartItem.item.id)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-lg text-white transition hover:bg-white/20">
                        −
                      </button>
                      <span className="w-5 text-center text-sm font-bold text-white">{cartItem.qty}</span>
                      <button onClick={() => add(cartItem.item)} className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-lg font-bold text-black transition hover:bg-amber-400">
                        +
                      </button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white">{cartItem.item.name}</p>
                      <p className="mt-1 text-sm text-amber-400">{formatPrice(cartItem.item.price * cartItem.qty)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-white/30">Megjegyzés</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="kap-input h-20 resize-none text-sm" placeholder="Allergia, különleges kérés, extra infó..." />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-white/30">Fizetés</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['cash', '💵 Készpénz'],
                  ['card', '💳 Kártya'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setPayMethod(value)}
                    className={`rounded-[18px] border px-4 py-3 text-sm font-semibold transition ${
                      payMethod === value ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-white/10 bg-white/5 text-white/50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/10 pt-3 text-sm">
              <span className="font-semibold text-white">Összesen</span>
              <span className="text-xl font-black text-amber-400">{formatPrice(total)}</span>
            </div>

            <button onClick={placeOrder} disabled={submitting} className="btn-kapakka text-base font-black">
              {submitting ? 'Küldés...' : 'Rendelés leadása'}
            </button>
          </div>
        )}
      </div>
    )
  }

  if (!venue) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center text-amber-400">
        <Store className="h-10 w-10 anim-pulse" />
      </div>
    )
  }

  const open = isOpenNow(venue.opening_hours)

  return (
    <div className="app-shell pb-28 lg:pb-10">
      <section className="relative overflow-hidden border-b border-white/10 pb-14 pt-6 lg:pb-20">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
        {venue.cover_url && <img src={venue.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />}

        <div className="customer-container relative z-10">
          <button onClick={() => router.back()} className="btn-outline mb-6 w-auto px-4 py-3">
            <ArrowLeft className="h-4 w-4" />
            Vissza
          </button>

          <div className="hero-card overflow-hidden p-5 sm:p-7 lg:p-8">
            <div className="relative z-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
              <div>
                <div className="section-kicker mb-4">
                  <Sparkles className="h-4 w-4" />
                  digitális étlap + gyors rendelés
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-[28px] border border-white/10 bg-white/10 text-amber-400 shadow-2xl">
                    {venue.logo_url ? <img src={venue.logo_url} alt="" className="h-full w-full rounded-[28px] object-cover" /> : <Store className="h-9 w-9" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="section-title text-[38px] sm:text-[48px]">{venue.name}</h1>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-semibold">
                      <span className={`rounded-full px-3 py-1 ${open ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                        {open ? 'Nyitva most' : 'Jelenleg zárva'}
                      </span>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-amber-400">
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-4 w-4 fill-current" />
                          {venue.rating?.toFixed(1) || '—'}
                        </span>
                      </span>
                    </div>
                    <p className="mt-4 flex items-center gap-2 text-sm text-white/50 sm:text-base">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span>{venue.address}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <div className="metric-card p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/30">Kategóriák</p>
                  <p className="mt-2 text-3xl font-black text-white">{categories.length}</p>
                </div>
                <div className="metric-card p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/30">Termékek</p>
                  <p className="mt-2 text-3xl font-black text-white">{items.length}</p>
                </div>
                <div className="metric-card p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/30">Rendelés mód</p>
                  <p className="mt-2 text-lg font-black text-white">{orderType === 'bar_pickup' ? 'Pult' : 'Asztal'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="customer-container -mt-8 relative z-10 space-y-5">
        {venue.has_table_service && venue.has_bar_service && (
          <div className="modern-card p-3">
            <div className="grid gap-2 md:grid-cols-2">
              {([
                ['bar_pickup', '🍺 Pultnál veszem át'],
                ['table_service', '🪑 Asztalhoz hozza'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setOrderType(value)}
                  className={`rounded-[20px] px-4 py-4 text-sm font-semibold transition-all ${
                    orderType === value ? 'bg-amber-500 text-black shadow-lg' : 'bg-white/5 text-white/60'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {orderType === 'table_service' && (
              <div className="mt-3">
                <input value={tableNum} onChange={(e) => setTableNum(e.target.value)} type="number" placeholder="Asztalszám (pl. 7)" className="kap-input text-center text-lg font-bold" />
              </div>
            )}
          </div>
        )}

        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start xl:gap-6">
          <div className="space-y-5">
            {categories.length > 0 && (
              <div className="modern-card p-3 sticky top-4 z-20">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setActiveCat(category.id)}
                      className={`flex-shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        activeCat === category.id
                          ? 'border-amber-500 bg-amber-500 text-black'
                          : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
                      }`}
                    >
                      {category.icon && <span className="mr-1">{category.icon}</span>}
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {displayed.length === 0 ? (
                <div className="modern-card p-10 text-center text-white/40">Nincs elérhető termék ebben a kategóriában.</div>
              ) : (
                displayed.map((item) => {
                  const inCart = cart.find((cartItem) => cartItem.item.id === item.id)
                  return (
                    <div key={item.id} className="menu-item-card p-4 sm:p-5">
                      <div className="flex gap-4">
                        <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-[24px] border border-white/10 bg-white/10 text-amber-400 shadow-lg">
                          {item.image_url ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" /> : <Store className="h-8 w-8" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-lg font-bold text-white">{item.name}</p>
                              {item.description && <p className="mt-2 text-sm text-white/50">{item.description}</p>}
                            </div>
                            {item.is_featured && (
                              <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-amber-400">
                                Kiemelt
                              </span>
                            )}
                          </div>

                          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-white/40">
                              <span className="rounded-full bg-white/5 px-3 py-1">{formatPrice(item.price)}</span>
                              <span className="rounded-full bg-white/5 px-3 py-1">{orderType === 'bar_pickup' ? 'Pultos átvétel' : 'Asztali kiszolgálás'}</span>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-auto">
                              {inCart && (
                                <>
                                  <button onClick={() => remove(item.id)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg text-white transition hover:bg-white/20">
                                    −
                                  </button>
                                  <span className="w-6 text-center text-sm font-bold text-white">{inCart.qty}</span>
                                </>
                              )}
                              <button onClick={() => add(item)} className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-lg font-bold text-black shadow-lg transition hover:bg-amber-400">
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="mt-5 hidden xl:block">
            <OrderSummary />
          </div>
        </div>
      </div>

      {count > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-4 left-3 right-3 z-30 flex items-center justify-between rounded-[24px] bg-amber-500 px-5 py-4 text-black shadow-2xl transition hover:bg-amber-400 xl:hidden"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black/10 font-black">{count}</span>
          <span className="flex items-center gap-2 text-sm font-bold sm:text-base">
            <ShoppingBag className="h-4 w-4" />
            Kosár megtekintése
          </span>
          <span className="font-black">{formatPrice(total)}</span>
        </button>
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end xl:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setCartOpen(false)} />
          <div className="relative max-h-[86vh] overflow-y-auto rounded-t-[32px] border border-white/10 bg-[color:var(--customer-panel-strong)] px-4 pb-5 pt-4 shadow-2xl anim-up">
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/30">Kosár</p>
                <p className="mt-1 text-xl font-bold text-white">{count} tétel</p>
              </div>
              <button onClick={() => setCartOpen(false)} className="btn-outline w-auto px-4 py-2.5">
                Bezárás
              </button>
            </div>
            <OrderSummary compact />
          </div>
        </div>
      )}
    </div>
  )
}
