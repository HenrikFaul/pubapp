'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { Activity, Database, Info, RefreshCw, ScrollText, Settings } from 'lucide-react'
import { COMMON_ADMIN_HOSTS, COMMON_ADMIN_INTEGRATIONS, COMMON_ADMIN_RELEASE } from '@/lib/commonAdminMetadata'

interface SyncStateRow {
  status?: string
  cursor?: number
  task_count?: number
  last_run_started_at?: string | null
  last_run_completed_at?: string | null
  last_error?: string | null
}

export default function CommonAdminPanel() {
  const [syncState, setSyncState] = useState<SyncStateRow | null>(null)
  const [rowCount, setRowCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  async function refreshState() {
    setLoading(true)
    try {
      const [{ data: stateRows }, { count }] = await Promise.all([
        supabase.from('place_sync_state').select('*').eq('key', 'hu-venues').limit(1),
        supabase.from('places_hu_catalog').select('*', { head: true, count: 'exact' }),
      ])
      setSyncState(Array.isArray(stateRows) && stateRows[0] ? (stateRows[0] as any) : null)
      setRowCount(typeof count === 'number' ? count : null)
    } catch {
      setSyncState(null)
      setRowCount(null)
    }
    setLoading(false)
  }

  async function triggerSync() {
    setLoading(true)
    try {
      const { error } = await supabase.functions.invoke('sync-hu-places', { body: { reason: 'common-admin-manual' } })
      if (error) throw error
      toast.success('Hungary local catalog sync elindítva.')
      await refreshState()
    } catch (error: any) {
      toast.error(error?.message || 'Nem sikerült elindítani a syncet.')
    }
    setLoading(false)
  }

  useEffect(() => { void refreshState() }, [])

  return (
    <section className="admin-card p-5 sm:p-6">
      <div className="flex items-center gap-2 text-white">
        <Settings className="h-5 w-5" />
        <h3 className="text-xl font-bold">Common Admin</h3>
      </div>
      <p className="mt-2 max-w-3xl text-sm text-white/55">Közös admin inventory a Kapakka / Pubapp számára: integrációk, hosting, release adatok és helyi place-sync operáció.</p>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        {COMMON_ADMIN_HOSTS.map((row) => (
          <div key={row.label} className="admin-card-soft p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">{row.label}</p>
            <p className="mt-2 text-lg font-bold text-white">{row.value}</p>
            <p className="mt-2 text-sm text-white/45">{row.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <div className="admin-card-soft p-5">
          <div className="flex items-center gap-2 text-white"><Info className="h-4 w-4" /> <span className="font-semibold">Integrációk és használatban lévő külső szolgáltatók</span></div>
          <div className="mt-4 space-y-4">
            {COMMON_ADMIN_INTEGRATIONS.map((group) => (
              <div key={group.title}>
                <p className="text-sm font-semibold text-white">{group.title}</p>
                <div className="mt-2 flex flex-col gap-2">
                  {group.providers.map((provider) => (
                    <div key={provider.name} className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{provider.name}</p>
                          <p className="mt-1 text-xs text-white/45">{provider.detail}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${provider.active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/50'}`}>{provider.active ? 'Aktív' : 'Read-only'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card-soft p-5">
          <div className="flex items-center gap-2 text-white"><ScrollText className="h-4 w-4" /> <span className="font-semibold">Alkalmazásverzió adatok</span></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/35">Verzió</p>
              <p className="mt-2 text-2xl font-black text-white">{COMMON_ADMIN_RELEASE.version}</p>
            </div>
            <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/35">Deployment</p>
              <p className="mt-2 text-sm font-semibold text-white">{COMMON_ADMIN_RELEASE.deployedAt}</p>
            </div>
          </div>
          <div className="mt-4 rounded-[20px] border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold text-white">Changelogból összefoglalt leszállított funkciók</p>
            <ul className="mt-3 space-y-2 text-sm text-white/55">{COMMON_ADMIN_RELEASE.delivered.map((item) => <li key={item}>• {item}</li>)}</ul>
            <p className="mt-3 text-xs text-white/35">{COMMON_ADMIN_RELEASE.notes}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 admin-card-soft p-5">
        <div className="flex items-center gap-2 text-white"><Database className="h-4 w-4" /> <span className="font-semibold">Lokális venue katalógus operáció</span></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="mini-stat"><p className="text-xs uppercase tracking-[0.2em] text-white/35">Rekord</p><p className="mt-2 text-2xl font-black text-white">{rowCount ?? '—'}</p></div>
          <div className="mini-stat"><p className="text-xs uppercase tracking-[0.2em] text-white/35">Állapot</p><p className="mt-2 text-lg font-black text-white">{syncState?.status || 'ismeretlen'}</p></div>
          <div className="mini-stat"><p className="text-xs uppercase tracking-[0.2em] text-white/35">Cursor</p><p className="mt-2 text-lg font-black text-white">{typeof syncState?.cursor === 'number' ? syncState.cursor : '—'}</p></div>
          <div className="mini-stat"><p className="text-xs uppercase tracking-[0.2em] text-white/35">Task count</p><p className="mt-2 text-lg font-black text-white">{typeof syncState?.task_count === 'number' ? syncState.task_count : '—'}</p></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={refreshState} disabled={loading} className="btn-outline w-auto px-4 py-3"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Állapot frissítése</button>
          <button onClick={triggerSync} disabled={loading} className="btn-kapakka w-auto px-4 py-3"><Activity className="h-4 w-4" /> Sync trigger</button>
        </div>
        <div className="mt-4 rounded-[18px] border border-white/10 bg-white/5 p-4 text-sm text-white/50">A jelenlegi Pubapp main helykereső local-first katalógust használ, Geoapify + TomTom bootstrap / enrichment fallbackkel. Ez a common_admin panel inventory és operáció nézetet ad ehhez a stackhez.</div>
      </div>
    </section>
  )
}
