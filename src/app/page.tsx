'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Mode = 'landing' | 'login' | 'register' | 'forgot'

export default function HomePage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('landing')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'customer' | 'admin'>('customer')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErr('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setErr('Hibás email vagy jelszó.'); setLoading(false); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
    if (['admin','staff','superadmin'].includes(profile?.role || '')) router.push('/admin')
    else router.push('/customer')
    setLoading(false)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErr('')
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
    if (error) { setErr(error.message); setLoading(false); return }
    if (data.user) {
      await supabase.from('profiles').upsert({ id: data.user.id, email, full_name: name, role })
    }
    if (role === 'admin') router.push('/admin/setup')
    else router.push('/customer')
    setLoading(false)
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErr('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) setErr(error.message)
    else setMsg('Jelszó visszaállítási link elküldve az email-edre!')
    setLoading(false)
  }

  /* ── LANDING ── */
  if (mode === 'landing') return (
    <div className="min-h-screen dark-bg flex flex-col">
      {/* Logo area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
        <div className="mb-10 text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full border-4 border-white flex flex-col items-center justify-center">
            <svg viewBox="0 0 60 60" width="52" height="52" fill="none">
              <rect x="14" y="10" width="32" height="36" rx="3" stroke="white" strokeWidth="3"/>
              <line x1="14" y1="22" x2="46" y2="22" stroke="white" strokeWidth="2.5"/>
              <rect x="20" y="28" width="6" height="10" rx="1" fill="white"/>
              <rect x="30" y="28" width="6" height="10" rx="1" fill="white"/>
            </svg>
            <span className="text-white font-bold text-xs tracking-widest mt-1">KAPAKKA</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3" style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.05em' }}>
            Rendelj okosan,<br />
            <span style={{ color: '#F5A623' }}>várj kevesebbet.</span>
          </h1>
          <p className="text-white/70 text-base">Kocsmakvíz · Rendelés · Hűségpontok</p>
        </div>

        {/* Feature strips - original Kapakka style */}
        <div className="w-full max-w-sm space-y-3 mb-10">
          {[
            { icon: '🍺', label: 'LIST OF PUBS' },
            { icon: '🎁', label: 'SPECIAL OFFER' },
            { icon: '📱', label: 'ORDER' },
            { icon: '📲', label: 'QR CODE' },
            { icon: '🎮', label: 'GAMES' },
          ].map(item => (
            <div key={item.label} className="menu-strip opacity-80">
              <span className="text-2xl">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        <div className="w-full max-w-sm space-y-3">
          <button className="btn-kapakka" onClick={() => setMode('register')}>
            Kezdjük el →
          </button>
          <button className="btn-outline" onClick={() => setMode('login')}>
            Már van fiókom
          </button>
        </div>
      </div>
      <div className="text-center text-white/30 text-xs pb-6">WWW.KAPAKKA.COM</div>
    </div>
  )

  /* ── FORGOT PASSWORD ── */
  if (mode === 'forgot') return (
    <div className="min-h-screen dark-bg flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <button onClick={() => setMode('login')} className="text-white/50 text-sm mb-8 flex items-center gap-2">← Vissza</button>
        <h2 className="text-2xl font-bold text-white mb-2">Elfelejtett jelszó</h2>
        <p className="text-white/60 text-sm mb-6">Add meg az email-ed, küldünk egy visszaállítási linket.</p>
        {msg ? (
          <div className="text-green-400 text-sm text-center py-4">{msg}</div>
        ) : (
          <form onSubmit={handleForgot} className="space-y-4">
            {err && <p className="text-red-400 text-sm">{err}</p>}
            <input className="kap-input" type="email" placeholder="Email cím" value={email} onChange={e => setEmail(e.target.value)} required />
            <button className="btn-kapakka" type="submit" disabled={loading}>
              {loading ? 'Küldés...' : 'Link küldése'}
            </button>
          </form>
        )}
      </div>
    </div>
  )

  /* ── LOGIN ── */
  if (mode === 'login') return (
    <div className="min-h-screen dark-bg flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <button onClick={() => setMode('landing')} className="text-white/50 text-sm mb-8 flex items-center gap-2">← Vissza</button>
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-white/30 flex items-center justify-center">
            <span className="text-2xl">🍺</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Bejelentkezés</h2>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          {err && <p className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg">{err}</p>}
          <div>
            <label className="text-white/60 text-xs mb-1.5 block">Email</label>
            <input className="kap-input" type="email" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="text-white/60 text-xs mb-1.5 block">Jelszó</label>
            <input className="kap-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button className="btn-kapakka" type="submit" disabled={loading}>
            {loading ? 'Bejelentkezés...' : 'Bejelentkezés'}
          </button>
          <button type="button" onClick={() => setMode('forgot')} className="w-full text-white/40 text-sm text-center py-1 hover:text-white/70 transition-colors">
            Elfelejtett jelszó?
          </button>
        </form>
        <div className="text-center mt-6">
          <button onClick={() => setMode('register')} className="text-amber-400 text-sm hover:text-amber-300">
            Még nincs fiókod? <span className="underline">Regisztrálj</span>
          </button>
        </div>
      </div>
    </div>
  )

  /* ── REGISTER ── */
  return (
    <div className="min-h-screen dark-bg flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <button onClick={() => setMode('landing')} className="text-white/50 text-sm mb-8 flex items-center gap-2">← Vissza</button>
        <h2 className="text-2xl font-bold text-white mb-6">Regisztráció</h2>

        {/* Role selector */}
        <div className="flex gap-2 p-1 bg-white/10 rounded-xl mb-6">
          {(['customer','admin'] as const).map(r => (
            <button key={r} onClick={() => setRole(r)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${role === r ? 'bg-amber-500 text-black' : 'text-white/60'}`}>
              {r === 'customer' ? '🙋 Vendég vagyok' : '🏪 Vendéglős vagyok'}
            </button>
          ))}
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          {err && <p className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg">{err}</p>}
          <div>
            <label className="text-white/60 text-xs mb-1.5 block">Teljes név</label>
            <input className="kap-input" placeholder="Kovács János" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label className="text-white/60 text-xs mb-1.5 block">Email</label>
            <input className="kap-input" type="email" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="text-white/60 text-xs mb-1.5 block">Jelszó (min. 6 karakter)</label>
            <input className="kap-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required />
          </div>
          <button className="btn-kapakka" type="submit" disabled={loading}>
            {loading ? 'Regisztráció...' : 'Regisztráció →'}
          </button>
        </form>
        <div className="text-center mt-6">
          <button onClick={() => setMode('login')} className="text-amber-400 text-sm hover:text-amber-300">
            Már van fiókom → <span className="underline">Bejelentkezés</span>
          </button>
        </div>
      </div>
    </div>
  )
}
