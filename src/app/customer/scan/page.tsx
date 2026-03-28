'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, QrCode, Keyboard } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ScanPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'scan' | 'manual'>('scan')
  const [manualCode, setManualCode] = useState('')
  const [scanning, setScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (mode === 'scan') startCamera()
    else stopCamera()
    return () => stopCamera()
  }, [mode])

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setScanning(true)
    } catch {
      toast.error('Kamera hozzáférés megtagadva. Kézi bevitel:')
      setMode('manual')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setScanning(false)
  }

  async function handleQrResult(code: string) {
    // Look up table by QR code
    const { data: table } = await supabase
      .from('tables')
      .select('*, venue:venues(*)')
      .eq('qr_code', code)
      .single()

    if (table) {
      stopCamera()
      router.push(`/customer/pub/${table.venue_id}?table=${table.number}&qr=${code}`)
    } else {
      // Maybe it's a venue ID
      const { data: venue } = await supabase
        .from('venues')
        .select('id')
        .eq('id', code)
        .single()
      if (venue) {
        stopCamera()
        router.push(`/customer/pub/${venue.id}`)
      } else {
        toast.error('Érvénytelen QR kód')
      }
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!manualCode.trim()) return
    await handleQrResult(manualCode.trim())
  }

  return (
    <div className="min-h-screen bg-amber-950 text-white">
      <div className="px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 bg-amber-900/60 rounded-xl flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-amber-300" />
        </button>
        <h1 className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>QR Kód beolvasása</h1>
      </div>

      {/* Mode toggle */}
      <div className="mx-4 mb-6 flex gap-2 p-1 bg-amber-900/40 rounded-xl">
        <button
          onClick={() => setMode('scan')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${mode === 'scan' ? 'bg-amber-500 text-white' : 'text-amber-400'}`}
        >
          <QrCode className="w-4 h-4" /> Kamera
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${mode === 'manual' ? 'bg-amber-500 text-white' : 'text-amber-400'}`}
        >
          <Keyboard className="w-4 h-4" /> Kézi bevitel
        </button>
      </div>

      {mode === 'scan' ? (
        <div className="px-4">
          <div className="relative rounded-3xl overflow-hidden bg-black aspect-square max-w-sm mx-auto">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Scanner overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-56 h-56 relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-amber-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-amber-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-amber-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-amber-400 rounded-br-lg" />
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-amber-400/60 animate-pulse" />
              </div>
            </div>
          </div>
          <p className="text-center text-amber-400 text-sm mt-6">
            Tartsd a kamerát az asztalon lévő QR kód fölé
          </p>

          {/* Demo button */}
          <div className="mt-8 text-center">
            <p className="text-amber-600 text-xs mb-3">Teszt (demo célra):</p>
            <button
              onClick={async () => {
                // Pick a random active venue
                const { data } = await supabase.from('venues').select('id').eq('is_active', true).limit(1).single()
                if (data) router.push(`/customer/pub/${data.id}`)
              }}
              className="px-6 py-3 bg-amber-700/40 text-amber-300 rounded-xl text-sm border border-amber-700"
            >
              Demo kocsmát megnyitok
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 max-w-sm mx-auto">
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="text-amber-300 text-sm mb-2 block">
                Add meg az asztal kódját vagy a kocsma azonosítóját
              </label>
              <input
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="pl. abc123..."
                className="w-full bg-amber-900/50 border border-amber-700 text-amber-100 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 placeholder:text-amber-700"
                autoFocus
              />
            </div>
            <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-white font-bold py-3 rounded-xl">
              Megnyitás
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
