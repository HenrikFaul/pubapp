'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { broadcastThemeChange } from '@/components/AppShellProviders'
import { DAY_NAMES } from '@/lib/utils'
import { DEFAULT_THEME_KEY, KAPAKKA_THEMES, type KapakkaThemeKey } from '@/lib/themes'
import { type Venue } from '@/types'
import {
  Clock,
  ShoppingBag,
  Sparkles,
  QrCode,
  Save,
  Settings,
  Store,
  Users,
} from 'lucide-react'

type Tab = 'venue' | 'hours' | 'payment' | 'tables' | 'staff' | 'appearance'

interface ConfigTab {
  id: Tab
  label: string
  short: string
  icon: ReactNode
}

export default function ConfigPage() {
  const [tab, setTab] = useState<Tab>('venue')
  const [venue, setVenue] = useState<Partial<Venue>>({})
  const [tables, setTables] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [venueId, setVenueId] = useState<string | null>(null)
  const [newStaffEmail, setNewStaffEmail] = useState('')
  const [themeKey, setThemeKey] = useState<KapakkaThemeKey>(DEFAULT_THEME_KEY)
  const [themeSaving, setThemeSaving] = useState(false)

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from('profiles').select('venue_id').eq('id', user.id).single()
      if (!profile?.venue_id) return
      setVenueId(profile.venue_id)

      const { data: venueData } = await supabase.from('venues').select('*').eq('id', profile.venue_id).single()
      if (venueData) setVenue(venueData)

      const { data: appSettings } = await supabase.from('app_settings').select('theme_key').eq('id', 'global').maybeSingle()
      if (appSettings?.theme_key) {
        setThemeKey(appSettings.theme_key as KapakkaThemeKey)
        broadcastThemeChange(appSettings.theme_key)
      }

      const { data: tableData } = await supabase.from('tables').select('*').eq('venue_id', profile.venue_id).order('number')
      setTables(tableData || [])

      const { data: staffData } = await supabase
        .from('profiles')
        .select('*')
        .eq('venue_id', profile.venue_id)
        .neq('role', 'customer')
      setStaff(staffData || [])
    }

    init()
  }, [])

  async function saveVenue() {
    if (!venueId) return
    setSaving(true)
    const { error } = await supabase.from('venues').update({ ...venue, updated_at: new Date().toISOString() }).eq('id', venueId)
    if (error) toast.error('Hiba a mentésnél')
    else toast.success('Beállítások mentve')
    setSaving(false)
  }

  async function saveTheme() {
    setThemeSaving(true)
    const { error } = await supabase
      .from('app_settings')
      .upsert({ id: 'global', theme_key: themeKey, updated_at: new Date().toISOString() }, { onConflict: 'id' })

    if (error) {
      toast.error('A design mentése nem sikerült. Futtasd le a 002_theme_settings.sql migrációt is.')
    } else {
      broadcastThemeChange(themeKey)
      toast.success('Az új design azonnal érvényesült')
    }

    setThemeSaving(false)
  }

  async function addTable() {
    if (!venueId) return
    const maxNum = tables.length > 0 ? Math.max(...tables.map((table) => table.number)) : 0
    const { data } = await supabase.from('tables').insert({ venue_id: venueId, number: maxNum + 1, capacity: 4 }).select().single()
    if (data) setTables((previous) => [...previous, data])
  }

  async function deleteTable(tableId: string) {
    await supabase.from('tables').delete().eq('id', tableId)
    setTables((previous) => previous.filter((table) => table.id !== tableId))
  }

  async function inviteStaff() {
    if (!newStaffEmail || !venueId) return
    toast.success('Meghívó küldve (demo mód – a valós email flow külön konfigurálható)')
    setNewStaffEmail('')
  }

  const tabs: ConfigTab[] = [
    { id: 'venue', label: 'Venue', short: 'Alapadatok és megjelenés', icon: <Store className="h-4 w-4" /> },
    { id: 'hours', label: 'Nyitvatartás', short: 'Heti működés és zárva napok', icon: <Clock className="h-4 w-4" /> },
    { id: 'payment', label: 'Fizetés és szolgáltatások', short: 'Elfogadott fizetés, szolgáltatás típusok', icon: <ShoppingBag className="h-4 w-4" /> },
    { id: 'tables', label: 'Asztalok', short: 'QR asztalok és kapacitás', icon: <Settings className="h-4 w-4" /> },
    { id: 'staff', label: 'Munkatársak', short: 'Stáb és jogosultság előkészítés', icon: <Users className="h-4 w-4" /> },
    { id: 'appearance', label: 'Design', short: 'Aktív Kapakka skin kiválasztása', icon: <Sparkles className="h-4 w-4" /> },
  ]

  return (
    <div className="space-y-6">
      <section className="admin-card overflow-hidden p-5 sm:p-6 lg:p-7">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_0.85fr] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/70 px-3 py-2 text-xs font-bold uppercase tracking-[0.22em] text-[color:var(--admin-subtle)]">
              <Sparkles className="h-4 w-4 text-[color:var(--accent)]" />
              Konfigurátor és design vezérlés
            </div>
            <h1 className="text-3xl font-bold text-[color:var(--admin-heading)] md:text-4xl">A venue működését és a teljes app kinézetét itt hangolod össze.</h1>
            <p className="mt-3 max-w-2xl text-sm text-[color:var(--admin-muted)] md:text-base">
              A funkciók maradnak, de a vizuális élményt, a staff beállításokat, a nyitvatartást és az asztalos működést ugyanebből a felületből tudod frissíteni.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="admin-card-soft p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--admin-subtle)]">Venue</p>
              <p className="mt-2 text-lg font-bold text-[color:var(--admin-heading)]">{venue.name || 'Nincs beállítva'}</p>
            </div>
            <div className="admin-card-soft p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--admin-subtle)]">Asztalok</p>
              <p className="mt-2 text-3xl font-black text-[color:var(--admin-heading)]">{tables.length}</p>
            </div>
            <div className="admin-card-soft p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--admin-subtle)]">Staff</p>
              <p className="mt-2 text-3xl font-black text-[color:var(--admin-heading)]">{staff.length}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map((item) => (
          <button key={item.id} onClick={() => setTab(item.id)} className={`config-tab flex-shrink-0 ${tab === item.id ? 'active' : ''}`}>
            {item.icon}
            <div className="text-left">
              <p>{item.label}</p>
              <p className={`text-xs ${tab === item.id ? 'text-black/65' : 'text-[color:var(--admin-subtle)]'}`}>{item.short}</p>
            </div>
          </button>
        ))}
      </section>

      <section className="admin-card p-5 sm:p-6">
        {tab === 'venue' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[color:var(--admin-heading)]">Venue alapadatok</h2>
              <p className="mt-2 text-sm text-[color:var(--admin-muted)]">A vendégek ezt látják először a hely oldalán, ezért legyen barátságos, pontos és hívogató.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--admin-subtle)]">Helyszín neve</label>
                <input value={venue.name || ''} onChange={(e) => setVenue((previous) => ({ ...previous, name: e.target.value }))} className="input" placeholder="Kapakka Söröző" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--admin-subtle)]">URL slug</label>
                <input value={venue.slug || ''} onChange={(e) => setVenue((previous) => ({ ...previous, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} className="input" placeholder="kapakka-sorozo" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--admin-subtle)]">Leírás</label>
                <textarea value={venue.description || ''} onChange={(e) => setVenue((previous) => ({ ...previous, description: e.target.value }))} className="input h-28 resize-none" placeholder="Rövid, hangulatos bemutatkozás a vendégeknek..." />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--admin-subtle)]">Cím</label>
                <input value={venue.address || ''} onChange={(e) => setVenue((previous) => ({ ...previous, address: e.target.value }))} className="input" placeholder="Budapest, Kossuth tér 1." />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--admin-subtle)]">Telefonszám</label>
                <input value={venue.phone || ''} onChange={(e) => setVenue((previous) => ({ ...previous, phone: e.target.value }))} className="input" placeholder="+36 1 234 5678" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--admin-subtle)]">Email</label>
                <input type="email" value={venue.email || ''} onChange={(e) => setVenue((previous) => ({ ...previous, email: e.target.value }))} className="input" placeholder="hello@kapakka.hu" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--admin-subtle)]">Logo URL</label>
                <input value={venue.logo_url || ''} onChange={(e) => setVenue((previous) => ({ ...previous, logo_url: e.target.value }))} className="input" placeholder="https://..." />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--admin-subtle)]">Borítókép URL</label>
                <input value={venue.cover_url || ''} onChange={(e) => setVenue((previous) => ({ ...previous, cover_url: e.target.value }))} className="input" placeholder="https://..." />
              </div>
            </div>
          </div>
        )}

        {tab === 'hours' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[color:var(--admin-heading)]">Nyitvatartás</h2>
              <p className="mt-2 text-sm text-[color:var(--admin-muted)]">A vendég oldalon ez alapján látszik a nyitva/zárva állapot és a hely elérhetősége.</p>
            </div>
            <div className="space-y-3">
              {Object.keys(DAY_NAMES).map((day) => {
                const hours = (venue.opening_hours as any)?.[day] || { open: '10:00', close: '24:00', closed: false }
                return (
                  <div key={day} className="admin-card-soft flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-[110px]">
                      <p className="font-semibold text-[color:var(--admin-heading)]">{DAY_NAMES[day]}</p>
                      <p className="text-xs text-[color:var(--admin-muted)]">Nyitva tartási ablak</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-2 text-sm text-[color:var(--admin-muted)]">
                        <input
                          type="checkbox"
                          checked={!hours.closed}
                          onChange={(e) =>
                            setVenue((previous) => ({
                              ...previous,
                              opening_hours: {
                                ...(previous.opening_hours as any),
                                [day]: { ...hours, closed: !e.target.checked },
                              },
                            }))
                          }
                        />
                        Nyitva
                      </label>

                      {!hours.closed ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={hours.open}
                            onChange={(e) =>
                              setVenue((previous) => ({
                                ...previous,
                                opening_hours: {
                                  ...(previous.opening_hours as any),
                                  [day]: { ...hours, open: e.target.value },
                                },
                              }))
                            }
                            className="input w-28 py-2.5 text-sm"
                          />
                          <span className="text-[color:var(--admin-subtle)]">—</span>
                          <input
                            type="time"
                            value={hours.close}
                            onChange={(e) =>
                              setVenue((previous) => ({
                                ...previous,
                                opening_hours: {
                                  ...(previous.opening_hours as any),
                                  [day]: { ...hours, close: e.target.value },
                                },
                              }))
                            }
                            className="input w-28 py-2.5 text-sm"
                          />
                        </div>
                      ) : (
                        <span className="rounded-full bg-red-500/10 px-3 py-1 text-sm font-semibold text-red-500">Zárva</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {tab === 'payment' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[color:var(--admin-heading)]">Fizetés és szolgáltatások</h2>
              <p className="mt-2 text-sm text-[color:var(--admin-muted)]">Kapcsold be azokat a működési elemeket, amiket ténylegesen használ a helyed.</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="admin-card-soft p-5">
                <h3 className="text-lg font-bold text-[color:var(--admin-heading)]">Fizetési módok</h3>
                <div className="mt-4 space-y-3">
                  {[
                    { key: 'accepts_cash', label: '💵 Készpénz elfogadás' },
                    { key: 'accepts_card', label: '💳 Kártyafizetés' },
                    { key: 'accepts_app_payment', label: '📱 App-on keresztüli fizetés' },
                  ].map((option) => (
                    <label key={option.key} className="flex items-center gap-3 rounded-[18px] border border-black/5 bg-white/60 px-4 py-3 text-sm text-[color:var(--admin-heading)]">
                      <input type="checkbox" checked={(venue as any)[option.key] ?? false} onChange={(e) => setVenue((previous) => ({ ...previous, [option.key]: e.target.checked }))} />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="admin-card-soft p-5">
                <h3 className="text-lg font-bold text-[color:var(--admin-heading)]">Szolgáltatások</h3>
                <div className="mt-4 space-y-3">
                  {[
                    { key: 'has_table_service', label: '🪑 Asztali kiszolgálás' },
                    { key: 'has_bar_service', label: '🍺 Pultos kiszolgálás' },
                    { key: 'has_kitchen', label: '👨‍🍳 Konyha' },
                    { key: 'has_reservations', label: '📅 Asztalfoglalás' },
                    { key: 'has_loyalty_program', label: '❤️ Hűségprogram' },
                    { key: 'has_vip_orders', label: '⭐ VIP rendelések' },
                  ].map((option) => (
                    <label key={option.key} className="flex items-center gap-3 rounded-[18px] border border-black/5 bg-white/60 px-4 py-3 text-sm text-[color:var(--admin-heading)]">
                      <input type="checkbox" checked={(venue as any)[option.key] ?? false} onChange={(e) => setVenue((previous) => ({ ...previous, [option.key]: e.target.checked }))} />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'tables' && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[color:var(--admin-heading)]">Asztalok és QR kódok</h2>
                <p className="mt-2 text-sm text-[color:var(--admin-muted)]">A vendégek asztalhoz rendelése és a QR funnel itt alapozható meg.</p>
              </div>
              <button onClick={addTable} className="btn-kapakka w-auto px-5 py-3">
                <Settings className="h-4 w-4" />
                Asztal hozzáadása
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {tables.map((table) => (
                <div key={table.id} className="admin-card-soft p-4 text-center">
                  <div className="flex items-center justify-between gap-3">
                    <div className="rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-sm font-bold text-[color:var(--accent)]">#{table.number}</div>
                    <button onClick={() => deleteTable(table.id)} className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-500">
                      Törlés
                    </button>
                  </div>
                  <p className="mt-3 text-lg font-bold text-[color:var(--admin-heading)]">{table.capacity} fő</p>
                  {table.qr_code && (
                    <div className="mt-4 flex justify-center rounded-[20px] border border-black/5 bg-white p-4">
                      <QRCodeSVG value={table.qr_code} size={96} />
                    </div>
                  )}
                  <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-[color:var(--admin-muted)]">
                    <QrCode className="h-3.5 w-3.5" />
                    QR kód aktív
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'staff' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[color:var(--admin-heading)]">Munkatársak</h2>
              <p className="mt-2 text-sm text-[color:var(--admin-muted)]">A személyzetet itt tudod felvenni, áttekinteni és szerepkör szerint szervezni.</p>
            </div>

            <div className="admin-card-soft p-5">
              <div className="flex flex-col gap-3 md:flex-row">
                <input value={newStaffEmail} onChange={(e) => setNewStaffEmail(e.target.value)} placeholder="munkatars@email.com" className="input flex-1" />
                <button onClick={inviteStaff} className="btn-kapakka md:w-auto md:px-5">
                  <Users className="h-4 w-4" />
                  Meghívás
                </button>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {staff.map((member) => (
                <div key={member.id} className="admin-card-soft p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[color:var(--accent)] text-sm font-black text-[color:var(--accent-contrast)]">
                      {member.full_name?.[0] || 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[color:var(--admin-heading)]">{member.full_name || member.email}</p>
                      <p className="truncate text-sm text-[color:var(--admin-muted)]">{member.email}</p>
                    </div>
                    <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold capitalize text-[color:var(--admin-muted)]">{member.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'appearance' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[color:var(--admin-heading)]">Kapakka design választó</h2>
              <p className="mt-2 max-w-3xl text-sm text-[color:var(--admin-muted)]">
                Az adminból tudod kiválasztani, melyik skin legyen aktív a vendég és a venue oldalon. A mentés után az új kinézet redeploy nélkül azonnal érvényesül.
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {KAPAKKA_THEMES.map((theme) => {
                const active = theme.key === themeKey
                return (
                  <button
                    key={theme.key}
                    type="button"
                    onClick={() => {
                      setThemeKey(theme.key)
                      broadcastThemeChange(theme.key)
                    }}
                    className={`theme-choice-card text-left ${active ? 'active' : ''}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xl font-bold text-[color:var(--admin-heading)]">{theme.name}</p>
                        <p className="mt-1 text-sm text-[color:var(--admin-muted)]">{theme.shortDescription}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${active ? 'bg-[color:var(--accent)] text-[color:var(--accent-contrast)]' : 'bg-[color:var(--admin-surface-3)] text-[color:var(--admin-muted)]'}`}>
                        {active ? 'Aktív' : 'Választható'}
                      </span>
                    </div>

                    <div className="mt-5 overflow-hidden rounded-[24px] border border-black/5">
                      <div className="theme-mini-customer p-4" style={{ background: theme.customerBackground }}>
                        <div className="rounded-[20px] border border-white/10 bg-white/10 p-4">
                          <div className="mb-4 flex items-center justify-between text-white">
                            <span className="text-sm font-bold">Vendég oldal</span>
                            <span className="text-xs text-white/70">QR · étlap · játékok</span>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[18px] border border-white/10 bg-white/10 p-4">
                              <div className="text-xs uppercase tracking-[0.18em] text-white/60">Fő CTA</div>
                              <div className="mt-3 inline-flex rounded-[16px] px-4 py-2 text-sm font-black" style={{ background: theme.accent, color: theme.accentText }}>
                                QR szkennelés
                              </div>
                            </div>
                            <div className="rounded-[18px] border border-white/10 bg-white/10 p-4 text-sm text-white/80">
                              <div className="text-xs uppercase tracking-[0.18em] text-white/60">Ajánlott venue</div>
                              <div className="mt-3 font-semibold">{theme.venueFit}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="theme-mini-admin p-4" style={{ background: theme.adminSurface }}>
                        <div className="rounded-[20px] border border-black/5 bg-white/70 p-4">
                          <div className="mb-4 flex items-center justify-between">
                            <span className="text-sm font-bold text-stone-800">Admin oldal</span>
                            <span className="text-xs text-stone-500">rendelés · étlap · riportok</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div className="rounded-[16px] px-3 py-2 font-bold" style={{ background: theme.accent, color: theme.accentText }}>Élő rendelések</div>
                            <div className="rounded-[16px] border border-stone-200 bg-white px-3 py-2 text-stone-700">Étlap</div>
                            <div className="rounded-[16px] border border-stone-200 bg-white px-3 py-2 text-stone-700">Riportok</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="mt-4 text-sm text-[color:var(--admin-muted)]">
                      Ideális venue: <span className="font-semibold text-[color:var(--admin-heading)]">{theme.venueFit}</span>
                    </p>
                  </button>
                )
              })}
            </div>

            <div className="flex flex-col gap-3 border-t border-black/5 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[color:var(--admin-muted)]">A kiválasztott design azonnal megjelenik a vendég és az admin felületen is.</p>
              <button onClick={saveTheme} disabled={themeSaving} className="btn-kapakka sm:w-auto sm:px-6">
                <Sparkles className="h-4 w-4" />
                {themeSaving ? 'Design mentése...' : 'Design aktiválása'}
              </button>
            </div>
          </div>
        )}

        {(tab === 'venue' || tab === 'hours' || tab === 'payment') && (
          <div className="mt-6 border-t border-black/5 pt-5">
            <button onClick={saveVenue} disabled={saving} className="btn-kapakka sm:w-auto sm:px-6">
              <Save className="h-4 w-4" />
              {saving ? 'Mentés...' : 'Beállítások mentése'}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
