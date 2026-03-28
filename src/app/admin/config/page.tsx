'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Venue } from '@/types'
import { DAY_NAMES } from '@/lib/utils'
import { Save, Store, Clock, CreditCard, Settings2, Users, QrCode } from 'lucide-react'
import toast from 'react-hot-toast'
import { QRCodeSVG } from 'qrcode.react'

type Tab = 'venue' | 'hours' | 'payment' | 'tables' | 'staff'

export default function ConfigPage() {
  const [tab, setTab] = useState<Tab>('venue')
  const [venue, setVenue] = useState<Partial<Venue>>({})
  const [tables, setTables] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [venueId, setVenueId] = useState<string | null>(null)
  const [newStaffEmail, setNewStaffEmail] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('venue_id').eq('id', user.id).single()
      if (!profile?.venue_id) return
      setVenueId(profile.venue_id)

      const { data: v } = await supabase.from('venues').select('*').eq('id', profile.venue_id).single()
      if (v) setVenue(v)

      const { data: t } = await supabase.from('tables').select('*').eq('venue_id', profile.venue_id).order('number')
      setTables(t || [])

      const { data: s } = await supabase.from('profiles').select('*').eq('venue_id', profile.venue_id).neq('role', 'customer')
      setStaff(s || [])
    }
    init()
  }, [])

  async function saveVenue() {
    if (!venueId) return
    setSaving(true)
    const { error } = await supabase.from('venues').update({ ...venue, updated_at: new Date().toISOString() }).eq('id', venueId)
    if (error) toast.error('Hiba a mentésnél')
    else toast.success('Mentve!')
    setSaving(false)
  }

  async function addTable() {
    if (!venueId) return
    const maxNum = tables.length > 0 ? Math.max(...tables.map(t => t.number)) : 0
    const { data } = await supabase.from('tables').insert({ venue_id: venueId, number: maxNum + 1, capacity: 4 }).select().single()
    if (data) setTables(prev => [...prev, data])
  }

  async function deleteTable(id: string) {
    await supabase.from('tables').delete().eq('id', id)
    setTables(prev => prev.filter(t => t.id !== id))
  }

  async function inviteStaff() {
    if (!newStaffEmail || !venueId) return
    toast.success('Meghívó küldve (demo mód - valós email küldés konfigurálható)')
    setNewStaffEmail('')
  }

  const TABS = [
    { id: 'venue' as Tab, label: 'Étterem', icon: <Store className="w-4 h-4" /> },
    { id: 'hours' as Tab, label: 'Nyitvatartás', icon: <Clock className="w-4 h-4" /> },
    { id: 'payment' as Tab, label: 'Fizetés & szolgáltatások', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'tables' as Tab, label: 'Asztalok', icon: <Settings2 className="w-4 h-4" /> },
    { id: 'staff' as Tab, label: 'Munkatársak', icon: <Users className="w-4 h-4" /> },
  ]

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-stone-800" style={{ fontFamily: 'Playfair Display, serif' }}>Konfigurátor</h1>
        <p className="text-stone-500 text-sm">Étterem beállítások</p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${tab === t.id ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-stone-600 border-stone-200 hover:border-amber-300'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 p-5">
        {tab === 'venue' && (
          <div className="space-y-4">
            <h2 className="font-bold text-stone-700">Alapadatok</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-stone-500 text-xs mb-1 block">Helyszín neve *</label>
                <input value={venue.name || ''} onChange={e => setVenue(p => ({ ...p, name: e.target.value }))} className="input" placeholder="Kapakka Söröző" />
              </div>
              <div>
                <label className="text-stone-500 text-xs mb-1 block">Webcím (URL slug)</label>
                <input value={venue.slug || ''} onChange={e => setVenue(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} className="input" placeholder="kapakka-sorozo" />
              </div>
              <div className="md:col-span-2">
                <label className="text-stone-500 text-xs mb-1 block">Leírás</label>
                <textarea value={venue.description || ''} onChange={e => setVenue(p => ({ ...p, description: e.target.value }))} className="input h-24 resize-none" placeholder="Rövid leírás a vendégeknek..." />
              </div>
              <div className="md:col-span-2">
                <label className="text-stone-500 text-xs mb-1 block">Cím</label>
                <input value={venue.address || ''} onChange={e => setVenue(p => ({ ...p, address: e.target.value }))} className="input" placeholder="Budapest, Kossuth tér 1." />
              </div>
              <div>
                <label className="text-stone-500 text-xs mb-1 block">Telefonszám</label>
                <input value={venue.phone || ''} onChange={e => setVenue(p => ({ ...p, phone: e.target.value }))} className="input" placeholder="+36 1 234 5678" />
              </div>
              <div>
                <label className="text-stone-500 text-xs mb-1 block">Email</label>
                <input type="email" value={venue.email || ''} onChange={e => setVenue(p => ({ ...p, email: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="text-stone-500 text-xs mb-1 block">Logo URL</label>
                <input value={venue.logo_url || ''} onChange={e => setVenue(p => ({ ...p, logo_url: e.target.value }))} className="input" placeholder="https://..." />
              </div>
              <div>
                <label className="text-stone-500 text-xs mb-1 block">Borítókép URL</label>
                <input value={venue.cover_url || ''} onChange={e => setVenue(p => ({ ...p, cover_url: e.target.value }))} className="input" placeholder="https://..." />
              </div>
            </div>
          </div>
        )}

        {tab === 'hours' && (
          <div className="space-y-3">
            <h2 className="font-bold text-stone-700 mb-4">Nyitvatartás</h2>
            {Object.keys(DAY_NAMES).map(day => {
              const hours = (venue.opening_hours as any)?.[day] || { open: '10:00', close: '24:00', closed: false }
              return (
                <div key={day} className="flex items-center gap-3 py-2 border-b border-stone-50">
                  <span className="w-24 text-sm font-medium text-stone-700">{DAY_NAMES[day]}</span>
                  <input type="checkbox" checked={!hours.closed}
                    onChange={e => setVenue(p => ({ ...p, opening_hours: { ...(p.opening_hours as any), [day]: { ...hours, closed: !e.target.checked } } }))}
                    className="accent-amber-500" />
                  {!hours.closed ? (
                    <>
                      <input type="time" value={hours.open}
                        onChange={e => setVenue(p => ({ ...p, opening_hours: { ...(p.opening_hours as any), [day]: { ...hours, open: e.target.value } } }))}
                        className="input text-sm py-1.5 w-28" />
                      <span className="text-stone-400">—</span>
                      <input type="time" value={hours.close}
                        onChange={e => setVenue(p => ({ ...p, opening_hours: { ...(p.opening_hours as any), [day]: { ...hours, close: e.target.value } } }))}
                        className="input text-sm py-1.5 w-28" />
                    </>
                  ) : (
                    <span className="text-stone-400 text-sm">Zárva</span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {tab === 'payment' && (
          <div className="space-y-5">
            <div>
              <h2 className="font-bold text-stone-700 mb-3">Fizetési módok</h2>
              <div className="space-y-2">
                {[
                  { key: 'accepts_cash', label: '💵 Készpénz elfogadás' },
                  { key: 'accepts_card', label: '💳 Kártyafizetés' },
                  { key: 'accepts_app_payment', label: '📱 App-on keresztüli fizetés' },
                ].map(opt => (
                  <label key={opt.key} className="flex items-center gap-3 py-2 cursor-pointer">
                    <input type="checkbox" checked={(venue as any)[opt.key] ?? false}
                      onChange={e => setVenue(p => ({ ...p, [opt.key]: e.target.checked }))}
                      className="w-4 h-4 accent-amber-500" />
                    <span className="text-stone-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h2 className="font-bold text-stone-700 mb-3">Szolgáltatások</h2>
              <div className="space-y-2">
                {[
                  { key: 'has_table_service', label: '🪑 Asztali kiszolgálás (rendelés asztalhoz)' },
                  { key: 'has_bar_service', label: '🍺 Pultás kiszolgálás (pultnál átvétel)' },
                  { key: 'has_kitchen', label: '👨‍🍳 Konyha (ételek)' },
                  { key: 'has_reservations', label: '📅 Asztalfoglalás' },
                  { key: 'has_loyalty_program', label: '❤️ Hűségprogram' },
                  { key: 'has_vip_orders', label: '⭐ VIP rendelések' },
                ].map(opt => (
                  <label key={opt.key} className="flex items-center gap-3 py-2 cursor-pointer">
                    <input type="checkbox" checked={(venue as any)[opt.key] ?? false}
                      onChange={e => setVenue(p => ({ ...p, [opt.key]: e.target.checked }))}
                      className="w-4 h-4 accent-amber-500" />
                    <span className="text-stone-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'tables' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-stone-700">Asztalok ({tables.length} db)</h2>
              <button onClick={addTable} className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 text-white rounded-xl text-sm font-medium">
                <span>+</span> Asztal hozzáadása
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {tables.map(table => (
                <div key={table.id} className="border border-stone-200 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-stone-800">#{table.number}</span>
                    <button onClick={() => deleteTable(table.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                  </div>
                  <p className="text-stone-400 text-xs">{table.capacity} fő</p>
                  {table.qr_code && (
                    <div className="mt-2 flex justify-center">
                      <QRCodeSVG value={table.qr_code} size={60} />
                    </div>
                  )}
                  <p className="text-amber-600 text-xs mt-1 flex items-center justify-center gap-1">
                    <QrCode className="w-3 h-3" /> QR kód
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'staff' && (
          <div className="space-y-4">
            <h2 className="font-bold text-stone-700">Munkatársak</h2>
            <div className="flex gap-2">
              <input
                value={newStaffEmail}
                onChange={e => setNewStaffEmail(e.target.value)}
                placeholder="munkatars@email.com"
                className="input flex-1"
              />
              <button onClick={inviteStaff} className="px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium">
                Meghívás
              </button>
            </div>
            <div className="space-y-2">
              {staff.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
                  <div className="w-9 h-9 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold">
                    {s.full_name?.[0] || 'U'}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-stone-800 text-sm">{s.full_name || s.email}</p>
                    <p className="text-stone-400 text-xs capitalize">{s.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(tab === 'venue' || tab === 'hours' || tab === 'payment') && (
          <div className="mt-6 pt-4 border-t border-stone-100">
            <button
              onClick={saveVenue}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Mentés...' : 'Beállítások mentése'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
