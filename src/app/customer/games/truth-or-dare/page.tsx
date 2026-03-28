'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw, Target } from 'lucide-react'

const TRUTHS = [
  'Ki volt az első szerelmed?',
  'Mi a legzavaróbb szokásod?',
  'Melyik barátodat hívnád fel éjjel 3-kor?',
  'Mikor sírtál utoljára?',
  'Mi volt eddigi leghülyébb döntésed?',
  'Kihez vonzódsz ezen a szobában?',
  'Mi a legnagyobb titkom?',
  'Mikor hazudtál utoljára, és kinek?',
  'Mi az amit sohasem vallottál be a szüleidnek?',
  'Melyik volt eddigi legjobb bulis élményed?',
  'Kivel lenne a legjobb randid ebből a csoportból?',
  'Mi a legszégyenteljesebb zene amit hallgatsz?',
]

const DARES = [
  'Táncolj 30 másodpercig zene nélkül!',
  'Hívj fel valakit és énekelj neki!',
  'Csináljál 10 fekvőtámaszt!',
  'Szólalj meg mindenféle akcent-tel 1 percig!',
  'Posztolj egy kínos fotót a sztoridra!',
  'Mondj el egy viccet angolul!',
  'Mutasd meg a legutóbbi elküldött üzeneted!',
  'Tegyed magad a csoport névjegyképévé 24 órára!',
  'Ülj a következő person térdére 10 másodpercig!',
  'Csináld le az itteni legdrágább alkoholt (shot)!',
  'Cseréld ki a telefonod fő képét!',
  'Mondj el egyet mindenkiről, ami zavarja!',
]

export default function TruthOrDarePage() {
  const router = useRouter()
  const [mode, setMode] = useState<'igazság' | 'merészség' | null>(null)
  const [currentText, setCurrentText] = useState('')
  const [flipping, setFlipping] = useState(false)

  function pick(type: 'igazság' | 'merészség') {
    setFlipping(true)
    setMode(type)
    setTimeout(() => {
      const arr = type === 'igazság' ? TRUTHS : DARES
      setCurrentText(arr[Math.floor(Math.random() * arr.length)])
      setFlipping(false)
    }, 300)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-900 to-pink-950 text-white px-4 pt-12 pb-8 flex flex-col">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-rose-300 mb-6 self-start">
        <ArrowLeft className="w-5 h-5" /> Vissza
      </button>

      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="text-7xl mb-4">🎯</div>
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>Igazság vagy Merészség</h1>
        <p className="text-rose-300 text-sm mb-10">Válassz, aztán válaszolj vagy teljesítsd!</p>

        {/* Card */}
        <div className={`w-full max-w-sm min-h-[180px] rounded-3xl flex items-center justify-center p-6 mb-8 transition-all duration-300 ${
          flipping ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        } ${
          mode === 'igazság' ? 'bg-blue-600/80 border-2 border-blue-400/40' :
          mode === 'merészség' ? 'bg-rose-600/80 border-2 border-rose-400/40' :
          'bg-white/10 border-2 border-white/20'
        }`}>
          {currentText ? (
            <div>
              <span className={`text-xs font-bold uppercase tracking-widest mb-3 block ${mode === 'igazság' ? 'text-blue-300' : 'text-rose-300'}`}>
                {mode === 'igazság' ? '❓ Igazság' : '🔥 Merészség'}
              </span>
              <p className="text-white font-semibold text-lg leading-snug">{currentText}</p>
            </div>
          ) : (
            <p className="text-white/40">Válassz egy kategóriát lent!</p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-4 w-full max-w-sm mb-6">
          <button
            onClick={() => pick('igazság')}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-5 rounded-2xl text-lg transition-colors shadow-lg"
          >
            ❓ Igazság
          </button>
          <button
            onClick={() => pick('merészség')}
            className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-5 rounded-2xl text-lg transition-colors shadow-lg"
          >
            🔥 Merészség
          </button>
        </div>

        {currentText && (
          <button
            onClick={() => mode && pick(mode)}
            className="flex items-center gap-2 text-rose-300 text-sm"
          >
            <RefreshCw className="w-4 h-4" /> Újat húzok
          </button>
        )}
      </div>
    </div>
  )
}
