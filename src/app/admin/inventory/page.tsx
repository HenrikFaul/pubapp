'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { InventoryItem } from '@/types'
import { AlertTriangle, Plus, Pencil, Package } from 'lucide-react'
import toast from 'react-hot-toast'

export default function InventoryPage() {
  const [venueId, setVenueId] = useState<string | null>(null)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [editItem, setEditItem] = useState<Partial<InventoryItem> | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchItems = useCallback(async (vid: string) => {
    const { data } = await supabase
      .from('inventory')
      .select('*')
      .eq('venue_id', vid)
      .order('item_name')
    setItems(data as InventoryItem[] || [])
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('venue_id').eq('id', user.id).single()
      if (!p?.venue_id) return
      setVenueId(p.venue_id)
      fetchItems(p.venue_id)
    }
    init()
  }, [fetchItems])

  async function saveItem() {
    if (!editItem || !venueId) return
    setSaving(true)
    const payload = { ...editItem, venue_id: venueId, updated_at: new Date().toISOString() }
    const { error } = editItem.id
      ? await supabase.from('inventory').update(payload).eq('id', editItem.id)
      : await supabase.from('inventory').insert(payload)
    if (error) toast.error('Hiba a mentésnél')
    else { toast.success('Mentve!'); setEditItem(null); fetchItems(venueId) }
    setSaving(false)
  }

  async function restock(item: InventoryItem, amount: number) {
    await supabase.from('inventory').update({
      quantity: item.quantity + amount,
      last_restocked_at: new Date().toISOString(),
    }).eq('id', item.id)
    if (venueId) fetchItems(venueId)
    toast.success(`+${amount} ${item.unit} hozzáadva`)
  }

  const lowStockItems = items.filter(i => i.quantity <= i.low_threshold)

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-stone-800" style={{ fontFamily: 'Playfair Display, serif' }}>Készlet</h1>
          <p className="text-stone-500 text-sm">{items.length} tétel nyilvántartva</p>
        </div>
        <button
          onClick={() => setEditItem({ quantity: 0, unit: 'db', low_threshold: 10 })}
          className="flex items-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Új tétel
        </button>
      </div>

      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="font-bold text-red-700">Készlet figyelmeztetés</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.map(i => (
              <span key={i.id} className="bg-red-100 text-red-700 text-xs px-3 py-1 rounded-full font-medium">
                {i.item_name}: {i.quantity} {i.unit}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Inventory grid */}
      {items.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-stone-200 mx-auto mb-3" />
          <p className="text-stone-400">Még nincs készlettétel rögzítve</p>
          <button
            onClick={() => setEditItem({ quantity: 0, unit: 'db', low_threshold: 10 })}
            className="mt-4 text-amber-600 text-sm underline"
          >
            Első tétel hozzáadása
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map(item => {
            const pct = Math.min(100, (item.quantity / (item.low_threshold * 3)) * 100)
            const isLow = item.quantity <= item.low_threshold
            return (
              <div key={item.id} className={`bg-white rounded-2xl border-2 p-4 ${isLow ? 'border-red-200' : 'border-stone-100'}`}>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-stone-800">{item.item_name}</h3>
                  <button onClick={() => setEditItem(item)} className="w-7 h-7 bg-stone-100 hover:bg-amber-100 rounded-lg flex items-center justify-center">
                    <Pencil className="w-3.5 h-3.5 text-stone-500" />
                  </button>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className={`font-bold text-lg ${isLow ? 'text-red-600' : 'text-stone-800'}`}>
                      {item.quantity} <span className="text-sm font-normal text-stone-400">{item.unit}</span>
                    </span>
                    {isLow && <span className="text-red-500 text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Alacsony</span>}
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct < 25 ? 'bg-red-400' : pct < 50 ? 'bg-yellow-400' : 'bg-green-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-stone-400 mt-1">Min. küszöb: {item.low_threshold} {item.unit}</p>
                </div>

                <div className="flex gap-2">
                  {[5, 10, 50].map(amt => (
                    <button
                      key={amt}
                      onClick={() => restock(item, amt)}
                      className="flex-1 text-xs py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-medium transition-colors"
                    >
                      +{amt}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit modal */}
      {editItem !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md animate-slide-up">
            <div className="px-5 pt-5 pb-3 border-b border-stone-100 flex items-center justify-between">
              <h2 className="font-bold text-stone-800">{editItem.id ? 'Tétel szerkesztése' : 'Új készlettétel'}</h2>
              <button onClick={() => setEditItem(null)} className="text-stone-400">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-stone-600 text-xs mb-1 block">Megnevezés *</label>
                <input value={editItem.item_name || ''} onChange={e => setEditItem(p => ({ ...p!, item_name: e.target.value }))}
                  className="input" placeholder="pl. Soproni IPA" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-600 text-xs mb-1 block">Mennyiség *</label>
                  <input type="number" value={editItem.quantity ?? ''} onChange={e => setEditItem(p => ({ ...p!, quantity: parseFloat(e.target.value) || 0 }))}
                    className="input" />
                </div>
                <div>
                  <label className="text-stone-600 text-xs mb-1 block">Egység</label>
                  <select value={editItem.unit || 'db'} onChange={e => setEditItem(p => ({ ...p!, unit: e.target.value }))} className="input">
                    {['db', 'liter', 'kg', 'csomag', 'adag', 'üveg'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-stone-600 text-xs mb-1 block">Min. küszöb</label>
                  <input type="number" value={editItem.low_threshold ?? ''} onChange={e => setEditItem(p => ({ ...p!, low_threshold: parseInt(e.target.value) || 0 }))}
                    className="input" />
                </div>
                <div>
                  <label className="text-stone-600 text-xs mb-1 block">Egységár (Ft)</label>
                  <input type="number" value={editItem.cost_per_unit ?? ''} onChange={e => setEditItem(p => ({ ...p!, cost_per_unit: parseInt(e.target.value) || 0 }))}
                    className="input" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditItem(null)} className="flex-1 py-2.5 border border-stone-200 text-stone-600 rounded-xl text-sm">Mégse</button>
                <button onClick={saveItem} disabled={saving} className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold disabled:opacity-50">
                  {saving ? 'Mentés...' : 'Mentés'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
