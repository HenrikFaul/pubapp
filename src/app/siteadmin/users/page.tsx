'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { timeAgo } from '@/lib/utils'
import { Search, Shield, ShieldCheck, UserCog, Users as UsersIcon, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

const ROLE_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  customer: { label: 'Vendég', emoji: '🙋', color: 'bg-slate-500/20 text-slate-300' },
  admin: { label: 'Vendéglős', emoji: '🏪', color: 'bg-amber-500/20 text-amber-300' },
  staff: { label: 'Munkatárs', emoji: '👤', color: 'bg-blue-500/20 text-blue-300' },
  superadmin: { label: 'Superadmin', emoji: '🛡️', color: 'bg-indigo-500/20 text-indigo-300' },
}

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    let query = supabase.from('profiles')
      .select('*, venue:venues(name)')
      .order('created_at', { ascending: false })

    if (roleFilter !== 'all') query = query.eq('role', roleFilter)

    const { data } = await query
    setUsers(data || [])
    setLoading(false)
  }, [roleFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function changeRole(userId: string, newRole: string) {
    const { error } = await supabase.from('profiles')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) {
      toast.error('Hiba a szerepkör módosításánál')
      return
    }

    // Log the action
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('activity_logs').insert({
      actor_id: user?.id,
      actor_email: user?.email,
      action: 'role_changed',
      entity_type: 'user',
      entity_id: userId,
      details: { new_role: newRole },
    })

    toast.success('Szerepkör módosítva!')
    setEditingUser(null)
    fetchUsers()
  }

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Felhasználók</h1>
          <p className="text-slate-400 text-sm mt-1">{filtered.length} felhasználó</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Keresés email vagy névre..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 md:w-48"
        >
          <option value="all">Összes szerepkör</option>
          <option value="customer">🙋 Vendég</option>
          <option value="admin">🏪 Vendéglős</option>
          <option value="staff">👤 Munkatárs</option>
          <option value="superadmin">🛡️ Superadmin</option>
        </select>
      </div>

      {/* Users table */}
      <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-slate-500 animate-pulse">Betöltés...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">Nincs találat</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50 border-b border-slate-700/30">
                <tr>
                  <th className="text-left px-5 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Felhasználó</th>
                  <th className="text-left px-5 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider hidden md:table-cell">Email</th>
                  <th className="text-left px-5 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Szerepkör</th>
                  <th className="text-left px-5 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider hidden lg:table-cell">Helyszín</th>
                  <th className="text-right px-5 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider hidden md:table-cell">Regisztráció</th>
                  <th className="text-center px-5 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Művelet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/20">
                {filtered.map(user => {
                  const role = ROLE_LABELS[user.role] || ROLE_LABELS.customer
                  return (
                    <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-indigo-600/30 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                            {user.full_name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">{user.full_name || '(nincs név)'}</p>
                            <p className="text-slate-500 text-xs md:hidden">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <span className="text-slate-300 text-xs font-mono">{user.email}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${role.color}`}>
                          {role.emoji} {role.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 hidden lg:table-cell">
                        <span className="text-slate-400 text-xs">
                          {user.venue?.name || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right hidden md:table-cell">
                        <span className="text-slate-500 text-xs">{timeAgo(user.created_at)}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-center">
                          {editingUser === user.id ? (
                            <div className="flex flex-col gap-1">
                              {Object.entries(ROLE_LABELS).map(([key, val]) => (
                                <button
                                  key={key}
                                  onClick={() => changeRole(user.id, key)}
                                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                                    user.role === key
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                                  }`}
                                >
                                  {val.emoji} {val.label}
                                </button>
                              ))}
                              <button
                                onClick={() => setEditingUser(null)}
                                className="text-xs text-slate-500 mt-1 hover:text-slate-300"
                              >
                                Mégse
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingUser(user.id)}
                              className="w-8 h-8 bg-slate-700/50 hover:bg-indigo-600/30 rounded-lg flex items-center justify-center transition-colors"
                              title="Szerepkör módosítása"
                            >
                              <UserCog className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
