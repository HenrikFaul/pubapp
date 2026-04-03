'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import PlaceAutocomplete from '@/components/PlaceAutocomplete'
import { broadcastThemeChange } from '@/components/AppShellProviders'
import { supabase } from '@/lib/supabase'
import { DAY_NAMES } from '@/lib/utils'
import { DEFAULT_THEME_KEY, KAPAKKA_THEMES, type KapakkaThemeKey } from '@/lib/themes'
import { type Venue } from '@/types'
import {
  Calendar,
  Check,
  Clock,
  Download,
  Info,
  Save,
  Settings,
  Sparkles,
  Store,
  Users,
} from 'lucide-react'

type Tab = 'overview' | 'venue' | 'hours' | 'service' | 'tables' | 'staff' | 'appearance'

interface ConfigTab {
  id: Tab
  label: string
  icon: ReactNode
}

export default function ConfigPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [venue, setVenue] = useState<Partial<Venue>>({})
  const [tables, setTables] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [venueId, setVenueId] = useState<string | null>(null)
  const [newStaffEmail, setNewStaffEmail] = useState('')
  const [themeKey, setThemeKey] = useState<KapakkaThemeKey>(DEFAULT_THEME_KEY)
  const [themeSaving, setThemeSaving] = useState(false)
  const [stats, setStats] = useState({ activeTables: 0, staffCount: 0, reservationEnabled: false })

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from('profiles').select('venue_id').eq('id', user.id).single()
      if (!profile?.venue_id) return
      setVenueId(profile.venue_id)

      const [{ data: venueData }, { data: appSettings }, { data: tableData }, { data: staffData }] = await Promise.all([
        supabase.from('venues').select('*').eq('id', profile.venue_id).single(),
        supabase.from('app_settings').select('theme_key').eq('id', 'global').maybeSingle(),
        supabase.from('tables').select('*').eq('venue_id', profile.venue_id).order('number'),
        supabase.from('profiles').select('*').eq('venue_id', profile.venue_id).neq('role', 'customer'),
      ])

      if (venueData) {
        setVenue(venueData)
        setStats((prev) => ({
          ...prev,
          reservationEnabled: Boolean(venueData.has_reservations),
        }))
      }
      if (appSettings?.theme_key) {
        setThemeKey(appSettings.theme_key as KapakkaThemeKey)
        broadcastThemeChange(appSettings.theme_key as KapakkaThemeKey)
      }
      setTables(tableData || [])
      setStaff(staffData || [])
      setStats((prev) => ({
        ...prev,
        activeTables: (tableData || []).filter((row: any) => row.is_active !== false).length,
        staffCount: (staffData || []).length,
      }))
    }

    void init()
  }, [])

  async function saveVenue() {
    if (!venueId) return
    setSaving(true)
    const payload = {
      ...venue,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('venues').update(payload).eq('id', venueId)
    setSaving(false)
    if (error) {
      toast.error('A venue beállítások mentése nem sikerült.')
      return
    }
    toast.success('Venue beállítások mentve.')
  }

  async function saveTheme() {
    setThemeSaving(true)
    const { error } = await supabase.from('app_settings').upsert({
      id: 'global',
      theme_key: themeKey,
      updated_at: new Date().toISOString(),
    })
    setThemeSaving(false)

    if (error) {
      toast.error('A design váltás mentése nem sikerült.')
      return
    }
    broadcastThemeChange(themeKey)
    toast.success('Design váltás mentve — redeploy nélkül aktív.')
  }

  async function addTable() {
    if (!venueId) return
    const maxNum = tables.length > 0 ? Math.max(...tables.map((row) => row.number)) : 0
    const { data } = await supabase
      .from('tables')
      .insert({
        venue_id: venueId,
        number: maxNum + 1,
        capacity: 4,
        qr_code: `${window.location.origin}/customer/scan?table=${maxNum + 1}`,
      })
      .select()
      .single()
    if (data) {
      setTables((prev) => [...prev, data])
      setStats((prev) => ({ ...prev, activeTables: prev.activeTables + 1 }))
    }
  }

  async function deleteTable(id: string) {
    await supabase.from('tables').delete().eq('id', id)
    setTables((prev) => prev.filter((row) => row.id !== id))
    setStats((prev) => ({ ...prev, activeTables: Math.max(prev.activeTables - 1, 0) }))
  }

  async function inviteStaff() {
    if (!newStaffEmail.trim()) return
    toast.success(`Meghívó előkészítve: ${newStaffEmail}`)
    setNewStaffEmail('')
  }

  const tabs: ConfigTab[] = useMemo(
    () => [
      { id: 'overview', label: 'Áttekintés', icon: <Sparkles className="h-4 w-4" /> },
      { id: 'venue', label: 'Venue profil', icon: <Store className="h-4 w-4" /> },
      { id: 'hours', label: 'Nyitvatartás', icon: <Clock className="h-4 w-4" /> },
      { id: 'service', label: 'Szolgáltatás', icon: <Settings className="h-4 w-4" /> },
      { id: 'tables', label: 'Asztalok', icon: <Download className="h-4 w-4" /> },
      { id: 'staff', label: 'Csapat', icon: <Users className="h-4 w-4" /> },
      { id: 'appearance', label: 'Design', icon: <Sparkles className="h-4 w-4" /> },
    ],
    []
  )

  return (
    <div className="space-y-5">
      <section className="admin-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="section-kicker mb-3">
              <Sparkles className="h-4 w-4" />
              responsive venue configuration
            </div>
            <h2 className="text-3xl font-bold text-white lg:text-4xl">Teljes venue-üzemeltetés egy helyen.</h2>
            <p className="mt-3 max-w-3xl text-sm text-white/60">Design, foglalás, automatikus rendelésértesítés, csapatkezelés és QR asztalok. A platformszintű Common Admin innentől külön a Site Admin felületen érhető el.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="mini-stat">
              <p className="text-xs uppercase tracking-[0.2em] text-white/35">Asztal</p>
              <p className="mt-2 text-2xl font-black text-white">{stats.activeTables}</p>
            </div>
            <div className="mini-stat">
              <p className="text-xs uppercase tracking-[0.2em] text-white/35">Csapat</p>
              <p className="mt-2 text-2xl font-black text-white">{stats.staffCount}</p>
            </div>
            <div className="mini-stat">
              <p className="text-xs uppercase tracking-[0.2em] text-white/35">Foglalás</p>
              <p className="mt-2 text-lg font-black text-white">{stats.reservationEnabled ? 'Aktív' : 'Inaktív'}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map((item) => (
          <button key={item.id} onClick={() => setTab(item.id)} className={`config-tab whitespace-nowrap ${tab === item.id ? 'active' : ''}`}>
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <section className="admin-card p-5 sm:p-6">
          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="admin-card-soft p-5">
              <p className="text-sm font-semibold text-white">Mit lehet innen menedzselni?</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {[
                  'Asztalfoglalás engedélyezése és limitjei',
                  'Order update automatikus értesítések',
                  'Venue profil és elérhetőségek',
                  'Design váltás live üzemi módban',
                ].map((item) => (
                  <div key={item} className="rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/65">{item}</div>
                ))}
              </div>
            </div>
            <div className="admin-card-soft p-5">
              <div className="flex items-center gap-2 text-white/70"><Info className="h-4 w-4" /> <span className="text-sm font-semibold">Platform admin különválasztva</span></div>
              <p className="mt-3 text-sm text-white/60">A Common Admin, integrációk, hosting, release snapshot és lokális katalógus operáció innentől a külön Site Admin felületen érhető el.</p>
              <div className="mt-4 rounded-[22px] border border-white/10 bg-white/5 p-4 text-sm text-white/55">
                A venue-admin kizárólag az adott vendéglátóhely működtetésére fókuszál: étlap, készlet, rendelések, foglalás, csapat és design.
              </div>
            </div>
          </div>
        </section>
      )}

      {tab === 'venue' && (
        <section className="admin-card p-5 sm:p-6">
          <div className="grid gap-4 xl:grid-cols-[1fr_0.92fr]">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/35">Venue neve</label>
                <input value={venue.name || ''} onChange={(event) => setVenue((prev) => ({ ...prev, name: event.target.value }))} className="input" placeholder="Kapakka Lounge" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/35">Slug</label>
                <input value={venue.slug || ''} onChange={(event) => setVenue((prev) => ({ ...prev, slug: event.target.value.toLowerCase().replace(/\s+/g, '-') }))} className="input" placeholder="kapakka-lounge" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/35">Leírás</label>
                <textarea value={venue.description || ''} onChange={(event) => setVenue((prev) => ({ ...prev, description: event.target.value }))} className="input h-24 resize-none" placeholder="Fiatalos, esti, community-first venue leírás." />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/35">Place autocomplete</label>
                <PlaceAutocomplete
                  placeholder="Venue cím vagy név gyors keresése…"
                  onSelect={(place) => {
                    setVenue((prev) => ({
                      ...prev,
                      address: place.address || prev.address,
                      city: place.city || prev.city,
                      postal_code: place.postal_code || prev.postal_code,
                      latitude: place.latitude || prev.latitude,
                      longitude: place.longitude || prev.longitude,
                      website: place.website || prev.website,
                      phone: place.phone || prev.phone,
                    }))
                    toast.success('A helyadatok átemelhetők a venue profilba.')
                  }}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/35">Cím</label>
                <input value={venue.address || ''} onChange={(event) => setVenue((prev) => ({ ...prev, address: event.target.value }))} className="input" placeholder="1134 Budapest, ..." />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/35">Város</label>
                  <input value={venue.city || ''} onChange={(event) => setVenue((prev) => ({ ...prev, city: event.target.value }))} className="input" placeholder="Budapest" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/35">Irányítószám</label>
                  <input value={venue.postal_code || ''} onChange={(event) => setVenue((prev) => ({ ...prev, postal_code: event.target.value }))} className="input" placeholder="1134" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/35">Telefon</label>
                  <input value={venue.phone || ''} onChange={(event) => setVenue((prev) => ({ ...prev, phone: event.target.value }))} className="input" placeholder="+36 30 ..." />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/35">Email</label>
                  <input value={venue.email || ''} onChange={(event) => setVenue((prev) => ({ ...prev, email: event.target.value }))} className="input" placeholder="hello@venue.hu" />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/35">Weboldal</label>
                <input value={venue.website || ''} onChange={(event) => setVenue((prev) => ({ ...prev, website: event.target.value }))} className="input" placeholder="https://..." />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/35">Logo URL</label>
                  <input value={venue.logo_url || ''} onChange={(event) => setVenue((prev) => ({ ...prev, logo_url: event.target.value }))} className="input" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/35">Borítókép URL</label>
                  <input value={venue.cover_url || ''} onChange={(event) => setVenue((prev) => ({ ...prev, cover_url: event.target.value }))} className="input" />
                </div>
              </div>
            </div>
          </div>
          <button onClick={saveVenue} disabled={saving} className="btn-kapakka mt-6 w-full md:w-auto md:px-6">
            <Save className="h-4 w-4" /> {saving ? 'Mentés…' : 'Venue profil mentése'}
          </button>
        </section>
      )}

      {tab === 'hours' && (
        <section className="admin-card p-5 sm:p-6">
          <div className="space-y-3">
            {Object.keys(DAY_NAMES).map((day) => {
              const hours = (venue.opening_hours as any)?.[day] || { open: '10:00', close: '24:00', closed: false }
              return (
                <div key={day} className="toggle-row">
                  <div>
                    <p className="font-semibold text-white">{DAY_NAMES[day]}</p>
                    <p className="text-sm text-white/45">Nyitás-zárás vagy teljes zárva állapot.</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[auto_140px_140px] md:items-center">
                    <label className="flex items-center gap-2 text-sm text-white/70">
                      <input type="checkbox" checked={!hours.closed} onChange={(event) => setVenue((prev) => ({ ...prev, opening_hours: { ...(prev.opening_hours as any), [day]: { ...hours, closed: !event.target.checked } } }))} />
                      Nyitva
                    </label>
                    <input type="time" value={hours.open} disabled={hours.closed} onChange={(event) => setVenue((prev) => ({ ...prev, opening_hours: { ...(prev.opening_hours as any), [day]: { ...hours, open: event.target.value } } }))} className="input" />
                    <input type="time" value={hours.close} disabled={hours.closed} onChange={(event) => setVenue((prev) => ({ ...prev, opening_hours: { ...(prev.opening_hours as any), [day]: { ...hours, close: event.target.value } } }))} className="input" />
                  </div>
                </div>
              )
            })}
          </div>
          <button onClick={saveVenue} disabled={saving} className="btn-kapakka mt-6 w-full md:w-auto md:px-6">
            <Save className="h-4 w-4" /> Nyitvatartás mentése
          </button>
        </section>
      )}

      {tab === 'service' && (
        <section className="admin-card p-5 sm:p-6">
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-3">
              {[
                { key: 'has_table_service', label: 'Asztali kiszolgálás', hint: 'Asztalhoz rendelés és kiszállítás a venue-n belül.' },
                { key: 'has_bar_service', label: 'Pult pickup', hint: 'A vendég leadja a rendelést és a pultnál veszi át.' },
                { key: 'has_kitchen', label: 'Konyhai működés', hint: 'Ételkategóriák és konyhai átfutás támogatása.' },
                { key: 'has_reservations', label: 'Asztalfoglalás', hint: 'A vendég foglalási kérést tudjon leadni az appból.' },
                { key: 'has_loyalty_program', label: 'Hűségprogram', hint: 'Pontgyűjtés és későbbi retention kampányok.' },
                { key: 'allow_external_place_shares', label: 'Külső helymegosztás', hint: 'Venue linkek és megosztott helyek küldése barátoknak.' },
                { key: 'allow_friend_lists', label: 'Közös listák', hint: 'Venue-k mentése barátokkal közös shortlistbe.' },
              ].map((row) => (
                <div key={row.key} className="toggle-row">
                  <div>
                    <p className="font-semibold text-white">{row.label}</p>
                    <p className="text-sm text-white/45">{row.hint}</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-white/70">
                    <input type="checkbox" checked={Boolean((venue as any)[row.key])} onChange={(event) => setVenue((prev) => ({ ...prev, [row.key]: event.target.checked }))} />
                    Bekapcsolva
                  </label>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div className="toggle-row">
                <div>
                  <p className="font-semibold text-white">Foglalás jóváhagyást igényel</p>
                  <p className="text-sm text-white/45">Ha aktív, a vendég kérésként küldi be a foglalást.</p>
                </div>
                <label className="flex items-center gap-2 text-sm text-white/70">
                  <input type="checkbox" checked={Boolean(venue.reservation_requires_approval)} onChange={(event) => setVenue((prev) => ({ ...prev, reservation_requires_approval: event.target.checked }))} />
                  Jóváhagyás kell
                </label>
              </div>
              <div className="toggle-row">
                <div>
                  <p className="font-semibold text-white">Automatikus jelzés: feldolgozás</p>
                  <p className="text-sm text-white/45">A vendég kapjon értesítést, amikor készíteni kezdik a rendelést.</p>
                </div>
                <label className="flex items-center gap-2 text-sm text-white/70">
                  <input type="checkbox" checked={Boolean(venue.auto_notify_processing ?? true)} onChange={(event) => setVenue((prev) => ({ ...prev, auto_notify_processing: event.target.checked }))} />
                  Aktív
                </label>
              </div>
              <div className="toggle-row">
                <div>
                  <p className="font-semibold text-white">Automatikus jelzés: kész</p>
                  <p className="text-sm text-white/45">A vendég kapjon értesítést, amint átvehető a rendelése.</p>
                </div>
                <label className="flex items-center gap-2 text-sm text-white/70">
                  <input type="checkbox" checked={Boolean(venue.auto_notify_ready ?? true)} onChange={(event) => setVenue((prev) => ({ ...prev, auto_notify_ready: event.target.checked }))} />
                  Aktív
                </label>
              </div>
              <div className="toggle-row">
                <div>
                  <p className="font-semibold text-white">Foglalási slot (perc)</p>
                  <p className="text-sm text-white/45">Mekkora lépésközzel lehessen időpontot kérni.</p>
                </div>
                <input type="number" min={15} max={180} value={venue.reservation_slot_minutes || 30} onChange={(event) => setVenue((prev) => ({ ...prev, reservation_slot_minutes: Number(event.target.value) || 30 }))} className="input max-w-[120px]" />
              </div>
              <div className="toggle-row">
                <div>
                  <p className="font-semibold text-white">Max. foglalható létszám</p>
                  <p className="text-sm text-white/45">Ekkora party size fölött manuális egyeztetés javasolt.</p>
                </div>
                <input type="number" min={2} max={30} value={venue.reservation_max_party_size || 8} onChange={(event) => setVenue((prev) => ({ ...prev, reservation_max_party_size: Number(event.target.value) || 8 }))} className="input max-w-[120px]" />
              </div>
            </div>
          </div>
          <button onClick={saveVenue} disabled={saving} className="btn-kapakka mt-6 w-full md:w-auto md:px-6">
            <Save className="h-4 w-4" /> Szolgáltatási beállítások mentése
          </button>
        </section>
      )}

      {tab === 'tables' && (
        <section className="admin-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-bold text-white">Asztalok és QR belépés</p>
              <p className="mt-1 text-sm text-white/45">Azonnal bővíthető, venue-n belüli rendelési bejárat.</p>
            </div>
            <button onClick={addTable} className="btn-kapakka w-auto px-5 py-3">Új asztal</button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {tables.map((table) => (
              <div key={table.id} className="admin-mini-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-2xl font-black text-white">#{table.number}</p>
                  <button onClick={() => deleteTable(table.id)} className="btn-outline w-auto px-3 py-2">Törlés</button>
                </div>
                <p className="mt-1 text-sm text-white/45">Kapacitás: {table.capacity} fő</p>
                <div className="mt-4 rounded-[20px] border border-white/10 bg-white p-3">
                  <QRCodeSVG value={table.qr_code || `${window.location.origin}/customer/scan?table=${table.number}`} size={120} className="mx-auto" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'staff' && (
        <section className="admin-card p-5 sm:p-6">
          <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
            <div className="admin-card-soft p-5">
              <p className="text-lg font-bold text-white">Munkatárs meghívása</p>
              <p className="mt-1 text-sm text-white/45">Új üzemeltető, manager vagy floor staff meghívása.</p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input value={newStaffEmail} onChange={(event) => setNewStaffEmail(event.target.value)} placeholder="kollega@email.hu" className="input flex-1" />
                <button onClick={inviteStaff} className="btn-kapakka sm:w-auto sm:px-5">Meghívás</button>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {staff.map((member: any) => (
                <div key={member.id} className="admin-mini-card p-4">
                  <p className="text-lg font-bold text-white">{member.full_name || member.email}</p>
                  <p className="mt-1 text-sm capitalize text-white/45">{member.role}</p>
                  <div className="mt-4 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/60">Venue team</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {tab === 'appearance' && (
        <section className="admin-card p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-lg font-bold text-white">Aktív design kiválasztása</p>
              <p className="mt-1 text-sm text-white/45">A designváltás mentés után azonnal aktív lesz az alkalmazásban — redeploy nélkül.</p>
            </div>
            <button onClick={saveTheme} disabled={themeSaving} className="btn-kapakka w-full lg:w-auto lg:px-6">
              <Check className="h-4 w-4" /> {themeSaving ? 'Mentés…' : 'Design aktiválása'}
            </button>
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            {KAPAKKA_THEMES.map((theme) => (
              <button key={theme.key} onClick={() => setThemeKey(theme.key)} className={`theme-choice-card text-left ${themeKey === theme.key ? 'active' : ''}`}>
                <div className="theme-mini-customer h-28 bg-black/20 p-4 text-white">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/35">Customer</p>
                  <p className="mt-3 text-lg font-bold">{theme.name}</p>
                  <p className="mt-2 text-sm text-white/60">{theme.customerPreview}</p>
                </div>
                <div className="theme-mini-admin mt-3 border border-white/10 bg-white/5 p-4 text-white">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/35">Admin</p>
                  <p className="mt-2 text-sm font-semibold">{theme.adminPreview}</p>
                </div>
                <p className="mt-4 text-sm font-semibold text-white">{theme.name}</p>
                <p className="mt-1 text-sm text-white/45">{theme.tagline}</p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
