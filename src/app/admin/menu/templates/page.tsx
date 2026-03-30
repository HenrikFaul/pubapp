'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import { ArrowLeft, Download, Check, AlertTriangle, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface TemplateItem {
  id: string
  category_name: string
  category_icon: string
  category_sort: number
  item_name: string
  item_description: string
  item_price: number
  item_tags: string[]
  item_allergens: string[]
}

interface Template {
  id: string
  name: string
  description: string
  template_type: string
  icon: string
  items: TemplateItem[]
}

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string; accent: string }> = {
  pub: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-300', accent: 'bg-amber-500' },
  restaurant: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-300', accent: 'bg-emerald-500' },
  cafe: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-300', accent: 'bg-orange-500' },
  cocktail_bar: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-300', accent: 'bg-purple-500' },
}

export default function MenuTemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [venueId, setVenueId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  useEffect(() => {
    async function fetch() {
      // Get venue ID
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('venue_id').eq('id', user.id).single()
      if (p?.venue_id) setVenueId(p.venue_id)

      // Fetch templates with items
      const { data: tmpls } = await supabase.from('menu_templates')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (!tmpls || tmpls.length === 0) {
        setLoading(false)
        return
      }

      const { data: items } = await supabase.from('menu_template_items')
        .select('*')
        .in('template_id', tmpls.map(t => t.id))
        .order('category_sort')
        .order('item_sort')

      const merged = tmpls.map(t => ({
        ...t,
        items: (items || []).filter(i => i.template_id === t.id)
      }))

      setTemplates(merged)
      setLoading(false)
    }
    fetch()
  }, [])

  async function applyTemplate(template: Template) {
    if (!venueId) {
      toast.error('Először hozd létre a helyszínedet a Konfigurátorban!')
      return
    }

    setApplying(template.id)
    setConfirmId(null)

    try {
      // Group items by category
      const categories: Record<string, { icon: string; sort: number; items: TemplateItem[] }> = {}
      template.items.forEach(item => {
        if (!categories[item.category_name]) {
          categories[item.category_name] = {
            icon: item.category_icon,
            sort: item.category_sort,
            items: []
          }
        }
        categories[item.category_name].items.push(item)
      })

      let totalItems = 0

      for (const [catName, catData] of Object.entries(categories)) {
        // Check if category exists
        const { data: existingCat } = await supabase
          .from('menu_categories')
          .select('id')
          .eq('venue_id', venueId)
          .eq('name', catName)
          .single()

        let categoryId: string

        if (existingCat) {
          categoryId = existingCat.id
        } else {
          // Create category
          const { data: newCat } = await supabase
            .from('menu_categories')
            .insert({
              venue_id: venueId,
              name: catName,
              icon: catData.icon,
              sort_order: catData.sort,
              is_active: true,
            })
            .select('id')
            .single()

          if (!newCat) continue
          categoryId = newCat.id
        }

        // Insert items (skip duplicates by name)
        for (const item of catData.items) {
          const { data: existing } = await supabase
            .from('menu_items')
            .select('id')
            .eq('venue_id', venueId)
            .eq('name', item.item_name)
            .single()

          if (!existing) {
            await supabase.from('menu_items').insert({
              venue_id: venueId,
              category_id: categoryId,
              name: item.item_name,
              description: item.item_description || null,
              price: item.item_price,
              is_available: true,
              is_featured: false,
              sort_order: item.item_sort,
              allergens: item.item_allergens || [],
              tags: item.item_tags || [],
            })
            totalItems++
          }
        }
      }

      toast.success(`Sablon betöltve! ${Object.keys(categories).length} kategória, ${totalItems} új termék hozzáadva.`)
    } catch (err) {
      toast.error('Hiba a sablon betöltésekor')
      console.error(err)
    }

    setApplying(null)
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-center py-16 text-amber-400 animate-pulse">
          <Sparkles className="w-8 h-8 mx-auto mb-3" />
          <p>Sablonok betöltése...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => router.push('/admin/menu')} className="text-stone-400 hover:text-stone-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-stone-800" style={{ fontFamily: 'Playfair Display, serif' }}>
            Étlap sablonok
          </h1>
          <p className="text-stone-500 text-sm">Válassz sablont és töltsd be az étlapodra egyetlen kattintással</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex gap-3">
        <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-amber-800 text-sm font-medium">Hogyan működik?</p>
          <p className="text-amber-700 text-xs mt-1">
            Válassz egy sablont, nézd meg a tartalmát, majd kattints a „Betöltés az étlapra" gombra.
            A kategóriák és termékek automatikusan létrejönnek. Már meglévő nevű termékek nem duplikálódnak.
            Utána szabadon szerkesztheted az árakat és leírásokat az Étlap oldalon.
          </p>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-16">
          <AlertTriangle className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500">Nincsenek elérhető sablonok.</p>
          <p className="text-stone-400 text-xs mt-1">Futtasd a 002-es SQL migrációt a sablonok létrehozásához.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map(template => {
            const colors = TYPE_COLORS[template.template_type] || TYPE_COLORS.pub
            const isExpanded = expanded === template.id
            const isApplying = applying === template.id

            // Group items by category for preview
            const categories: Record<string, TemplateItem[]> = {}
            template.items.forEach(item => {
              if (!categories[item.category_name]) categories[item.category_name] = []
              categories[item.category_name].push(item)
            })

            return (
              <div key={template.id}
                className={`${colors.bg} border ${colors.border} rounded-2xl overflow-hidden transition-all`}
              >
                {/* Template header */}
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 ${colors.accent} rounded-xl flex items-center justify-center text-2xl flex-shrink-0`}>
                      {template.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-stone-800 font-bold text-lg">{template.name}</h2>
                      <p className="text-stone-500 text-sm mt-0.5">{template.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-stone-400">
                        <span>{Object.keys(categories).length} kategória</span>
                        <span>•</span>
                        <span>{template.items.length} termék</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {confirmId === template.id ? (
                        <div className="flex flex-col gap-1.5">
                          <button
                            onClick={() => applyTemplate(template)}
                            disabled={isApplying}
                            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold disabled:opacity-50"
                          >
                            {isApplying ? (
                              <>⏳ Betöltés...</>
                            ) : (
                              <><Check className="w-4 h-4" /> Megerősítés</>
                            )}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="text-stone-400 text-xs text-center hover:text-stone-600"
                          >
                            Mégse
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(template.id)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-colors"
                        >
                          <Download className="w-4 h-4" /> Betöltés az étlapra
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expand/collapse */}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : template.id)}
                    className="flex items-center gap-2 mt-3 text-stone-400 text-xs hover:text-stone-600 transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {isExpanded ? 'Tartalom elrejtése' : 'Tartalom megtekintése'}
                  </button>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-stone-200/50 bg-white/50 px-5 py-4">
                    {Object.entries(categories).map(([catName, items]) => (
                      <div key={catName} className="mb-4 last:mb-0">
                        <h3 className="text-stone-700 font-semibold text-sm flex items-center gap-2 mb-2">
                          <span>{items[0]?.category_icon}</span> {catName}
                          <span className="text-stone-400 font-normal text-xs">({items.length})</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                          {items.map(item => (
                            <div key={item.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-stone-100">
                              <div className="flex-1 min-w-0">
                                <p className="text-stone-700 text-sm font-medium truncate">{item.item_name}</p>
                                {item.item_description && (
                                  <p className="text-stone-400 text-xs truncate">{item.item_description}</p>
                                )}
                              </div>
                              <span className="text-amber-600 font-bold text-sm ml-3 flex-shrink-0">
                                {formatPrice(item.item_price)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
