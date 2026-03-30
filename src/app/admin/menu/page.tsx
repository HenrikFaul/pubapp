'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { MenuItem, MenuCategory } from '@/types'
import { formatPrice } from '@/lib/utils'
import { Plus, Pencil, Trash2, Search, Upload, CheckCircle, XCircle, Sparkles } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function MenuPage() {
  const [venueId, setVenueId] = useState<string | null>(null)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [editItem, setEditItem] = useState<Partial<MenuItem> | null>(null)
  const [editCat, setEditCat] = useState<Partial<MenuCategory> | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchAll = useCallback(async (vid: string) => {
    const { data: cats } = await supabase.from('menu_categories').select('*').eq('venue_id', vid).order('sort_order')
    const { data: its } = await supabase.from('menu_items').select('*, category:menu_categories(*)').eq('venue_id', vid).order('sort_order')
    setCategories(cats || [])
    setItems(its as MenuItem[] || [])
    if (cats && cats.length > 0 && !activeCategory) setActiveCategory(cats[0].id)
  }, [activeCategory])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('venue_id').eq('id', user.id).single()
      if (!p?.venue_id) return
      setVenueId(p.venue_id)
      fetchAll(p.venue_id)
    }
    init()
  }, [fetchAll])

  async function saveItem() {
    if (!editItem || !venueId) return
    setSaving(true)
    const payload = { ...editItem, venue_id: venueId, updated_at: new Date().toISOString() }
    const { error } = editItem.id
      ? await supabase.from('menu_items').update(payload).eq('id', editItem.id)
      : await supabase.from('menu_items').insert(payload)
    if (error) toast.error('Hiba a mentésnél')
    else { toast.success('Mentve!'); setEditItem(null); fetchAll(venueId) }
    setSaving(false)
  }

  async function deleteItem(id: string) {
    if (!confirm('Biztosan törlöd?') || !venueId) return
    await supabase.from('menu_items').delete().eq('id', id)
    toast.success('Törölve')
    fetchAll(venueId)
  }

  async function toggleAvailability(item: MenuItem) {
    await supabase.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id)
    if (venueId) fetchAll(venueId)
  }

  async function saveCategory() {
    if (!editCat || !venueId) return
    const payload = { ...editCat, venue_id: venueId }
    const { error } = editCat.id
      ? await supabase.from('menu_categories').update(payload).eq('id', editCat.id)
      : await supabase.from('menu_categories').insert(payload)
    if (error) toast.error('Hiba a mentésnél')
    else { toast.success('Kategória mentve!'); setEditCat(null); if (venueId) fetchAll(venueId) }
  }

  const filteredItems = items
    .filter(i => activeCategory ? i.category_id === activeCategory : true)
    .filter(i => i.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-stone-800" style={{ fontFamily: 'Playfair Display, serif' }}>Étlap</h1>
          <p className="text-stone-500 text-sm">{items.length} termék, {categories.length} kategória</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/menu/templates"
            className="flex items-center gap-2 px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl text-sm font-medium transition-colors"
          >
            <Sparkles className="w-4 h-4" /> Sablonok
          </Link>
          <button
            onClick={() => setEditCat({ sort_order: categories.length })}
            className="flex items-center gap-2 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Kategória
          </button>
          <button
            onClick={() => setEditItem({ is_available: true, price: 0, sort_order: 0, category_id: activeCategory || undefined })}
            className="flex items-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Termék
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Termék keresése..."
          className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveCategory(null)}
          className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${!activeCategory ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-stone-600 border-stone-200'}`}
        >
          Összes
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors border flex items-center gap-1.5 ${activeCategory === cat.id ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-stone-600 border-stone-200'}`}
          >
            {cat.icon && <span>{cat.icon}</span>}
            {cat.name}
            <button
              onClick={e => { e.stopPropagation(); setEditCat(cat) }}
              className={`ml-1 ${activeCategory === cat.id ? 'text-white/70 hover:text-white' : 'text-stone-400 hover:text-stone-600'}`}
            >
              <Pencil className="w-3 h-3" />
            </button>
          </button>
        ))}
      </div>

      {/* Items table */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <p>Nincs termék ebben a kategóriában</p>
            <button onClick={() => setEditItem({ is_available: true, price: 0, category_id: activeCategory || undefined })} className="mt-3 text-amber-600 text-sm underline">
              + Első termék hozzáadása
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-100">
                <tr>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">Termék</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium hidden md:table-cell">Kategória</th>
                  <th className="text-right px-4 py-3 text-stone-500 font-medium">Ár</th>
                  <th className="text-center px-4 py-3 text-stone-500 font-medium">Elérhető</th>
                  <th className="text-center px-4 py-3 text-stone-500 font-medium">Műveletek</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filteredItems.map(item => (
                  <tr key={item.id} className={`hover:bg-stone-50 transition-colors ${!item.is_available ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-lg flex-shrink-0">🍽</div>
                        )}
                        <div>
                          <p className="font-medium text-stone-800">{item.name}</p>
                          {item.description && <p className="text-stone-400 text-xs truncate max-w-[200px]">{item.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-stone-500 text-xs">{(item as any).category?.name || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-stone-800">{formatPrice(item.price)}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleAvailability(item)}>
                        {item.is_available
                          ? <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                          : <XCircle className="w-5 h-5 text-red-400 mx-auto" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setEditItem(item)} className="w-8 h-8 bg-stone-100 hover:bg-amber-100 rounded-lg flex items-center justify-center transition-colors">
                          <Pencil className="w-3.5 h-3.5 text-stone-600" />
                        </button>
                        <button onClick={() => deleteItem(item.id)} className="w-8 h-8 bg-stone-100 hover:bg-red-100 rounded-lg flex items-center justify-center transition-colors">
                          <Trash2 className="w-3.5 h-3.5 text-stone-600 hover:text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Item Modal */}
      {editItem !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="px-5 pt-5 pb-3 border-b border-stone-100 flex items-center justify-between">
              <h2 className="font-bold text-stone-800">{editItem.id ? 'Termék szerkesztése' : 'Új termék'}</h2>
              <button onClick={() => setEditItem(null)} className="text-stone-400 hover:text-stone-600">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-stone-600 text-xs mb-1 block font-medium">Termék neve *</label>
                  <input value={editItem.name || ''} onChange={e => setEditItem(p => ({ ...p!, name: e.target.value }))}
                    className="input" placeholder="pl. Soproni IPA" />
                </div>
                <div>
                  <label className="text-stone-600 text-xs mb-1 block font-medium">Ár (HUF) *</label>
                  <input type="number" value={editItem.price || ''} onChange={e => setEditItem(p => ({ ...p!, price: parseInt(e.target.value) || 0 }))}
                    className="input" placeholder="850" />
                </div>
                <div>
                  <label className="text-stone-600 text-xs mb-1 block font-medium">Kategória</label>
                  <select value={editItem.category_id || ''} onChange={e => setEditItem(p => ({ ...p!, category_id: e.target.value }))}
                    className="input">
                    <option value="">— Válassz —</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-stone-600 text-xs mb-1 block font-medium">Leírás</label>
                  <textarea value={editItem.description || ''} onChange={e => setEditItem(p => ({ ...p!, description: e.target.value }))}
                    className="input h-20 resize-none" placeholder="Rövid leírás..." />
                </div>
                <div className="col-span-2">
                  <label className="text-stone-600 text-xs mb-1 block font-medium">Kép URL</label>
                  <input value={editItem.image_url || ''} onChange={e => setEditItem(p => ({ ...p!, image_url: e.target.value }))}
                    className="input" placeholder="https://..." />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="available" checked={editItem.is_available ?? true}
                    onChange={e => setEditItem(p => ({ ...p!, is_available: e.target.checked }))} className="w-4 h-4 accent-amber-500" />
                  <label htmlFor="available" className="text-sm text-stone-700">Elérhető</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="featured" checked={editItem.is_featured ?? false}
                    onChange={e => setEditItem(p => ({ ...p!, is_featured: e.target.checked }))} className="w-4 h-4 accent-amber-500" />
                  <label htmlFor="featured" className="text-sm text-stone-700">⭐ Kiemelt</label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditItem(null)} className="flex-1 py-2.5 border border-stone-200 text-stone-600 rounded-xl text-sm font-medium">Mégse</button>
                <button onClick={saveItem} disabled={saving} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold disabled:opacity-50">
                  {saving ? 'Mentés...' : 'Mentés'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editCat !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md animate-slide-up">
            <div className="px-5 pt-5 pb-3 border-b border-stone-100 flex items-center justify-between">
              <h2 className="font-bold text-stone-800">{editCat.id ? 'Kategória szerkesztése' : 'Új kategória'}</h2>
              <button onClick={() => setEditCat(null)} className="text-stone-400">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-stone-600 text-xs mb-1 block">Név *</label>
                <input value={editCat.name || ''} onChange={e => setEditCat(p => ({ ...p!, name: e.target.value }))}
                  className="input" placeholder="pl. Sörök" />
              </div>
              <div>
                <label className="text-stone-600 text-xs mb-1 block">Ikon (emoji)</label>
                <input value={editCat.icon || ''} onChange={e => setEditCat(p => ({ ...p!, icon: e.target.value }))}
                  className="input" placeholder="🍺" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setEditCat(null)} className="flex-1 py-2.5 border border-stone-200 text-stone-600 rounded-xl text-sm">Mégse</button>
                <button onClick={saveCategory} className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold">Mentés</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
