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

  useEffect(() => {
    // Handle OAuth callback (Google redirect back)
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Ensure profile exists (for Google users)
        const u = session.user
        await supabase.from('profiles').upsert({
          id: u.id,
          email: u.email,
          full_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0],
          role: u.user_metadata?.role || 'customer',
        }, { onConflict: 'id', ignoreDuplicates: true })

        const { data: p } = await supabase.from('profiles').select('role').eq('id', u.id).single()
        const r = p?.role || u.user_metadata?.role || 'customer'
        if (['admin', 'staff', 'superadmin'].includes(r)) router.replace('/admin')
        else router.replace('/customer')
      }
    })

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { setChecking(false); return }
      const { data: p } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      const r = p?.role || (session.user.user_metadata?.role as string) || 'customer'
      if (['admin', 'staff', 'superadmin'].includes(r)) router.replace('/admin')
      else router.replace('/customer')
    })
  }, [router])

  async function redirectAfterAuth(userId: string) {
    const { data: p } = await supabase.from('profiles').select('role').eq('id', userId).single()
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
      await supabase.from('profiles').upsert({ id: data.user.id, email, full_name: name, role })
    }
    if (role === 'admin') router.replace('/admin/setup')
    else router.replace('/customer')
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErr('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : '',
    })
    if (error) setErr(error.message)
    else setMsg('Jelszó visszaállítási link elküldve az email-edre!')
    setLoading(false)
  }

  async function signInWithGoogle() {
    setLoading(true); setErr('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : '',
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error) { setErr(error.message); setLoading(false) }
    // On success the browser redirects to Google — loading stays true
  }

  const GoogleButton = ({ label }: { label: string }) => (
    <button
      type="button"
      onClick={signInWithGoogle}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold py-3 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-40"
    >
      {/* Google SVG logo */}
      <svg width="20" height="20" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      {label}
    </button>
  )

  const Divider = () => (
    <div className="flex items-center gap-3 my-2">
      <div className="flex-1 h-px bg-white/15" />
      <span className="text-white/30 text-xs">vagy</span>
      <div className="flex-1 h-px bg-white/15" />
    </div>
  )

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
          <h1 className="text-5xl font-black text-white text-center leading-tight mb-4" style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.04em' }}>
            RENDELJ OKOSAN,<br /><span style={{ color: '#F5A623' }}>VÁRJ KEVESEBBET.</span>
          </h1>
          <p className="text-white/50 text-lg text-center">Kocsmakvíz · Rendelés · Hűségpontok</p>
          <div className="mt-10 text-white/20 text-sm">WWW.KAPAKKA.COM</div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 lg:px-16">
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
            <h1 className="text-3xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.04em' }}>
              RENDELJ OKOSAN,<br /><span style={{ color: '#F5A623' }}>VÁRJ KEVESEBBET.</span>
            </h1>
            <p className="text-white/50 text-sm mt-2">Kocsmakvíz · Rendelés · Hűségpontok</p>
          </div>

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
            <GoogleButton label="Folytatás Google-lel" />
            <Divider />
            <button className="btn-kapakka text-lg" onClick={() => setMode('register')}>Regisztráció email-lel →</button>
            <button className="btn-outline" onClick={() => setMode('login')}>Bejelentkezés email-lel</button>
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
            <GoogleButton label="Visszaállítás Google-lel" />
            <Divider />
            <input className="kap-input" type="email" placeholder="Email cím" value={email} onChange={e => setEmail(e.target.value)} required />
            <button className="btn-kapakka" type="submit">Email küldése</button>
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
          <GoogleButton label="Bejelentkezés Google-lel" />
          <Divider />
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
          <div className="flex gap-2 p-1 bg-white/10 rounded-xl mb-5">
            {(['customer', 'admin'] as const).map(r => (
              <button key={r} onClick={() => setRole(r)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${role === r ? 'bg-amber-500 text-black' : 'text-white/60 hover:text-white/80'}`}>
                {r === 'customer' ? '🙋 Vendég vagyok' : '🏪 Vendéglős vagyok'}
              </button>
            ))}
          </div>
          <GoogleButton label="Regisztráció Google-lel" />
          <Divider />
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
