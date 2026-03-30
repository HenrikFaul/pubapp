'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatPrice, formatDate } from '@/lib/utils'
import { Download, FileSpreadsheet, Calendar, TrendingUp, ShoppingBag, Users } from 'lucide-react'
import toast from 'react-hot-toast'

type ReportType = 'orders' | 'revenue' | 'items' | 'customers'

export default function ReportsPage() {
  const [venueId, setVenueId] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  })
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10))
  const [generating, setGenerating] = useState<ReportType | null>(null)
  const [previewData, setPreviewData] = useState<{ type: ReportType; data: any[] } | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('venue_id').eq('id', user.id).single()
      if (p?.venue_id) setVenueId(p.venue_id)
    }
    init()
  }, [])

  function downloadCSV(filename: string, headers: string[], rows: string[][]) {
    const bom = '\uFEFF'
    const csv = bom + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  async function generateReport(type: ReportType) {
    if (!venueId) return
    setGenerating(type)

    try {
      if (type === 'orders') {
        const { data } = await supabase.from('orders')
          .select('order_number, status, order_type, payment_method, subtotal, total, notes, placed_at, accepted_at, ready_at, completed_at, table:tables(number), items:order_items(quantity, unit_price, menu_item:menu_items(name))')
          .eq('venue_id', venueId)
          .gte('placed_at', dateFrom + 'T00:00:00')
          .lte('placed_at', dateTo + 'T23:59:59')
          .order('placed_at', { ascending: false })

        const headers = ['Rendelésszám', 'Státusz', 'Típus', 'Fizetés', 'Összeg (HUF)', 'Asztal', 'Tételek', 'Megjegyzés', 'Leadva', 'Elkészült']
        const rows = (data || []).map((o: any) => [
          o.order_number,
          o.status,
          o.order_type === 'table_service' ? 'Asztal' : 'Pult',
          o.payment_method === 'cash' ? 'Készpénz' : 'Kártya',
          String(o.total),
          o.table ? `#${o.table.number}` : '-',
          (o.items || []).map((i: any) => `${i.quantity}x ${i.menu_item?.name}`).join(', '),
          o.notes || '',
          o.placed_at ? new Date(o.placed_at).toLocaleString('hu-HU') : '',
          o.completed_at ? new Date(o.completed_at).toLocaleString('hu-HU') : '',
        ])

        setPreviewData({ type, data: (data || []).slice(0, 5) })
        downloadCSV(`kapakka_rendelesek_${dateFrom}_${dateTo}.csv`, headers, rows)
        toast.success(`${(data || []).length} rendelés exportálva`)
      }

      if (type === 'revenue') {
        const { data } = await supabase.from('orders')
          .select('total, placed_at, payment_method, status')
          .eq('venue_id', venueId)
          .not('status', 'eq', 'cancelled')
          .gte('placed_at', dateFrom + 'T00:00:00')
          .lte('placed_at', dateTo + 'T23:59:59')

        // Group by date
        const dayMap: Record<string, { revenue: number; orders: number; cash: number; card: number }> = {}
        ;(data || []).forEach(o => {
          const day = o.placed_at.slice(0, 10)
          if (!dayMap[day]) dayMap[day] = { revenue: 0, orders: 0, cash: 0, card: 0 }
          dayMap[day].revenue += o.total || 0
          dayMap[day].orders++
          if (o.payment_method === 'cash') dayMap[day].cash += o.total || 0
          else dayMap[day].card += o.total || 0
        })

        const headers = ['Dátum', 'Rendelések száma', 'Összbevétel (HUF)', 'Készpénz (HUF)', 'Kártya (HUF)', 'Átlag rendelés (HUF)']
        const rows = Object.entries(dayMap).sort().map(([day, d]) => [
          day, String(d.orders), String(d.revenue), String(d.cash), String(d.card),
          String(d.orders > 0 ? Math.round(d.revenue / d.orders) : 0),
        ])

        downloadCSV(`kapakka_bevetel_${dateFrom}_${dateTo}.csv`, headers, rows)
        toast.success(`${rows.length} nap bevételi adatai exportálva`)
      }

      if (type === 'items') {
        const { data } = await supabase.from('order_items')
          .select('quantity, unit_price, total_price, menu_item:menu_items(name, category:menu_categories(name)), order:orders!inner(venue_id, placed_at, status)')
          .eq('order.venue_id', venueId)
          .not('order.status', 'eq', 'cancelled')
          .gte('order.placed_at', dateFrom + 'T00:00:00')
          .lte('order.placed_at', dateTo + 'T23:59:59')

        // Aggregate by item
        const itemMap: Record<string, { name: string; category: string; qty: number; revenue: number }> = {}
        ;(data || []).forEach((i: any) => {
          const name = i.menu_item?.name || '?'
          if (!itemMap[name]) itemMap[name] = { name, category: i.menu_item?.category?.name || '', qty: 0, revenue: 0 }
          itemMap[name].qty += i.quantity
          itemMap[name].revenue += i.total_price || 0
        })

        const sorted = Object.values(itemMap).sort((a, b) => b.revenue - a.revenue)
        const headers = ['Termék', 'Kategória', 'Eladott mennyiség', 'Bevétel (HUF)', 'Átlagár (HUF)']
        const rows = sorted.map(i => [
          i.name, i.category, String(i.qty), String(i.revenue),
          String(i.qty > 0 ? Math.round(i.revenue / i.qty) : 0),
        ])

        downloadCSV(`kapakka_termekek_${dateFrom}_${dateTo}.csv`, headers, rows)
        toast.success(`${sorted.length} termék eladási adatai exportálva`)
      }

      if (type === 'customers') {
        const { data } = await supabase.from('profiles')
          .select('full_name, email, role, loyalty_points, total_orders, total_spent, last_order_at, created_at')
          .eq('role', 'customer')
          .order('total_spent', { ascending: false })

        const headers = ['Név', 'Email', 'Rendelések', 'Költés (HUF)', 'Hűségpontok', 'Utolsó rendelés', 'Regisztráció']
        const rows = (data || []).map((c: any) => [
          c.full_name || '', c.email || '', String(c.total_orders || 0), String(c.total_spent || 0),
          String(c.loyalty_points || 0),
          c.last_order_at ? new Date(c.last_order_at).toLocaleDateString('hu-HU') : '-',
          new Date(c.created_at).toLocaleDateString('hu-HU'),
        ])

        downloadCSV(`kapakka_vendegek_${dateFrom}_${dateTo}.csv`, headers, rows)
        toast.success(`${(data || []).length} vendég adatai exportálva`)
      }
    } catch (err) {
      toast.error('Hiba az export során')
      console.error(err)
    }

    setGenerating(null)
  }

  const REPORTS = [
    { type: 'orders' as ReportType, label: 'Rendelések', desc: 'Összes rendelés részletesen — rendelésszám, tételek, státusz, összeg, időpont', icon: ShoppingBag, color: 'bg-amber-500' },
    { type: 'revenue' as ReportType, label: 'Napi bevétel', desc: 'Bevételi riport napi bontásban — készpénz/kártya megoszlás, átlag rendelés', icon: TrendingUp, color: 'bg-emerald-500' },
    { type: 'items' as ReportType, label: 'Termék eladások', desc: 'Termékenkénti eladási statisztikák — mennyiség, bevétel, átlagár', icon: FileSpreadsheet, color: 'bg-blue-500' },
    { type: 'customers' as ReportType, label: 'Vendégek', desc: 'Vendég adatbázis export — rendelések, költés, hűségpontok', icon: Users, color: 'bg-purple-500' },
  ]

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-stone-800" style={{ fontFamily: 'Playfair Display, serif' }}>Riportok & Export</h1>
        <p className="text-stone-500 text-sm">Adatok exportálása CSV formátumban</p>
      </div>

      {/* Date range */}
      <div className="bg-white rounded-2xl border border-stone-100 p-5 mb-6">
        <h2 className="text-stone-700 font-semibold text-sm mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-500" /> Időszak kiválasztása
        </h2>
        <div className="flex flex-col md:flex-row gap-3 items-center">
          <div>
            <label className="text-stone-500 text-xs mb-1 block">Ettől</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input" />
          </div>
          <span className="text-stone-300 hidden md:block mt-4">→</span>
          <div>
            <label className="text-stone-500 text-xs mb-1 block">Eddig</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input" />
          </div>
          <div className="flex gap-2 md:ml-4 md:mt-4">
            {[
              { label: 'Ma', fn: () => { const t = new Date().toISOString().slice(0,10); setDateFrom(t); setDateTo(t) }},
              { label: 'Hét', fn: () => { const d = new Date(); d.setDate(d.getDate()-7); setDateFrom(d.toISOString().slice(0,10)); setDateTo(new Date().toISOString().slice(0,10)) }},
              { label: 'Hónap', fn: () => { const d = new Date(); d.setDate(1); setDateFrom(d.toISOString().slice(0,10)); setDateTo(new Date().toISOString().slice(0,10)) }},
            ].map(p => (
              <button key={p.label} onClick={p.fn}
                className="px-3 py-1.5 bg-stone-100 hover:bg-amber-100 text-stone-600 rounded-lg text-xs font-medium transition-colors">
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORTS.map(report => {
          const Icon = report.icon
          const isGenerating = generating === report.type
          return (
            <div key={report.type} className="bg-white rounded-2xl border border-stone-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 ${report.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-stone-800">{report.label}</h3>
                  <p className="text-stone-500 text-xs mt-1">{report.desc}</p>
                  <button
                    onClick={() => generateReport(report.type)}
                    disabled={isGenerating || !venueId}
                    className="mt-3 flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    {isGenerating ? 'Generálás...' : 'CSV Letöltés'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
