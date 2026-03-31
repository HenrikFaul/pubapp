'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { copyText, DAY_NAMES, formatPrice, isOpenNow } from '@/lib/utils'
import { ArrowLeft, Calendar, Check, ChevronRight, Clock, MapPin, Send, Star, Store, Users, X } from 'lucide-react'
import type { CartItem, MenuCategory, MenuItem, PlaceFavorite, Profile, Venue } from '@/types'

type OrderType = 'bar_pickup' | 'table_service'
type PaymentMethod = 'cash' | 'card'

export default function VenuePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { id } = useParams() as { id: string }
  const [venue, setVenue] = useState<Venue | null>(null)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [orderType, setOrderType] = useState<OrderType>('bar_pickup')
  const [tableNum, setTableNum] = useState('')
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [favorite, setFavorite] = useState<PlaceFavorite | null>(null)
  const [reservationOpen, setReservationOpen] = useState(false)
  const [reservationSaving, setReservationSaving] = useState(false)
  const [reservationForm, setReservationForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    party_size: 2,
    reservation_date: new Date().toISOString().slice(0, 10),
    reservation_time: '19:00',
    duration_minutes: 120,
    notes: '',
  })

  const total = useMemo(() => cart.reduce((sum, line) => sum + line.menu_item.price * line.quantity, 0), [cart])
  const count = useMemo(() => cart.reduce((sum, line) => sum + line.quantity, 0), [cart])

  const load = useCallback(async () => {
    const [{ data: venueRow }, { data: categoryRows }, { data: itemRows }, auth] = await Promise.all([
      supabase.from('venues').select('*').eq('id', id).single(),
      supabase.from('menu_categories').select('*').eq('venue_id', id).eq('is_active', true).order('sort_order'),
      supabase.from('menu_items').select('*').eq('venue_id', id).eq('is_available', true).order('sort_order'),
      supabase.auth.getUser(),
    ])

    setVenue((venueRow || null) as Venue | null)
    setCategories((categoryRows || []) as MenuCategory[])
    setItems((itemRows || []) as MenuItem[])
    setActiveCat(categoryRows?.[0]?.id || null)

    const tableFromQuery = searchParams.get('table')
    if (tableFromQuery) {
      setTableNum(tableFromQuery)
      setOrderType('table_service')
    }

    if (typeof window !== 'undefined' && venueRow?.id && venueRow?.name) {
      window.localStorage.setItem(
        'kapakka_checked_in_context',
        JSON.stringify({
          venueId: venueRow.id,
          venueName: venueRow.name,
          tableNumber: tableFromQuery || undefined,
        })
      )
    }

    const user = auth.data.user
    if (user?.id) {
      const [{ data: profileRow }, { data: favoriteRow }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('place_favorites').select('*').eq('user_id', user.id).eq('venue_id', id).maybeSingle(),
      ])
      setProfile((profileRow || null) as Profile | null)
      setFavorite((favoriteRow || null) as PlaceFavorite | null)
      setReservationForm((prev) => ({
        ...prev,
        customer_name: profileRow?.full_name || prev.customer_name,
        customer_email: profileRow?.email || prev.customer_email,
        customer_phone: profileRow?.phone || prev.customer_phone,
      }))
    }

    setLoading(false)
  }, [id, searchParams])

  useEffect(() => {
    load()
  }, [load])

  function add(menuItem: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((line) => line.menu_item.id === menuItem.id)
      if (existing) {
        return prev.map((line) =>
          line.menu_item.id === menuItem.id ? { ...line, quantity: line.quantity + 1 } : line
        )
      }
      return [...prev, { menu_item: menuItem, quantity: 1 }]
    })
  }

  function remove(menuItemId: string) {
    setCart((prev) =>
      prev
        .map((line) => (line.menu_item.id === menuItemId ? { ...line, quantity: line.quantity - 1 } : line))
        .filter((line) => line.quantity > 0)
    )
  }

  async function placeOrder() {
    if (!venue || !cart.length) return
    if (orderType === 'table_service' && !tableNum.trim()) {
      toast.error('Add meg az asztalszámot.')
      return
    }

    setSubmitting(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let tableId: string | undefined
    if (tableNum.trim()) {
      const { data: table } = await supabase
        .from('tables')
        .select('id')
        .eq('venue_id', id)
        .eq('number', Number(tableNum))
        .maybeSingle()
      tableId = table?.id
    }

    if (typeof window !== 'undefined' && venue?.id && venue?.name) {
      window.localStorage.setItem(
        'kapakka_checked_in_context',
        JSON.stringify({
          venueId: venue.id,
          venueName: venue.name,
          tableNumber: tableNum.trim() || undefined,
        })
      )
    }

    const orderPayload = {
      venue_id: id,
      customer_id: user?.id,
      table_id: tableId,
      customer_name: profile?.full_name || null,
      order_type: orderType,
      payment_method: payMethod,
      subtotal: total,
      total,
      notes,
    }

    const { data: order, error } = await supabase.from('orders').insert(orderPayload).select().single()
    if (error || !order) {
      toast.error('A rendelés leadása nem sikerült.')
      setSubmitting(false)
      return
    }

    await supabase.from('order_items').insert(
      cart.map((line) => ({
        order_id: order.id,
        menu_item_id: line.menu_item.id,
        quantity: line.quantity,
        unit_price: line.menu_item.price,
        total_price: line.menu_item.price * line.quantity,
      }))
    )

    setCart([])
    setCartOpen(false)
    setSubmitting(false)
    toast.success('Rendelés leadva. Az állapotot élőben követheted.')
    router.push(`/customer/orders/${order.id}`)
  }

  async function toggleFavorite() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.id || !venue) return

    if (favorite) {
      const { error } = await supabase.from('place_favorites').delete().eq('id', favorite.id).eq('user_id', user.id)
      if (error) {
        toast.error('Nem sikerült frissíteni a kedvenceket.')
        return
      }
      setFavorite(null)
      toast.success('Venue eltávolítva a kedvencekből.')
      return
    }

    const { data, error } = await supabase
      .from('place_favorites')
      .insert({
        user_id: user.id,
        venue_id: venue.id,
        provider: 'kapakka',
        name: venue.name,
        category: venue.has_kitchen ? 'Étterem' : 'Pub',
        address: venue.address,
        image_url: venue.cover_url || venue.logo_url,
        rating: venue.rating,
      })
      .select()
      .single()

    if (error || !data) {
      toast.error('Nem sikerült kedvenchez adni ezt a helyet.')
      return
    }
    setFavorite(data as PlaceFavorite)
    toast.success('Venue elmentve a kedvencekhez.')
  }

  async function shareVenue() {
    if (!venue) return
    const url = `${window.location.origin}/customer/pub/${venue.id}`
    const text = `${venue.name} — ${venue.address}`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: venue.name, text, url })
        return
      } catch {
        // fallback below
      }
    }
    const ok = await copyText(`${text}\n${url}`)
    if (ok) toast.success('Venue link vágólapra másolva.')
  }

  async function saveReservation() {
    if (!venue) return
    setReservationSaving(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const payload = {
      venue_id: venue.id,
      customer_id: user?.id || null,
      customer_name: reservationForm.customer_name,
      customer_email: reservationForm.customer_email,
      customer_phone: reservationForm.customer_phone,
      party_size: reservationForm.party_size,
      reservation_date: reservationForm.reservation_date,
      reservation_time: reservationForm.reservation_time,
      duration_minutes: reservationForm.duration_minutes,
      notes: reservationForm.notes,
      status: venue.reservation_requires_approval ? 'pending' : 'confirmed',
    }

    const { error } = await supabase.from('reservations').insert(payload)
    setReservationSaving(false)

    if (error) {
      toast.error('A foglalás mentése nem sikerült.')
      return
    }

    toast.success(venue.reservation_requires_approval ? 'Foglalási kérés elküldve.' : 'Foglalás rögzítve.')
    setReservationOpen(false)
  }

  if (loading || !venue) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-[30px] border border-white/10 bg-white/10 text-white shadow-2xl">
          <Store className="h-10 w-10 anim-pulse" />
        </div>
      </div>
    )
  }

  const open = isOpenNow(venue.opening_hours)
  const displayed = activeCat ? items.filter((item) => item.category_id === activeCat) : items

  return (
    <div className="app-shell pb-36">
      <div className="customer-container pt-4 sm:pt-6">
        <div className="hero-card overflow-hidden p-4 sm:p-6">
          <div className="relative z-10 grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <button onClick={() => router.push('/customer')} className="btn-outline mb-5 w-auto px-4 py-3">
                <ArrowLeft className="h-4 w-4" /> Vissza
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`info-chip ${open ? 'text-green-400' : 'text-red-300'}`}>
                  <Clock className="h-4 w-4" /> {open ? 'Nyitva most' : 'Jelenleg zárva'}
                </span>
                {typeof venue.rating === 'number' && <span className="info-chip text-amber-400"><Star className="h-4 w-4 fill-current" /> {venue.rating.toFixed(1)}</span>}
                {venue.has_reservations && <span className="info-chip"><Calendar className="h-4 w-4" /> Foglalható</span>}
              </div>
              <h1 className="section-title mt-5">{venue.name}</h1>
              <p className="section-subtitle mt-3 max-w-2xl">{venue.description || 'Digitális étlap, rendeléskövetés, foglalás és közösségi venue élmény egy felületen.'}</p>
              <div className="mt-4 flex items-start gap-2 text-sm text-white/50">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{venue.address}</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="modern-card overflow-hidden p-4">
                {venue.cover_url ? (
                  <img src={venue.cover_url} alt="" className="place-photo" />
                ) : (
                  <div className="place-photo flex items-center justify-center text-white/70"><Store className="h-10 w-10" /></div>
                )}
              </div>
              <div className="modern-card p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-white/30">Gyors műveletek</p>
                <div className="mt-4 grid gap-3">
                  <button onClick={toggleFavorite} className={`btn-outline ${favorite ? 'border-amber-500 text-amber-400' : ''}`}>
                    <Star className={`h-4 w-4 ${favorite ? 'fill-current' : ''}`} /> Kedvencekhez
                  </button>
                  <button onClick={shareVenue} className="btn-outline">
                    <Send className="h-4 w-4" /> Meghívom a társaságot
                  </button>
                  {venue.has_reservations && (
                    <button onClick={() => setReservationOpen(true)} className="btn-kapakka">
                      <Calendar className="h-4 w-4" /> Asztalfoglalás
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {(venue.has_table_service || venue.has_bar_service) && (
          <div className="mt-5 rounded-[24px] border border-white/10 bg-white/5 p-3">
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
              <div className="flex flex-wrap gap-2">
                {venue.has_bar_service && (
                  <button onClick={() => setOrderType('bar_pickup')} className={`filter-chip ${orderType === 'bar_pickup' ? 'active' : ''}`}>
                    Pultnál átvétel
                  </button>
                )}
                {venue.has_table_service && (
                  <button onClick={() => setOrderType('table_service')} className={`filter-chip ${orderType === 'table_service' ? 'active' : ''}`}>
                    Asztalhoz kérem
                  </button>
                )}
              </div>
              {orderType === 'table_service' && (
                <input value={tableNum} onChange={(event) => setTableNum(event.target.value)} placeholder="Asztalszám" className="kap-input md:max-w-[160px]" />
              )}
              <select value={payMethod} onChange={(event) => setPayMethod(event.target.value as PaymentMethod)} className="kap-input-dark md:max-w-[180px]">
                <option value="cash">Készpénz</option>
                <option value="card">Kártya</option>
              </select>
            </div>
          </div>
        )}

        {categories.length > 0 && (
          <div className="mt-5 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((categoryRow) => (
              <button key={categoryRow.id} onClick={() => setActiveCat(categoryRow.id)} className={`filter-chip whitespace-nowrap ${activeCat === categoryRow.id ? 'active' : ''}`}>
                {categoryRow.icon ? `${categoryRow.icon} ` : ''}{categoryRow.name}
              </button>
            ))}
          </div>
        )}

        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          {displayed.map((item) => {
            const inCart = cart.find((line) => line.menu_item.id === item.id)
            return (
              <article key={item.id} className="menu-item-card p-4 sm:p-5">
                <div className="flex gap-4">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="h-24 w-24 rounded-[20px] object-cover" />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-[20px] border border-white/10 bg-white/5 text-white/55"><Store className="h-8 w-8" /></div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-white">{item.name}</h3>
                        {item.description && <p className="mt-1 text-sm text-white/45">{item.description}</p>}
                      </div>
                      {item.is_featured && <span className="info-chip text-amber-400"><Star className="h-4 w-4 fill-current" /> Kiemelt</span>}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="text-xl font-black text-amber-400">{formatPrice(item.price)}</p>
                      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1">
                        {inCart && (
                          <>
                            <button onClick={() => remove(item.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white">−</button>
                            <span className="w-6 text-center text-sm font-bold text-white">{inCart.quantity}</span>
                          </>
                        )}
                        <button onClick={() => add(item)} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-black font-black">+</button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="modern-card p-5">
            <p className="text-sm font-semibold text-white">Venue részletek</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-white/30">Kapcsolat</p>
                <p className="mt-2 text-sm text-white">{venue.phone || 'Nincs telefonszám'}</p>
                <p className="mt-1 text-sm text-white/50">{venue.email || 'Nincs email'}</p>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-white/30">Funkciók</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {venue.has_table_service && <span className="info-chip">Asztali rendelés</span>}
                  {venue.has_bar_service && <span className="info-chip">Pult pickup</span>}
                  {venue.has_kitchen && <span className="info-chip">Konyha</span>}
                  {venue.has_loyalty_program && <span className="info-chip">Hűségpont</span>}
                </div>
              </div>
            </div>
          </div>
          <div className="modern-card p-5">
            <p className="text-sm font-semibold text-white">Nyitvatartás</p>
            <div className="mt-4 space-y-2 text-sm text-white/60">
              {Object.entries(venue.opening_hours || {}).map(([day, value]) => (
                <div key={day} className="flex items-center justify-between rounded-[18px] border border-white/10 bg-white/5 px-3 py-2">
                  <span>{DAY_NAMES[day] || day}</span>
                  <span className="font-semibold text-white">{value.closed ? 'Zárva' : `${value.open} – ${value.close}`}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {count > 0 && !cartOpen && (
        <button onClick={() => setCartOpen(true)} className="fixed bottom-6 left-4 right-4 z-30 rounded-[24px] bg-amber-500 px-5 py-4 text-black shadow-2xl lg:left-auto lg:right-8 lg:w-[380px]">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-black/15 px-2 font-black">{count}</span>
            <span className="font-black">Kosár megnyitása</span>
            <span className="font-black">{formatPrice(total)}</span>
          </div>
        </button>
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:p-6">
          <div className="detail-sheet max-h-[92vh] w-full max-w-2xl overflow-y-auto p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/30">Kosár</p>
                <p className="mt-1 text-2xl font-bold text-white">{count} tétel</p>
              </div>
              <button onClick={() => setCartOpen(false)} className="rounded-full border border-white/10 bg-white/5 p-2 text-white/50 transition hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {cart.map((line) => (
                <div key={line.menu_item.id} className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{line.menu_item.name}</p>
                      <p className="mt-1 text-sm text-white/45">{formatPrice(line.menu_item.price)} / db</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/10 px-2 py-1">
                      <button onClick={() => remove(line.menu_item.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white">−</button>
                      <span className="w-6 text-center text-sm font-bold text-white">{line.quantity}</span>
                      <button onClick={() => add(line.menu_item)} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-black font-black">+</button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-white/45">Részösszeg</span>
                    <span className="font-semibold text-amber-400">{formatPrice(line.menu_item.price * line.quantity)}</span>
                  </div>
                </div>
              ))}

              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Allergia, különleges kérés, extra információ" className="kap-input h-24 resize-none" />

              <div className="flex items-center justify-between rounded-[22px] border border-white/10 bg-white/5 px-4 py-4">
                <span className="text-base font-semibold text-white">Összesen</span>
                <span className="text-2xl font-black text-amber-400">{formatPrice(total)}</span>
              </div>

              <button onClick={placeOrder} disabled={submitting} className="btn-kapakka text-base font-black">
                <Check className="h-4 w-4" /> {submitting ? 'Küldés…' : 'Rendelés leadása'}
              </button>
            </div>
          </div>
        </div>
      )}

      {reservationOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:p-6">
          <div className="detail-sheet max-h-[92vh] w-full max-w-xl overflow-y-auto p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/30">Asztalfoglalás</p>
                <p className="mt-1 text-2xl font-bold text-white">{venue.name}</p>
              </div>
              <button onClick={() => setReservationOpen(false)} className="rounded-full border border-white/10 bg-white/5 p-2 text-white/50 transition hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <input value={reservationForm.customer_name} onChange={(event) => setReservationForm((prev) => ({ ...prev, customer_name: event.target.value }))} placeholder="Név" className="kap-input" />
              <input value={reservationForm.customer_phone} onChange={(event) => setReservationForm((prev) => ({ ...prev, customer_phone: event.target.value }))} placeholder="Telefonszám" className="kap-input" />
              <input value={reservationForm.customer_email} onChange={(event) => setReservationForm((prev) => ({ ...prev, customer_email: event.target.value }))} placeholder="Email" className="kap-input sm:col-span-2" />
              <input type="date" value={reservationForm.reservation_date} onChange={(event) => setReservationForm((prev) => ({ ...prev, reservation_date: event.target.value }))} className="kap-input" />
              <input type="time" value={reservationForm.reservation_time} onChange={(event) => setReservationForm((prev) => ({ ...prev, reservation_time: event.target.value }))} className="kap-input" />
              <div className="sm:col-span-2">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/35">Létszám: {reservationForm.party_size} fő</label>
                <input type="range" min={1} max={venue.reservation_max_party_size || 12} value={reservationForm.party_size} onChange={(event) => setReservationForm((prev) => ({ ...prev, party_size: Number(event.target.value) }))} className="w-full accent-amber-500" />
              </div>
              <textarea value={reservationForm.notes} onChange={(event) => setReservationForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Speciális kérés, gyerekülés, terasz stb." className="kap-input sm:col-span-2 h-24 resize-none" />
            </div>

            <div className="mt-5 flex gap-3">
              <button onClick={() => setReservationOpen(false)} className="btn-outline flex-1">Mégse</button>
              <button onClick={saveReservation} disabled={reservationSaving || !reservationForm.customer_name} className="btn-kapakka flex-1">
                {reservationSaving ? 'Mentés…' : 'Foglalás elküldése'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
