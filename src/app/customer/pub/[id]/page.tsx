'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Venue, MenuItem, MenuCategory, CartItem, OrderType } from '@/types'
import { formatPrice } from '@/lib/utils'
import {
  ArrowLeft, Star, MapPin, Phone, Clock, ShoppingCart,
  Plus, Minus, X, Beer, ChevronDown, ChevronUp, Check, Wifi
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function PubDetailPage() {
  const router = useRouter()
  const params = useParams()
  const venueId = params.id as string

  const [venue, setVenue] = useState<Venue | null>(null)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [orderType, setOrderType] = useState<OrderType>('bar_pickup')
  const [tableNumber, setTableNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchVenue = useCallback(async () => {
    const { data } = await supabase.from('venues').select('*').eq('id', venueId).single()
    setVenue(data)
  }, [venueId])

  const fetchMenu = useCallback(async () => {
    const { data: cats } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('venue_id', venueId)
      .eq('is_active', true)
      .order('sort_order')

    const { data: items } = await supabase
      .from('menu_items')
      .select('*, category:menu_categories(*)')
      .eq('venue_id', venueId)
      .eq('is_available', true)
      .order('sort_order')

    setCategories(cats || [])
    setMenuItems(items || [])
    if (cats && cats.length > 0) setActiveCategory(cats[0].id)
    setLoading(false)
  }, [venueId])

  useEffect(() => {
    fetchVenue()
    fetchMenu()
  }, [fetchVenue, fetchMenu])

  function addToCart(item: MenuItem) {
    setCart(prev => {
      const existing = prev.find(c => c.menu_item.id === item.id)
      if (existing) {
        return prev.map(c => c.menu_item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      }
      return [...prev, { menu_item: item, quantity: 1 }]
    })
    toast.success(`${item.name} kosárba téve`, { duration: 1500 })
  }

  function removeFromCart(itemId: string) {
    setCart(prev => {
      const existing = prev.find(c => c.menu_item.id === itemId)
      if (existing && existing.quantity > 1) {
        return prev.map(c => c.menu_item.id === itemId ? { ...c, quantity: c.quantity - 1 } : c)
      }
      return prev.filter(c => c.menu_item.id !== itemId)
    })
  }

  const cartTotal = cart.reduce((sum, c) => sum + c.menu_item.price * c.quantity, 0)
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0)

  async function submitOrder() {
    if (cart.length === 0) { toast.error('A kosár üres!'); return }
    if (orderType === 'table_service' && !tableNumber) {
      toast.error('Add meg az asztalszámot!')
      return
    }
    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()

    // Find table if table service
    let tableId: string | undefined
    if (orderType === 'table_service' && tableNumber) {
      const { data: tableData } = await supabase
        .from('tables')
        .select('id')
        .eq('venue_id', venueId)
        .eq('number', parseInt(tableNumber))
        .single()
      tableId = tableData?.id
    }

    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        venue_id: venueId,
        customer_id: user?.id,
        customer_name: user ? undefined : 'Vendég',
        table_id: tableId,
        order_type: orderType,
        payment_method: paymentMethod,
        subtotal: cartTotal,
        total: cartTotal,
        notes,
      })
      .select()
      .single()

    if (error || !order) {
      toast.error('Hiba a rendelés leadásakor')
      setSubmitting(false)
      return
    }

    // Insert order items
    await supabase.from('order_items').insert(
      cart.map(c => ({
        order_id: order.id,
        menu_item_id: c.menu_item.id,
        quantity: c.quantity,
        unit_price: c.menu_item.price,
        total_price: c.menu_item.price * c.quantity,
      }))
    )

    toast.success(`Rendelés leadva! ${order.order_number}`)
    setCart([])
    setCartOpen(false)
    setSubmitting(false)
    router.push(`/customer/orders/${order.id}`)
  }

  const displayedItems = activeCategory
    ? menuItems.filter(i => i.category_id === activeCategory)
    : menuItems

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-amber-600 animate-pulse">Betöltés...</div>
      </div>
    )
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-amber-700">Helyszín nem található</p>
          <button onClick={() => router.back()} className="mt-4 btn-primary">Vissza</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-amber-50 pb-32">
      {/* Hero header */}
      <div className="relative h-52 bg-gradient-to-br from-amber-700 to-amber-950">
        {venue.cover_url && (
          <img src={venue.cover_url} alt={venue.name} className="w-full h-full object-cover opacity-50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        <button
          onClick={() => router.back()}
          className="absolute top-12 left-4 w-9 h-9 bg-black/30 backdrop-blur-sm rounded-xl flex items-center justify-center text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
            {venue.name}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-amber-300 text-sm">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {venue.rating.toFixed(1)} ({venue.review_count})
            </span>
            <span className="flex items-center gap-1 text-amber-200 text-sm">
              <MapPin className="w-3.5 h-3.5" /> {venue.address}
            </span>
          </div>
        </div>
      </div>

      {/* Order type selector */}
      {venue.has_table_service && venue.has_bar_service && (
        <div className="mx-4 mt-4 flex gap-2 p-1 bg-amber-100 rounded-xl">
          <button
            onClick={() => setOrderType('bar_pickup')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${orderType === 'bar_pickup' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-700'}`}
          >
            🍺 Pultnál átveszem
          </button>
          <button
            onClick={() => setOrderType('table_service')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${orderType === 'table_service' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-700'}`}
          >
            🪑 Asztalhoz hozza
          </button>
        </div>
      )}

      {/* Table number for table service */}
      {orderType === 'table_service' && (
        <div className="mx-4 mt-3">
          <input
            type="number"
            value={tableNumber}
            onChange={e => setTableNumber(e.target.value)}
            placeholder="Asztalszám (pl. 7)"
            className="input text-center font-bold text-lg"
          />
        </div>
      )}

      {/* Category tabs */}
      {categories.length > 0 && (
        <div className="sticky top-0 z-10 bg-amber-50/95 backdrop-blur-sm pt-3 pb-1">
          <div className="flex gap-2 px-4 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-white text-amber-700 border border-amber-200'
                }`}
              >
                {cat.icon && <span className="mr-1">{cat.icon}</span>}
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Menu items */}
      <div className="px-4 pt-3 space-y-3">
        {displayedItems.length === 0 ? (
          <div className="text-center py-12 text-amber-400">
            <Beer className="w-12 h-12 mx-auto mb-2" />
            <p>Nincs elérhető termék ebben a kategóriában</p>
          </div>
        ) : (
          displayedItems.map(item => {
            const inCart = cart.find(c => c.menu_item.id === item.id)
            return (
              <div key={item.id} className="bg-white rounded-2xl overflow-hidden border border-amber-100 shadow-sm flex">
                {item.image_url && (
                  <div className="w-24 h-24 flex-shrink-0">
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 p-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-amber-950 text-sm leading-tight">{item.name}</h3>
                      {item.is_featured && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex-shrink-0">⭐ Kiemelt</span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-amber-500 text-xs mt-1 line-clamp-2">{item.description}</p>
                    )}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {item.tags.map(tag => (
                          <span key={tag} className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-amber-700">{formatPrice(item.price)}</span>
                    <div className="flex items-center gap-2">
                      {inCart && (
                        <>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center"
                          >
                            <Minus className="w-3.5 h-3.5 text-amber-700" />
                          </button>
                          <span className="font-bold text-amber-900 w-5 text-center">{inCart.quantity}</span>
                        </>
                      )}
                      <button
                        onClick={() => addToCart(item)}
                        className="w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Cart FAB */}
      {cartCount > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-6 left-4 right-4 bg-amber-900 text-white rounded-2xl py-4 flex items-center justify-between px-5 shadow-xl z-30"
        >
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center font-bold text-sm">
              {cartCount}
            </span>
            <span className="font-semibold">Kosár megtekintése</span>
          </div>
          <span className="font-bold text-amber-300">{formatPrice(cartTotal)}</span>
        </button>
      )}

      {/* Cart Sheet */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCartOpen(false)} />
          <div className="relative bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-white px-5 pt-5 pb-3 border-b border-amber-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-amber-950" style={{ fontFamily: 'Playfair Display, serif' }}>
                Kosár ({cartCount} tétel)
              </h2>
              <button onClick={() => setCartOpen(false)} className="w-8 h-8 bg-amber-50 rounded-full flex items-center justify-center">
                <X className="w-4 h-4 text-amber-600" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              {cart.map(item => (
                <div key={item.menu_item.id} className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => removeFromCart(item.menu_item.id)} className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center">
                      <Minus className="w-3.5 h-3.5 text-amber-700" />
                    </button>
                    <span className="font-bold text-amber-950 w-5 text-center">{item.quantity}</span>
                    <button onClick={() => addToCart(item.menu_item)} className="w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center">
                      <Plus className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                  <span className="flex-1 text-sm text-amber-900">{item.menu_item.name}</span>
                  <span className="font-semibold text-amber-700">{formatPrice(item.menu_item.price * item.quantity)}</span>
                </div>
              ))}

              {/* Notes */}
              <div className="pt-2">
                <label className="text-sm text-amber-600 mb-1 block">Megjegyzés</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Pl. extra szalvéta, allergia megjegyzés..."
                  className="input text-sm h-20 resize-none"
                />
              </div>

              {/* Payment method */}
              <div>
                <label className="text-sm text-amber-600 mb-2 block">Fizetési mód</label>
                <div className="flex gap-2">
                  {(['cash', 'card'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                        paymentMethod === m ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-amber-200 text-amber-400'
                      }`}
                    >
                      {m === 'cash' ? '💵 Készpénz' : '💳 Kártya'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Total & Submit */}
              <div className="pt-2 border-t border-amber-100">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-semibold text-amber-800">Összesen</span>
                  <span className="text-xl font-bold text-amber-900">{formatPrice(cartTotal)}</span>
                </div>
                <button
                  onClick={submitOrder}
                  disabled={submitting}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 rounded-2xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? 'Rendelés küldése...' : (
                    <>
                      <Check className="w-5 h-5" />
                      Rendelés leadása
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
