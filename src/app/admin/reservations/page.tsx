'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import { Calendar, Clock, Users, Plus, Phone, Mail, Check, X, User, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Függőben', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Megerősítve', color: 'bg-blue-100 text-blue-800' },
  seated: { label: 'Helyet foglalt', color: 'bg-green-100 text-green-800' },
  completed: { label: 'Lezárt', color: 'bg-stone-100 text-stone-600' },
  cancelled: { label: 'Lemondva', color: 'bg-red-100 text-red-800' },
  no_show: { label: 'Nem jelent meg', color: 'bg-red-50 text-red-600' },
}

export default function ReservationsPage() {
  const [venueId, setVenueId] = useState<string | null>(null)
  const [reservations, setReservations] = useState<any[]>([])
  const [tables, setTables] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    customer_name: '', customer_email: '', customer_phone: '',
    party_size: 2, reservation_date: new Date().toISOString().slice(0, 10),
    reservation_time: '19:00', duration_minutes: 120, notes: '', table_id: '',
  })

  const fetchReservations = useCallback(async (vid: string) => {
    let query = supabase.from('reservations')
      .select('*, table:tables(number)')
      .eq('venue_id', vid)
      .order('reservation_time', { ascending: true })

    if (statusFilter === 'active') {
      query = query.in('status', ['pending', 'confirmed', 'seated'])
    } else if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    if (selectedDate) {
      query = query.eq('reservation_date', selectedDate)
    }

    const { data } = await query
    setReservations(data || [])
    setLoading(false)
  }, [statusFilter, selectedDate])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('venue_id').eq('id', user.id).single()
      if (!p?.venue_id) return
      setVenueId(p.venue_id)
      const { data: t } = await supabase.from('tables').select('*').eq('venue_id', p.venue_id).order('number')
      setTables(t || [])
      fetchReservations(p.venue_id)
    }
    init()
  }, [fetchReservations])

  useEffect(() => { if (venueId) fetchReservations(venueId) }, [venueId, selectedDate, statusFilter, fetchReservations])

  async function saveReservation() {
    if (!form.customer_name || !venueId) return
    setSaving(true)
    const payload = {
      ...form,
      venue_id: venueId,
      table_id: form.table_id || null,
      status: 'confirmed',
    }
    const { error } = await supabase.from('reservations').insert(payload)
    if (error) toast.error('Hiba a mentésnél: ' + error.message)
    else { toast.success('Foglalás rögzítve!'); setShowForm(false); resetForm(); fetchReservations(venueId) }
    setSaving(false)
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('reservations').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    if (venueId) fetchReservations(venueId)
    toast.success('Státusz frissítve')
  }

  function resetForm() {
    setForm({
      customer_name: '', customer_email: '', customer_phone: '',
      party_size: 2, reservation_date: selectedDate,
      reservation_time: '19:00', duration_minutes: 120, notes: '', table_id: '',
    })
  }

  function shiftDate(days: number) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + days)
    setSelectedDate(d.toISOString().slice(0, 10))
  }

  const todayCount = reservations.filter(r => ['pending', 'confirmed', 'seated'].includes(r.status)).length
  const totalGuests = reservations.filter(r => ['pending', 'confirmed', 'seated'].includes(r.status))
    .reduce((s, r) => s + r.party_size, 0)

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-stone-800" style={{ fontFamily: 'Playfair Display, serif' }}>Asztalfoglalás</h1>
          <p className="text-stone-500 text-sm">{todayCount} foglalás, {totalGuests} vendég</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-colors">
          <Plus className="w-4 h-4" /> Új foglalás
        </button>
      </div>

      {/* Date picker & filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-3 py-2">
          <button onClick={() => shiftDate(-1)} className="w-7 h-7 bg-stone-100 rounded-lg flex items-center justify-center hover:bg-stone-200">
            <ChevronLeft className="w-4 h-4 text-stone-600" />
          </button>
          <Calendar className="w-4 h-4 text-stone-400" />
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            className="border-0 text-sm font-medium text-stone-800 focus:outline-none bg-transparent" />
          <button onClick={() => shiftDate(1)} className="w-7 h-7 bg-stone-100 rounded-lg flex items-center justify-center hover:bg-stone-200">
            <ChevronRight className="w-4 h-4 text-stone-600" />
          </button>
          <button onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
            className="text-amber-600 text-xs font-medium hover:text-amber-700 ml-1">Ma</button>
        </div>

        <div className="flex gap-1.5">
          {[
            { key: 'active', label: 'Aktív' },
            { key: 'completed', label: 'Lezárt' },
            { key: 'cancelled', label: 'Lemondott' },
            { key: 'all', label: 'Összes' },
          ].map(f => (
            <button key={f.key} onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors border ${
                statusFilter === f.key ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-stone-600 border-stone-200'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reservation list */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-stone-400 animate-pulse">Betöltés...</div>
        ) : reservations.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-10 h-10 text-stone-200 mx-auto mb-3" />
            <p className="text-stone-400">Nincs foglalás erre a napra</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-amber-600 text-sm underline">Új foglalás rögzítése</button>
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {reservations.map(res => {
              const statusInfo = STATUS_MAP[res.status] || STATUS_MAP.pending
              return (
                <div key={res.id} className="px-5 py-4 hover:bg-stone-50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Time */}
                    <div className="text-center flex-shrink-0 w-16">
                      <p className="text-lg font-black text-stone-800">{res.reservation_time?.slice(0, 5)}</p>
                      <p className="text-xs text-stone-400">{res.duration_minutes} perc</p>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-stone-800">{res.customer_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-stone-500">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {res.party_size} fő</span>
                        {res.table && <span className="flex items-center gap-1">🪑 Asztal #{res.table.number}</span>}
                        {res.customer_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {res.customer_phone}</span>}
                        {res.customer_email && <span className="flex items-center gap-1 hidden md:flex"><Mail className="w-3 h-3" /> {res.customer_email}</span>}
                      </div>
                      {res.notes && <p className="text-xs text-stone-400 mt-1 italic">💬 {res.notes}</p>}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {res.status === 'pending' && (
                        <button onClick={() => updateStatus(res.id, 'confirmed')}
                          className="w-8 h-8 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center justify-center" title="Megerősítés">
                          <Check className="w-4 h-4 text-blue-600" />
                        </button>
                      )}
                      {(res.status === 'pending' || res.status === 'confirmed') && (
                        <button onClick={() => updateStatus(res.id, 'seated')}
                          className="w-8 h-8 bg-green-50 hover:bg-green-100 rounded-lg flex items-center justify-center" title="Leültetés">
                          <User className="w-4 h-4 text-green-600" />
                        </button>
                      )}
                      {res.status === 'seated' && (
                        <button onClick={() => updateStatus(res.id, 'completed')}
                          className="w-8 h-8 bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center justify-center" title="Lezárás">
                          <Check className="w-4 h-4 text-stone-600" />
                        </button>
                      )}
                      {['pending', 'confirmed'].includes(res.status) && (
                        <button onClick={() => updateStatus(res.id, 'cancelled')}
                          className="w-8 h-8 bg-red-50 hover:bg-red-100 rounded-lg flex items-center justify-center" title="Lemondás">
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* New reservation modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="px-5 pt-5 pb-3 border-b border-stone-100 flex items-center justify-between">
              <h2 className="font-bold text-stone-800">Új asztalfoglalás</h2>
              <button onClick={() => setShowForm(false)} className="text-stone-400 hover:text-stone-600">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-stone-600 text-xs mb-1 block font-medium">Vendég neve *</label>
                  <input value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))}
                    className="input" placeholder="Kiss Péter" />
                </div>
                <div>
                  <label className="text-stone-600 text-xs mb-1 block font-medium">Telefonszám</label>
                  <input value={form.customer_phone} onChange={e => setForm(p => ({ ...p, customer_phone: e.target.value }))}
                    className="input" placeholder="+36 30 123 4567" />
                </div>
                <div>
                  <label className="text-stone-600 text-xs mb-1 block font-medium">Email</label>
                  <input type="email" value={form.customer_email} onChange={e => setForm(p => ({ ...p, customer_email: e.target.value }))}
                    className="input" placeholder="email@pelda.hu" />
                </div>
                <div>
                  <label className="text-stone-600 text-xs mb-1 block font-medium">Dátum *</label>
                  <input type="date" value={form.reservation_date} onChange={e => setForm(p => ({ ...p, reservation_date: e.target.value }))}
                    className="input" />
                </div>
                <div>
                  <label className="text-stone-600 text-xs mb-1 block font-medium">Időpont *</label>
                  <input type="time" value={form.reservation_time} onChange={e => setForm(p => ({ ...p, reservation_time: e.target.value }))}
                    className="input" />
                </div>
                <div>
                  <label className="text-stone-600 text-xs mb-1 block font-medium">Létszám *</label>
                  <input type="number" min={1} max={20} value={form.party_size} onChange={e => setForm(p => ({ ...p, party_size: parseInt(e.target.value) || 2 }))}
                    className="input" />
                </div>
                <div>
                  <label className="text-stone-600 text-xs mb-1 block font-medium">Asztal</label>
                  <select value={form.table_id} onChange={e => setForm(p => ({ ...p, table_id: e.target.value }))} className="input">
                    <option value="">Automatikus</option>
                    {tables.map(t => <option key={t.id} value={t.id}>#{t.number} ({t.capacity} fő)</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-stone-600 text-xs mb-1 block font-medium">Megjegyzés</label>
                  <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    className="input h-16 resize-none" placeholder="Különleges kérések, allergia..." />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-stone-200 text-stone-600 rounded-xl text-sm font-medium">Mégse</button>
                <button onClick={saveReservation} disabled={saving || !form.customer_name}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-colors">
                  {saving ? 'Mentés...' : 'Foglalás rögzítése'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
