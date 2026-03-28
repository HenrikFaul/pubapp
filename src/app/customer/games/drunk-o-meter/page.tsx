'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Minus, RotateCcw } from 'lucide-react'

const LEVELS = [
  { min: 0, max: 1, label: 'Józan', emoji: '😐', color: 'from-green-400 to-green-600', desc: 'Még teljesen józan vagy.' },
  { min: 1, max: 3, label: 'Picit vidám', emoji: '😊', color: 'from-lime-400 to-green-500', desc: 'Egy kis hangulat már van.' },
  { min: 3, max: 5, label: 'Jó kedvben', emoji: '😄', color: 'from-yellow-400 to-amber-500', desc: 'A legjobb állapot!' },
  { min: 5, max: 7, label: 'Lelkes', emoji: '🥳', color: 'from-orange-400 to-amber-600', desc: 'Mindenkit megölelsz.' },
  { min: 7, max: 9, label: 'Nagyon vidám', emoji: '😵', color: 'from-red-400 to-orange-500', desc: 'Lassan érdemes vizet inni.' },
  { min: 9, max: 12, label: 'Kapakka szint', emoji: '🍺', color: 'from-purple-500 to-red-500', desc: 'Legenda vagy. Taxi?' },
]

const DRINK_SIZES = [
  { label: 'Kis sör (0.3l)', alcohol: 0.5 },
  { label: 'Nagy sör (0.5l)', alcohol: 1.0 },
  { label: 'Fröccs', alcohol: 0.6 },
  { label: 'Bor (1.5dl)', alcohol: 0.8 },
  { label: 'Pálinka', alcohol: 1.5 },
  { label: 'Whisky shot', alcohol: 1.2 },
  { label: 'Koktél', alcohol: 1.0 },
]

export default function DrunkOMeter() {
  const router = useRouter()
  const [drinks, setDrinks] = useState<{ label: string; alcohol: number }[]>([])
  const [weight, setWeight] = useState(70)
  const [gender, setGender] = useState<'male' | 'female'>('male')

  const totalAlcohol = drinks.reduce((s, d) => s + d.alcohol, 0)
  // Simplified Widmark formula
  const r = gender === 'male' ? 0.68 : 0.55
  const bac = totalAlcohol > 0 ? (totalAlcohol * 10) / (weight * r) : 0
  const level = LEVELS.find(l => bac >= l.min && bac < l.max) || LEVELS[LEVELS.length - 1]

  function addDrink(drink: typeof DRINK_SIZES[0]) {
    setDrinks(prev => [...prev, drink])
  }

  function removeLast() {
    setDrinks(prev => prev.slice(0, -1))
  }

  const pct = Math.min(100, (bac / 12) * 100)

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-900 to-amber-950 text-white px-4 pt-12 pb-8">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-amber-300 mb-6">
        <ArrowLeft className="w-5 h-5" /> Vissza
      </button>

      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>Részegség mérő</h1>
      <p className="text-amber-400 text-sm mb-6">Mennyi ment le?</p>

      {/* Settings */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 bg-amber-900/50 rounded-xl p-3">
          <label className="text-amber-400 text-xs mb-1 block">Testsúly (kg)</label>
          <div className="flex items-center gap-2">
            <button onClick={() => setWeight(w => Math.max(40, w - 5))} className="w-7 h-7 bg-amber-700 rounded-lg flex items-center justify-center">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-bold text-lg flex-1 text-center">{weight}</span>
            <button onClick={() => setWeight(w => Math.min(150, w + 5))} className="w-7 h-7 bg-amber-700 rounded-lg flex items-center justify-center">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-amber-900/50 rounded-xl p-3">
          <label className="text-amber-400 text-xs mb-2 block">Nem</label>
          <div className="flex gap-1">
            <button onClick={() => setGender('male')} className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${gender === 'male' ? 'bg-amber-500 text-white' : 'text-amber-400'}`}>Férfi</button>
            <button onClick={() => setGender('female')} className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${gender === 'female' ? 'bg-amber-500 text-white' : 'text-amber-400'}`}>Nő</button>
          </div>
        </div>
      </div>

      {/* Level indicator */}
      <div className={`bg-gradient-to-br ${level.color} rounded-3xl p-6 mb-6 text-center shadow-lg`}>
        <div className="text-7xl mb-2">{level.emoji}</div>
        <h2 className="text-2xl font-bold">{level.label}</h2>
        <p className="text-white/80 text-sm mt-1">{level.desc}</p>
        <div className="mt-4 bg-white/20 rounded-full h-3 overflow-hidden">
          <div className={`h-full bg-white rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-white/70 text-xs mt-2">BAC: {bac.toFixed(2)} ‰ · {drinks.length} ital</p>
      </div>

      {/* Drink log */}
      {drinks.length > 0 && (
        <div className="bg-amber-900/40 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-amber-300 text-sm font-medium">Elfogyasztott italok</span>
            <button onClick={removeLast} className="text-amber-500 text-xs flex items-center gap-1">
              <RotateCcw className="w-3 h-3" /> Utolsó törlése
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {drinks.map((d, i) => (
              <span key={i} className="bg-amber-800/60 text-amber-200 text-xs px-2 py-1 rounded-full">{d.label}</span>
            ))}
          </div>
        </div>
      )}

      {/* Add drink buttons */}
      <h3 className="text-amber-300 text-sm font-medium mb-3">Ital hozzáadása:</h3>
      <div className="grid grid-cols-2 gap-2">
        {DRINK_SIZES.map(drink => (
          <button
            key={drink.label}
            onClick={() => addDrink(drink)}
            className="bg-amber-900/50 hover:bg-amber-800/60 border border-amber-700/40 text-amber-100 rounded-xl px-3 py-3 text-sm text-left transition-colors"
          >
            <span className="block font-medium">{drink.label}</span>
            <span className="text-amber-500 text-xs">+{drink.alcohol} egység</span>
          </button>
        ))}
      </div>

      {bac > 5 && (
        <div className="mt-6 bg-red-500/20 border border-red-500/30 rounded-2xl p-4 text-center">
          <p className="text-red-300 font-semibold">🚕 Kérj taxit, ne vezess!</p>
          <p className="text-red-400/70 text-xs mt-1">Ez az alkalmazás csak tájékoztató jellegű.</p>
        </div>
      )}
    </div>
  )
}
