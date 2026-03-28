'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Beer, ChevronRight, Star, Zap, Shield } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const [mode, setMode] = useState<'landing' | 'login' | 'register'>('landing')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'customer' | 'admin'>('customer')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error('Hibás email vagy jelszó')
      setLoading(false)
      return
    }
    // Get profile to determine redirect
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'admin' || profile?.role === 'staff' || profile?.role === 'superadmin') {
      router.push('/admin')
    } else {
      router.push('/customer')
    }
    setLoading(false)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, role } },
    })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    // Create profile
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        email,
        full_name: name,
        role,
      })
    }
    toast.success('Sikeres regisztráció!')
    if (role === 'admin') {
      router.push('/admin')
    } else {
      router.push('/customer')
    }
    setLoading(false)
  }

  if (mode === 'login') {
    return (
      <div className="min-h-screen bg-amber-950 flex flex-col items-center justify-center p-6">
        <button onClick={() => setMode('landing')} className="self-start text-amber-300 mb-8 flex items-center gap-1">
          ← Vissza
        </button>
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
              <Beer className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>Kapakka</h1>
          </div>
          <h2 className="text-xl text-amber-100 font-semibold mb-6">Bejelentkezés</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-amber-300 text-sm mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-amber-900/50 border border-amber-700 text-amber-100 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500 placeholder:text-amber-700"
                placeholder="email@example.com"
                required
              />
            </div>
            <div>
              <label className="text-amber-300 text-sm mb-1 block">Jelszó</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-amber-900/50 border border-amber-700 text-amber-100 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? 'Bejelentkezés...' : 'Bejelentkezés'}
            </button>
          </form>
          <button
            onClick={() => setMode('register')}
            className="w-full mt-4 text-amber-400 text-sm text-center"
          >
            Nincs még fiókod? <span className="underline">Regisztrálj</span>
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'register') {
    return (
      <div className="min-h-screen bg-amber-950 flex flex-col items-center justify-center p-6">
        <button onClick={() => setMode('landing')} className="self-start text-amber-300 mb-8">
          ← Vissza
        </button>
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
              <Beer className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>Kapakka</h1>
          </div>
          <h2 className="text-xl text-amber-100 font-semibold mb-6">Regisztráció</h2>
          
          {/* Role selector */}
          <div className="flex gap-2 mb-6 p-1 bg-amber-900/50 rounded-xl">
            <button
              onClick={() => setRole('customer')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${role === 'customer' ? 'bg-amber-500 text-white' : 'text-amber-400'}`}
            >
              Vendég vagyok
            </button>
            <button
              onClick={() => setRole('admin')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${role === 'admin' ? 'bg-amber-500 text-white' : 'text-amber-400'}`}
            >
              Vendéglős vagyok
            </button>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-amber-300 text-sm mb-1 block">Teljes név</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-amber-900/50 border border-amber-700 text-amber-100 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500 placeholder:text-amber-700"
                placeholder="Kovács János"
                required
              />
            </div>
            <div>
              <label className="text-amber-300 text-sm mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-amber-900/50 border border-amber-700 text-amber-100 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500 placeholder:text-amber-700"
                placeholder="email@example.com"
                required
              />
            </div>
            <div>
              <label className="text-amber-300 text-sm mb-1 block">Jelszó</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-amber-900/50 border border-amber-700 text-amber-100 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500"
                placeholder="Min. 6 karakter"
                minLength={6}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? 'Regisztráció...' : 'Regisztráció'}
            </button>
          </form>
          <button onClick={() => setMode('login')} className="w-full mt-4 text-amber-400 text-sm text-center">
            Már van fiókod? <span className="underline">Bejelentkezés</span>
          </button>
        </div>
      </div>
    )
  }

  // Landing page
  return (
    <div className="min-h-screen bg-amber-950 text-white overflow-hidden">
      {/* Hero */}
      <div className="relative px-6 pt-16 pb-12">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-900/50 to-amber-950" />
        <div className="relative max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Beer className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
              Kapakka
            </span>
          </div>

          <h1 className="text-4xl font-bold leading-tight mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
            Rendelj okosan,<br />
            <span className="text-amber-400">várj kevesebbet.</span>
          </h1>

          <p className="text-amber-200/80 text-lg mb-10 leading-relaxed">
            Kocsmakvíz, rendelés, hűségpontok — minden egy helyen. A legjobb vendéglátóhelyeken.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 mb-10">
            {['QR-kódos rendelés', 'Kocsmakvíz játék', 'Hűségpontok', 'Valós idejű értesítések'].map(f => (
              <span key={f} className="px-3 py-1.5 bg-amber-900/60 border border-amber-700/50 rounded-full text-amber-200 text-sm">
                {f}
              </span>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="space-y-3">
            <button
              onClick={() => setMode('register')}
              className="w-full bg-amber-500 hover:bg-amber-400 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-amber-500/30"
            >
              Kezdjük el <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => setMode('login')}
              className="w-full bg-transparent border border-amber-700 hover:border-amber-500 text-amber-300 font-semibold py-4 rounded-2xl transition-colors"
            >
              Már van fiókom
            </button>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="px-6 pb-16 max-w-lg mx-auto">
        <div className="grid grid-cols-1 gap-4">
          {[
            {
              icon: <Zap className="w-5 h-5 text-amber-400" />,
              title: 'Gyors rendelés',
              desc: 'Szkenneld be az asztalkódot, válassz a menüből, kész.',
            },
            {
              icon: <Star className="w-5 h-5 text-amber-400" />,
              title: 'Kocsmakvíz & játékok',
              desc: 'Szórakozz barátaiddal kocsmakvíz és más játékok segítségével.',
            },
            {
              icon: <Shield className="w-5 h-5 text-amber-400" />,
              title: 'Vendéglősöknek',
              desc: 'Hatékonyabb kiszolgálás, valós idejű statisztikák, készletkezelés.',
            },
          ].map(f => (
            <div key={f.title} className="flex gap-4 p-4 bg-amber-900/30 rounded-xl border border-amber-800/40">
              <div className="w-10 h-10 bg-amber-900/60 rounded-lg flex items-center justify-center flex-shrink-0">
                {f.icon}
              </div>
              <div>
                <h3 className="font-semibold text-amber-100 mb-1">{f.title}</h3>
                <p className="text-amber-300/70 text-sm">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
