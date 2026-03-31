
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function persistActiveContext(payload: { venueId: string; venueName: string; tableNumber?: string }) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem('kapakka_active_context', JSON.stringify(payload))
  window.dispatchEvent(new Event('kapakka-context-changed'))
}

export default function ScanPage() {
  const router = useRouter()
  const [manual, setManual] = useState('')
  const [mode, setMode] = useState<'camera' | 'manual'>('camera')
  const [cameraErr, setCameraErr] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (mode === 'camera') void startCamera()
    else stopCamera()
    return () => stopCamera()
  }, [mode])

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch {
      setCameraErr(true)
      setMode('manual')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  async function resolve(code: string) {
    const { data: table } = await supabase.from('tables').select('*, venue:venues(*)').eq('qr_code', code).single()
    if (table) {
      persistActiveContext({
        venueId: table.venue_id,
        venueName: table.venue?.name || 'Kapakka venue',
        tableNumber: String(table.number),
      })
      stopCamera()
      router.push(`/customer/pub/${table.venue_id}?table=${table.number}`)
      return
    }

    const { data: venue } = await supabase.from('venues').select('id,name').eq('id', code).single()
    if (venue) {
      persistActiveContext({
        venueId: venue.id,
        venueName: venue.name || 'Kapakka venue',
      })
      stopCamera()
      router.push(`/customer/pub/${venue.id}`)
      return
    }

    alert('Érvénytelen kód')
  }

  async function handleManual(e: React.FormEvent) {
    e.preventDefault()
    if (manual.trim()) await resolve(manual.trim())
  }

  return (
    <div className="min-h-screen dark-bg flex flex-col">
      <div className="px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white/50">← Vissza</button>
        <h1 className="text-white font-bold text-lg">QR Kód beolvasás</h1>
      </div>

      <div className="flex gap-2 mx-4 mb-5 p-1 bg-white/10 rounded-xl">
        {(['camera', 'manual'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${mode === m ? 'bg-amber-500 text-black' : 'text-white/60'}`}
          >
            {m === 'camera' ? '📷 Kamera' : '⌨️ Kézi bevitel'}
          </button>
        ))}
      </div>

      {mode === 'camera' && !cameraErr ? (
        <div className="px-4">
          <div className="relative rounded-3xl overflow-hidden bg-black aspect-square max-w-xs mx-auto">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-52 h-52 relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-amber-400 rounded-tl-xl" style={{ borderWidth: 3 }} />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-amber-400 rounded-tr-xl" style={{ borderWidth: 3 }} />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-amber-400 rounded-bl-xl" style={{ borderWidth: 3 }} />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-amber-400 rounded-br-xl" style={{ borderWidth: 3 }} />
                <div className="absolute inset-x-4 top-1/2 h-0.5 bg-amber-400/50 animate-pulse" />
              </div>
            </div>
          </div>
          <p className="text-white/40 text-sm text-center mt-6">Tartsd a kamerát az asztalon lévő QR kód fölé</p>
        </div>
      ) : (
        <div className="px-4 max-w-sm mx-auto">
          <form onSubmit={handleManual} className="space-y-4">
            <div>
              <label className="text-white/60 text-sm mb-2 block">Asztal kódja vagy helyszín azonosítója</label>
              <input value={manual} onChange={(e) => setManual(e.target.value)} className="kap-input" placeholder="pl. abc123..." autoFocus />
            </div>
            <button type="submit" className="btn-kapakka">Megnyitás</button>
          </form>
        </div>
      )}
    </div>
  )
}
