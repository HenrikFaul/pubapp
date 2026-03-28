'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Beer, MapPin, Clock, Check } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SetupVenuePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    address: '',
    city: 'Budapest',
    phone: '',
    email: '',
    has_table_service: true,
    has_bar_service: true,
    has_kitchen: false,
    accepts_cash: true,
    accepts_card: true,
  })

  function update(key: string, value: unknown) {
    setForm(p => ({ ...p, [key]: value }))
    if (key === 'name') {
      setForm(p => ({ ...p, slug: value.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') }))
    }
  }

  async function createVenue() {
    if (!form.name || !form.address) {
      toast.error('Add meg a kötelező adatokat!')
      return
    }
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { data: venue, error } = await supabase
      .from('venues')
      .insert({ ...form, owner_id: user.id })
      .select()
      .single()

    if (error || !venue) {
      toast.error('Hiba a helyszín létrehozásakor. Próbálj más nevet/slug-ot!')
      setSaving(false)
      return
    }

    // Link profile to venue
    await supabase.from('profiles').update({ venue_id: venue.id, role: 'admin' }).eq('id', user.id)

    // Create default menu categories
    await supabase.from('menu_categories').insert([
      { venue_id: venue.id, name: 'Sörök', icon: '🍺', sort_order: 0 },
      { venue_id: venue.id, name: 'Borok', icon: '🍷', sort_order: 1 },
      { venue_id: venue.id, name: 'Koktélok', icon: '🍹', sort_order: 2 },
      { venue_id: venue.id, name: 'Üdítők', icon: '🥤', sort_order: 3 },
      ...(form.has_kitchen ? [{ venue_id: venue.id, name: 'Ételek', icon: '🍔', sort_order: 4 }] : []),
    ])

    // Create default tables (5 pcs)
    await supabase.from('tables').insert(
      Array.from({ length: 5 }, (_, i) => ({ venue_id: venue.id, number: i + 1, capacity: 4 }))
    )

    toast.success('Helyszín létrehozva!')
    router.push('/admin')
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-amber-950 text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
            <Beer className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>Kapakka</h1>
        </div>

        {/* Steps */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${s <= step ? 'bg-amber-500' : 'bg-amber-900'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-5 animate-slide-up">
            <div>
              <h2 className="text-2xl font-bold mb-1">Helyszín neve</h2>
              <p className="text-amber-400 text-sm">Hogy hívják a kocsmádat / éttermedet?</p>
            </div>
            <input
              value={form.name}
              onChange={e => update('name', e.target.value)}
              placeholder="pl. Kertem Söröző"
              className="w-full bg-amber-900/50 border border-amber-700 text-amber-100 rounded-xl px-4 py-3.5 text-lg focus:outline-none focus:border-amber-500 placeholder:text-amber-700"
              autoFocus
            />
            {form.name && (
              <p className="text-amber-500 text-xs">URL: kapakka.hu/{form.slug}</p>
            )}
            <input
              value={form.address}
              onChange={e => update('address', e.target.value)}
              placeholder="Teljes cím (pl. Budapest, Kossuth tér 1.)"
              className="w-full bg-amber-900/50 border border-amber-700 text-amber-100 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 placeholder:text-amber-700"
            />
            <button
              disabled={!form.name || !form.address}
              onClick={() => setStep(2)}
              className="w-full bg-amber-500 hover:bg-amber-400 text-white font-bold py-4 rounded-2xl disabled:opacity-40 transition-colors"
            >
              Tovább →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 animate-slide-up">
            <div>
              <h2 className="text-2xl font-bold mb-1">Milyen helyed van?</h2>
              <p className="text-amber-400 text-sm">Ezek alapján konfiguráljuk a rendszert.</p>
            </div>
            {[
              { key: 'has_table_service', label: '🪑 Asztali kiszolgálás', desc: 'Vendégek asztalnál rendelnek' },
              { key: 'has_bar_service', label: '🍺 Pultás kiszolgálás', desc: 'Vendégek a pultnál vesznek át' },
              { key: 'has_kitchen', label: '👨‍🍳 Van konyhám', desc: 'Ételeket is kínálok' },
              { key: 'accepts_card', label: '💳 Kártyafizetés', desc: 'Elfogadok bankkártyát' },
            ].map(opt => (
              <label key={opt.key} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                (form as any)[opt.key] ? 'border-amber-500 bg-amber-900/40' : 'border-amber-800/40 bg-amber-900/20'
              }`}>
                <input
                  type="checkbox"
                  checked={(form as any)[opt.key]}
                  onChange={e => update(opt.key, e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  (form as any)[opt.key] ? 'bg-amber-500 border-amber-500' : 'border-amber-700'
                }`}>
                  {(form as any)[opt.key] && <Check className="w-4 h-4 text-white" />}
                </div>
                <div>
                  <p className="font-semibold text-amber-100">{opt.label}</p>
                  <p className="text-amber-500 text-xs">{opt.desc}</p>
                </div>
              </label>
            ))}
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3 border border-amber-700 text-amber-400 rounded-xl">← Vissza</button>
              <button onClick={() => setStep(3)} className="flex-1 bg-amber-500 text-white font-bold py-3 rounded-xl">Tovább →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5 animate-slide-up">
            <div>
              <h2 className="text-2xl font-bold mb-1">Elérhetőségek</h2>
              <p className="text-amber-400 text-sm">Opcionális, de ajánlott.</p>
            </div>
            <input
              value={form.phone}
              onChange={e => update('phone', e.target.value)}
              placeholder="Telefonszám (pl. +36 1 234 5678)"
              className="w-full bg-amber-900/50 border border-amber-700 text-amber-100 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 placeholder:text-amber-700"
            />
            <input
              type="email"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              placeholder="Email cím"
              className="w-full bg-amber-900/50 border border-amber-700 text-amber-100 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 placeholder:text-amber-700"
            />

            {/* Summary */}
            <div className="bg-amber-900/40 rounded-2xl p-4 space-y-2 text-sm">
              <div className="flex gap-2"><Beer className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" /><span className="text-amber-200">{form.name}</span></div>
              <div className="flex gap-2"><MapPin className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" /><span className="text-amber-200">{form.address}</span></div>
              <div className="flex gap-2 flex-wrap">
                {form.has_table_service && <span className="bg-amber-800/60 text-amber-300 text-xs px-2 py-0.5 rounded-full">🪑 Table service</span>}
                {form.has_bar_service && <span className="bg-amber-800/60 text-amber-300 text-xs px-2 py-0.5 rounded-full">🍺 Pult</span>}
                {form.has_kitchen && <span className="bg-amber-800/60 text-amber-300 text-xs px-2 py-0.5 rounded-full">👨‍🍳 Konyha</span>}
                {form.accepts_card && <span className="bg-amber-800/60 text-amber-300 text-xs px-2 py-0.5 rounded-full">💳 Kártya</span>}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-3 border border-amber-700 text-amber-400 rounded-xl">← Vissza</button>
              <button
                onClick={createVenue}
                disabled={saving}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-white font-bold py-3 rounded-xl disabled:opacity-50"
              >
                {saving ? 'Létrehozás...' : '✓ Indulás!'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
