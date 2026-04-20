
'use client'

import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft,
  ChevronRight,
  Store,
  Zap,
  Star,
  QrCode,
  Shield,
  Sparkles,
  ShoppingBag,
} from 'lucide-react'

type Mode = 'landing' | 'login' | 'register' | 'forgot'

function AppMark() {
  return (
    <div className="inline-flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 shadow-2xl">
        <Store className="h-6 w-6 text-amber-400" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.34em] text-white/40">Kapakka</p>
        <p className="font-semibold text-white/90">Rendelj okosan, várj kevesebbet</p>
      </div>
    </div>
  )
}

function ShowcaseFeature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="feature-card p-4">
      <div className="mb-3 inline-flex rounded-2xl border border-white/10 bg-white/10 p-3 text-amber-400">{icon}</div>
      <p className="mb-1 font-semibold text-white">{title}</p>
      <p className="text-sm text-white/50">{text}</p>
    </div>
  )
}

function GoogleButton({
  label,
  loading,
  onClick,
}: {
  label: string
  loading: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-40"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
      {label}
    </button>
  )
}

function Divider() {
  return (
    <div className="my-2 flex items-center gap-3">
      <div className="h-px flex-1 bg-white/10" />
      <span className="text-xs text-white/30">vagy</span>
      <div className="h-px flex-1 bg-white/10" />
    </div>
  )
}

function AuthFrame({
  title,
  subtitle,
  backMode,
  onBack,
  children,
}: {
  title: string
  subtitle: string
  backMode: Mode
  onBack: (mode: Mode) => void
  children: ReactNode
}) {
  return (
    <div className="app-shell">
      <div className="app-container grid min-h-screen gap-8 py-5 lg:grid-cols-[minmax(0,1.08fr)_520px] lg:py-8">
        <section className="hero-card hidden p-8 lg:flex lg:flex-col lg:justify-between">
          <div>
            <AppMark />
            <div className="mt-14 max-w-xl">
              <div className="section-kicker mb-5">
                <Sparkles className="h-4 w-4" />
                vendégélmény + vendéglátói hatékonyság
              </div>
              <h1 className="section-title">A pulttól a játékokig minden egy helyen.</h1>
              <p className="section-subtitle mt-5 max-w-lg">
                Modern, fiatalos és vásárlásra ösztönző élmény vendégeknek, letisztult üzemeltetés a venue csapatnak.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ShowcaseFeature icon={<QrCode className="h-5 w-5" />} title="QR rendelés" text="Gyors belépés az asztalhoz, kevesebb súrlódás, gyorsabb fogyasztás." />
            <ShowcaseFeature icon={<Zap className="h-5 w-5" />} title="Játékok" text="Kocsmakvíz és party játékok, amelyek bent tartják a társaságot." />
            <ShowcaseFeature icon={<Star className="h-5 w-5" />} title="Hűségpontok" text="Visszatérő vendégek ösztönzése közvetlenül az élményben." />
            <ShowcaseFeature icon={<Store className="h-5 w-5" />} title="Venue üzemeltetés" text="Rendeléskezelés, étlap, riportok és konfiguráció egy adminból." />
          </div>
        </section>

        <section className="flex items-center justify-center py-8 lg:py-0">
          <div className="modern-card w-full max-w-xl p-5 sm:p-7">
            <div className="lg:hidden">
              <AppMark />
            </div>
            <button
              onClick={() => onBack(backMode)}
              className="mb-6 mt-5 inline-flex items-center gap-2 text-sm font-medium text-white/50 transition-colors hover:text-white/80 lg:mt-0"
            >
              <ArrowLeft className="h-4 w-4" />
              Vissza
            </button>
            <h2 className="text-3xl font-bold text-white">{title}</h2>
            <p className="mt-2 text-sm text-white/50">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </div>
        </section>
      </div>
    </div>
  )
}

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
  const hasRedirected = useRef(false)

  useEffect(() => {
    let mounted = true

    const timeout = setTimeout(() => {
      if (mounted && checking) setChecking(false)
    }, 4000)

    async function checkAuth() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (!mounted) return
        if (error || !user) {
          setChecking(false)
          return
        }

        if (hasRedirected.current) return
        hasRedirected.current = true

        const { data: profile } = await supabase.from('profiles').select('role, venue_id').eq('id', user.id).single()
        const userRole = profile?.role || (user.user_metadata?.role as string) || 'customer'

        if (['admin', 'staff', 'superadmin'].includes(userRole)) {
          if (userRole === 'admin' && !profile?.venue_id) router.replace('/venueadmin/setup')
          else router.replace('/venueadmin')
        } else {
          router.replace('/customer')
        }
      } catch {
        if (mounted) setChecking(false)
      }
    }

    void checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (event === 'SIGNED_IN' && session?.user && !hasRedirected.current) {
        void checkAuth()
      }
      if (event === 'SIGNED_OUT') {
        hasRedirected.current = false
        setChecking(false)
      }
    })

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription?.unsubscribe()
    }
  }, [checking, router])

  async function redirectByRole(userId: string, fallbackRole?: string) {
    try {
      const { data: profile } = await supabase.from('profiles').select('role, venue_id').eq('id', userId).single()
      const userRole = profile?.role || fallbackRole || 'customer'
      if (['admin', 'staff', 'superadmin'].includes(userRole)) {
        if (userRole === 'admin' && !profile?.venue_id) router.replace('/venueadmin/setup')
        else router.replace('/venueadmin')
      } else {
        router.replace('/customer')
      }
    } catch {
      router.replace('/customer')
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErr('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setErr('Hibás email vagy jelszó.')
      setLoading(false)
      return
    }
    if (data.user) {
      hasRedirected.current = true
      await redirectByRole(data.user.id, data.user.user_metadata?.role as string)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErr('')
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, role } },
    })

    if (error) {
      setErr(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      await supabase.from('profiles').upsert(
        {
          id: data.user.id,
          email,
          full_name: name,
          role,
        },
        { onConflict: 'id' }
      )

      if (data.session) {
        hasRedirected.current = true
        setMsg('Regisztráció sikeres! Átirányítás...')
        setTimeout(() => {
          if (role === 'admin') router.replace('/venueadmin/setup')
          else router.replace('/customer')
        }, 500)
      } else {
        setMsg('Regisztráció sikeres! Ellenőrizd az email fiókodat a megerősítő linkért.')
        setLoading(false)
      }
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErr('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : '',
    })
    if (error) setErr(error.message)
    else setMsg('Jelszó visszaállítási link elküldve az email-edre!')
    setLoading(false)
  }

  async function signInWithGoogle() {
    setLoading(true)
    setErr('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : '',
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error) {
      setErr(error.message)
      setLoading(false)
    }
  }

  function resetMessages(nextMode: Mode) {
    setMode(nextMode)
    setErr('')
    setMsg('')
  }

  if (checking) {
    return (
      <div className="app-shell flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-[28px] border border-white/10 bg-white/10 text-amber-400 shadow-2xl">
          <Store className="h-10 w-10 anim-pulse" />
        </div>
        <p className="text-sm text-white/50">Kapakka betöltése...</p>
      </div>
    )
  }

  if (mode === 'landing') {
    return (
      <div className="app-shell">
        <div className="app-container grid min-h-screen gap-8 py-5 lg:grid-cols-[minmax(0,1.1fr)_480px] lg:py-8">
          <section className="hero-card flex flex-col justify-between p-6 sm:p-8 lg:p-10">
            <div>
              <AppMark />
              <div className="mt-10 max-w-2xl">
                <div className="section-kicker mb-5">
                  <Shield className="h-4 w-4" />
                  QR rendelés · digitális étlap · játékok · hűség
                </div>
                <h1 className="section-title">Tedd a vendégutat gyorsabbá, játékosabbá és profitábilisabbá.</h1>
                <p className="section-subtitle mt-5 max-w-xl">
                  A Kapakka összehozza a vendéget, az asztalt és a pultot. Gyors rendelés, valós idejű követés és visszahozó élmény ugyanabban az appban.
                </p>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <ShowcaseFeature icon={<QrCode className="h-5 w-5" />} title="QR belépés" text="Asztalról vagy pultból pár érintéssel." />
                <ShowcaseFeature icon={<ShoppingBag className="h-5 w-5" />} title="Gyors rendelés" text="Kevesebb sorban állás, több fogyasztás." />
                <ShowcaseFeature icon={<Zap className="h-5 w-5" />} title="Kocsmajátékok" text="Kvíz, dice, felelsz vagy mersz." />
                <ShowcaseFeature icon={<Star className="h-5 w-5" />} title="Hűségpontok" text="Visszatérő vendégek ösztönzése." />
              </div>
            </div>

            <div className="mt-10 grid gap-3 rounded-[26px] border border-white/10 bg-black/20 p-4 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/30">Vendég oldal</p>
                <p className="mt-2 text-lg font-semibold text-white">Mobilos élmény, ami tényleg fogyasztásra visz.</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/30">Vendéglátói oldal</p>
                <p className="mt-2 text-lg font-semibold text-white">Tiszta admin, gyors döntések, kevesebb káosz.</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/30">Nincs app letöltés</p>
                <p className="mt-2 text-lg font-semibold text-white">Webesen is erős, mobilon is natív hatású.</p>
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center py-4 lg:py-0">
            <div className="modern-card w-full max-w-xl p-5 sm:p-7">
              <div className="lg:hidden">
                <AppMark />
                <div className="mt-6 space-y-2">
                  <h2 className="text-3xl font-bold text-white">Lépj be a Kapakka élménybe.</h2>
                  <p className="text-sm text-white/50">Vendégként pillanatok alatt indulhatsz, vendéglősként pedig kézben tarthatod a helyedet.</p>
                </div>
              </div>

              <div className="hidden lg:block">
                <p className="text-xs uppercase tracking-[0.28em] text-white/30">Kezdjük</p>
                <h2 className="mt-3 text-3xl font-bold text-white">Egy belépés, két erős élmény.</h2>
                <p className="mt-2 text-sm text-white/50">Folytasd Google-lel vagy emaillel — a rendszer a szereped alapján a megfelelő felületre visz.</p>
              </div>

              <div className="mt-7 space-y-3">
                <GoogleButton label="Folytatás Google-lel" loading={loading} onClick={() => void signInWithGoogle()} />
                <Divider />
                <button className="btn-kapakka text-base" onClick={() => resetMessages('register')}>
                  Regisztráció email-lel
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button className="btn-outline" onClick={() => resetMessages('login')}>
                  Bejelentkezés email-lel
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    )
  }

  if (mode === 'login') {
    return (
      <AuthFrame title="Bejelentkezés" subtitle="Lépj vissza a rendeléseidhez, játékokhoz vagy az admin felületre." backMode="landing" onBack={resetMessages}>
        <GoogleButton label="Bejelentkezés Google-lel" loading={loading} onClick={() => void signInWithGoogle()} />
        <Divider />
        <form onSubmit={handleLogin} className="space-y-4">
          {err && <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{err}</p>}
          {msg && <p className="rounded-2xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300">{msg}</p>}
          <input className="kap-input" type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="kap-input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button className="btn-kapakka text-base" type="submit" disabled={loading}>
            {loading ? 'Bejelentkezés...' : 'Bejelentkezés'}
          </button>
          <button type="button" onClick={() => resetMessages('forgot')} className="w-full py-1 text-center text-sm text-white/40 transition-colors hover:text-white/70">
            Elfelejtett jelszó?
          </button>
        </form>
        <div className="mt-6 text-center">
          <button onClick={() => resetMessages('register')} className="text-sm text-amber-400">
            Még nincs fiókod? <span className="underline">Regisztrálj</span>
          </button>
        </div>
      </AuthFrame>
    )
  }

  if (mode === 'register') {
    return (
      <AuthFrame title="Regisztráció" subtitle="Válaszd ki, hogy vendégként vagy venue oldali szereplőként csatlakozol." backMode="landing" onBack={resetMessages}>
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-[20px] border border-white/10 bg-white/5 p-1.5">
          {(['customer', 'admin'] as const).map((value) => {
            const active = role === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${active ? 'bg-amber-500 text-black shadow-lg' : 'text-white/60 hover:text-white'}`}
              >
                {value === 'customer' ? '🙋 Vendég vagyok' : '🏪 Vendéglős vagyok'}
              </button>
            )
          })}
        </div>
        <GoogleButton label="Regisztráció Google-lel" loading={loading} onClick={() => void signInWithGoogle()} />
        <Divider />
        <form onSubmit={handleRegister} className="space-y-4">
          {err && <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{err}</p>}
          {msg && <p className="rounded-2xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300">{msg}</p>}
          <input className="kap-input" placeholder="Teljes név" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className="kap-input" type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="kap-input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
          <button className="btn-kapakka text-base" type="submit" disabled={loading}>
            {loading ? 'Regisztráció...' : 'Regisztráció'}
            {!loading && <ChevronRight className="h-4 w-4" />}
          </button>
        </form>
        <div className="mt-6 text-center">
          <button onClick={() => resetMessages('login')} className="text-sm text-amber-400">
            Van már fiókod? <span className="underline">Bejelentkezés</span>
          </button>
        </div>
      </AuthFrame>
    )
  }

  return (
    <AuthFrame title="Elfelejtett jelszó" subtitle="Add meg az email címed, és küldünk egy biztonságos visszaállítási linket." backMode="login" onBack={resetMessages}>
      {msg ? (
        <div className="rounded-[24px] border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-300">{msg}</div>
      ) : (
        <form onSubmit={handleForgot} className="space-y-4">
          {err && <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{err}</p>}
          <input className="kap-input" type="email" placeholder="Email cím" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button className="btn-kapakka" type="submit" disabled={loading}>
            {loading ? 'Küldés...' : 'Email küldése'}
          </button>
        </form>
      )}
    </AuthFrame>
  )
}
