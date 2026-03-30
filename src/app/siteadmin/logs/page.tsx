'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Filter, RefreshCw, AlertTriangle, Info, AlertCircle, XCircle } from 'lucide-react'

const ACTION_LABELS: Record<string, string> = {
  user_registered: 'Regisztráció',
  order_placed: 'Rendelés leadás',
  venue_created: 'Helyszín létrehozás',
  role_changed: 'Szerepkör módosítás',
  error: 'Hiba',
  login: 'Bejelentkezés',
  logout: 'Kijelentkezés',
}

const SEVERITY_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Info' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Figyelmeztetés' },
  error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Hiba' },
  critical: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-600/10', label: 'Kritikus' },
}

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (severityFilter !== 'all') query = query.eq('severity', severityFilter)
    if (actionFilter !== 'all') query = query.eq('action', actionFilter)

    const { data, error } = await query

    if (error) {
      // Table might not exist yet
      console.log('Activity logs table may not exist yet:', error.message)
      setLogs([])
    } else {
      setLogs(data || [])
    }
    setLoading(false)
  }, [severityFilter, actionFilter, page])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const filtered = logs.filter(l =>
    l.actor_email?.toLowerCase().includes(search.toLowerCase()) ||
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    JSON.stringify(l.details || {}).toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Aktivitás logok</h1>
          <p className="text-slate-400 text-sm mt-1">Rendszer események és hibanaplók</p>
        </div>
        <button onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors">
          <RefreshCw className="w-4 h-4" /> Frissítés
        </button>
      </div>

      {/* Severity summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Object.entries(SEVERITY_CONFIG).map(([key, config]) => {
          const Icon = config.icon
          const count = logs.filter(l => l.severity === key).length
          return (
            <button
              key={key}
              onClick={() => setSeverityFilter(severityFilter === key ? 'all' : key)}
              className={`${config.bg} border rounded-xl p-4 text-left transition-all ${
                severityFilter === key ? 'border-indigo-500' : 'border-transparent hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${config.color}`} />
                <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
              </div>
              <p className="text-white font-bold text-xl">{count}</p>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Keresés emailre, akcióra, részletekre..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 md:w-48"
        >
          <option value="all">Összes típus</option>
          {Object.entries(ACTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Log entries */}
      <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-slate-500 animate-pulse">Betöltés...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Info className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500">
              {logs.length === 0
                ? 'Nincs log bejegyzés. Futtasd a 002-es migrációt az aktivitás logolás bekapcsolásához.'
                : 'Nincs találat a szűrőkre.'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/20">
            {filtered.map(log => {
              const sev = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.info
              const SevIcon = sev.icon
              return (
                <div key={log.id} className="px-5 py-4 hover:bg-slate-800/20 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Severity icon */}
                    <div className={`w-8 h-8 rounded-lg ${sev.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <SevIcon className={`w-4 h-4 ${sev.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white text-sm font-medium">
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${sev.bg} ${sev.color}`}>
                          {sev.label}
                        </span>
                        {log.entity_type && (
                          <span className="text-slate-500 text-xs bg-slate-800 px-2 py-0.5 rounded-full">
                            {log.entity_type}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1">
                        {log.actor_email && (
                          <span className="text-slate-400 text-xs font-mono">{log.actor_email}</span>
                        )}
                      </div>

                      {/* Details */}
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="mt-2 bg-slate-900/50 rounded-lg px-3 py-2">
                          <pre className="text-slate-400 text-xs font-mono whitespace-pre-wrap break-all">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-slate-500 text-xs">
                        {new Date(log.created_at).toLocaleDateString('hu-HU')}
                      </p>
                      <p className="text-slate-600 text-xs">
                        {new Date(log.created_at).toLocaleTimeString('hu-HU')}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {filtered.length >= PAGE_SIZE && (
          <div className="flex items-center justify-center gap-3 px-5 py-4 border-t border-slate-700/30">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium disabled:opacity-30"
            >
              ← Előző
            </button>
            <span className="text-slate-500 text-xs">Oldal {page + 1}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium"
            >
              Következő →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
