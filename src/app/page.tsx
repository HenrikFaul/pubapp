'use client'

import { useState, useEffect } from 'react'
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
  const [checking, setChecking] = useState(true)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  // Already logged in? Redirect immediately
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { setChecking(false); return }
      // Read role from profile, fallback to user_metadata
      const { data: p } = await supabase
        .from('profiles').select('role').eq('id', session.user.id).single()
      const r = p?.role || (session.user.user_metadata?.role as string) || 'customer'
      if (['admin', 'staff', 'superadmin'].includes(r)) router.replace('/admin')
      else router.replace('/customer')
    })
  }, [router])

  async function redirectAfterAuth(userId: string) {
    const { data: p } = await supabase
      .from('profiles').select('role').eq('id', userId).single()
    const r = p?.role || 'customer'
    if (['admin', 'staff', 'superadmin'].includes(r)) router.replace('/admin')
    else router.replace('/customer')
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErr('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setErr('Hibás email vagy jelszó.'); setLoading(false); return }
    await redirectAfterAuth(data.user.id)
    // Keep loading=true — page will redirect
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErr('')
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name, role } },
    })
    if (error) { setErr(error.message); setLoading(false); return }
    if (data.user) {
      // Explicitly upsert profile — trigger will also do it, belt-and-suspenders
      await supabase.from('profiles').upsert({
        id: data.user.id, email, full_name: name, role,
      })
    }
    if (role === 'admin') router.replace('/admin/setup')
    else router.replace('/customer')
    // Keep loading=true
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErr('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : '',
    })
    if (error) setErr(error.message)
    else setMsg('Jelszó visszaállítási link elküldve az email-edre!')
    setLoading(false)
  }

  if (checking || loading) return (
    <div className="min-h-screen dark-bg flex flex-col items-center justify-center gap-4">
      <div className="text-amber-400 text-5xl animate-pulse">🍺</div>
      {loading && <p className="text-white/40 text-sm">Átirányítás...</p>}
    </div>
  )

  // ── LANDING ──
  if (mode === 'landing') return (
    <div className="min-h-screen dark-bg flex flex-col">
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Desktop left brand panel */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-2/5 flex-col items-center justify-center px-16 border-r border-white/10">
          <div className="w-32 h-32 rounded-full border-4 border-white flex flex-col items-center justify-center mb-8">
            <svg viewBox="0 0 60 60" width="70" height="70" fill="none">
              <rect x="14" y="10" width="32" height="36" rx="3" stroke="white" strokeWidth="3"/>
              <line x1="14" y1="22" x2="46" y2="22" stroke="white" strokeWidth="2.5"/>
              <rect x="20" y="28" width="6" height="10" rx="1" fill="white"/>
              <rect x="30" y="28" width="6" height="10" rx="1" fill="white"/>
            </svg>
            <span className="text-white font-bold text-sm tracking-widest mt-1">KAPAKKA</span>
          </div>
          <h1 className="text-5xl font-black text-white text-center leading-tight mb-4"
            style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.04em' }}>
            RENDELJ OKOSAN,<br />
            <span style={{ color: '#F5A623' }}>VÁRJ KEVESEBBET.</span>
          </h1>
          <p className="text-white/50 text-lg text-center">Kocsmakvíz · Rendelés · Hűségpontok</p>
          <div className="mt-10 text-white/20 text-sm">WWW.KAPAKKA.COM</div>
        </div>

        {/* Right / mobile full content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 lg:px-16">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full border-4 border-white flex flex-col items-center justify-center">
              <svg viewBox="0 0 60 60" width="52" height="52" fill="none">
                <rect x="14" y="10" width="32" height="36" rx="3" stroke="white" strokeWidth="3"/>
                <line x1="14" y1="22" x2="46" y2="22" stroke="white" strokeWidth="2.5"/>
                <rect x="20" y="28" width="6" height="10" rx="1" fill="white"/>
                <rect x="30" y="28" width="6" height="10" rx="1" fill="white"/>
              </svg>
              <span className="text-white font-bold text-xs tracking-widest mt-1">KAPAKKA</span>
            </div>
            <h1 className="text-3xl font-black text-white"
              style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.04em' }}>
              RENDELJ OKOSAN,<br />
              <span style={{ color: '#F5A623' }}>VÁRJ KEVESEBBET.</span>
            </h1>
            <p className="text-white/50 text-sm mt-2">Kocsmakvíz · Rendelés · Hűségpontok</p>
          </div>

          {/* Menu strips */}
          <div className="w-full max-w-sm lg:max-w-md space-y-3 mb-8">
            {[
              { icon: '🍺', label: 'LIST OF PUBS' },
              { icon: '🎁', label: 'SPECIAL OFFER' },
              { icon: '📱', label: 'ORDER' },
              { icon: '📲', label: 'QR CODE' },
              { icon: '🎮', label: 'GAMES' },
            ].map(i => (
              <div key={i.label} className="menu-strip">
                <span className="text-2xl">{i.icon}</span>
                <span>{i.label}</span>
              </div>
            ))}
          </div>

          <div className="w-full max-w-sm lg:max-w-md space-y-3">
            <button className="btn-kapakka text-lg" onClick={() => setMode('register')}>Kezdjük el →</button>
            <button className="btn-outline" onClick={() => setMode('login')}>Már van fiókom</button>
          </div>
          <div className="lg:hidden mt-8 text-white/20 text-xs">WWW.KAPAKKA.COM</div>
        </div>
      </div>
    </div>
  )

  // ── FORGOT ──
  if (mode === 'forgot') return (
    <div className="min-h-screen dark-bg flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm lg:max-w-md bg-white/5 rounded-2xl p-8">
        <button onClick={() => setMode('login')} className="text-white/50 text-sm mb-6 flex items-center gap-2 hover:text-white/80">← Vissza</button>
        <h2 className="text-2xl font-bold text-white mb-2">Elfelejtett jelszó</h2>
        <p className="text-white/60 text-sm mb-6">Add meg az email-ed, küldünk egy visszaállítási linket.</p>
        {msg ? (
          <div className="bg-green-900/40 border border-green-500/40 text-green-300 rounded-xl p-4 text-sm">{msg}</div>
        ) : (
          <form onSubmit={handleForgot} className="space-y-4">
            {err && <p className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg">{err}</p>}
            <input className="kap-input" type="email" placeholder="Email cím" value={email} onChange={e => setEmail(e.target.value)} required />
            <button className="btn-kapakka" type="submit">Link küldése</button>
          </form>
        )}
      </div>
    </div>
  )

  // ── LOGIN ──
  if (mode === 'login') return (
    <div className="min-h-screen dark-bg flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-1/2 xl:w-2/5 flex-col items-center justify-center px-16 border-r border-white/10">
        <div className="text-8xl mb-6">🍺</div>
        <h2 className="text-4xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>KAPAKKA</h2>
        <p className="text-white/40 mt-3">A legjobb vendéglátóhelyeken</p>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 lg:px-16">
        <div className="w-full max-w-sm lg:max-w-md">
          <button onClick={() => setMode('landing')} className="text-white/50 text-sm mb-6 flex items-center gap-2 hover:text-white/80">← Vissza</button>
          <h2 className="text-2xl font-bold text-white mb-6">Bejelentkezés</h2>
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
            <button className="btn-kapakka text-base font-bold" type="submit">Bejelentkezés</button>
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
    </div>
  )

  // ── REGISTER ──
  return (
    <div className="min-h-screen dark-bg flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-1/2 xl:w-2/5 flex-col items-center justify-center px-16 border-r border-white/10">
        <div className="text-8xl mb-6">🍺</div>
        <h2 className="text-4xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>KAPAKKA</h2>
        <p className="text-white/40 mt-3">Csatlakozz a közösséghez</p>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 lg:px-16 py-12">
        <div className="w-full max-w-sm lg:max-w-md">
          <button onClick={() => setMode('landing')} className="text-white/50 text-sm mb-6 flex items-center gap-2 hover:text-white/80">← Vissza</button>
          <h2 className="text-2xl font-bold text-white mb-6">Regisztráció</h2>
          <div className="flex gap-2 p-1 bg-white/10 rounded-xl mb-6">
            {(['customer', 'admin'] as const).map(r => (
              <button key={r} onClick={() => setRole(r)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${role === r ? 'bg-amber-500 text-black' : 'text-white/60 hover:text-white/80'}`}>
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
            <button className="btn-kapakka text-base font-bold" type="submit">Regisztráció →</button>
          </form>
          <div className="text-center mt-6">
            <button onClick={() => setMode('login')} className="text-amber-400 text-sm hover:text-amber-300">
              Már van fiókom → <span className="underline">Bejelentkezés</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
