'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

const DICE_RULES: Record<number, string> = {
  1: 'Mindenki iszik!',
  2: 'Bal szomszéd iszik!',
  3: 'Jobb szomszéd iszik!',
  4: 'Te iszol!',
  5: 'Legfiatalabb iszik!',
  6: 'Mindenki iszik duplán!',
}

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

export default function DicePage() {
  const router = useRouter()
  const [die1, setDie1] = useState<number | null>(null)
  const [die2, setDie2] = useState<number | null>(null)
  const [rolling, setRolling] = useState(false)
  const [history, setHistory] = useState<{ d1: number; d2: number; total: number }[]>([])

  function roll() {
    setRolling(true)
    let count = 0
    const interval = setInterval(() => {
      setDie1(Math.ceil(Math.random() * 6))
      setDie2(Math.ceil(Math.random() * 6))
      count++
      if (count > 10) {
        clearInterval(interval)
        const final1 = Math.ceil(Math.random() * 6)
        const final2 = Math.ceil(Math.random() * 6)
        setDie1(final1)
        setDie2(final2)
        setHistory(prev => [{ d1: final1, d2: final2, total: final1 + final2 }, ...prev.slice(0, 4)])
        setRolling(false)
      }
    }, 80)
  }

  const total = (die1 || 0) + (die2 || 0)
  const rule = total > 0 ? (DICE_RULES[die1 === die2 ? 6 : Math.min(6, total > 6 ? (total - 6) : total)] || 'Próbálj újra!') : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-900 to-teal-950 text-white px-4 pt-12 pb-8 flex flex-col">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-emerald-300 mb-6 self-start">
        <ArrowLeft className="w-5 h-5" /> Vissza
      </button>

      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="text-6xl mb-2">🎲</div>
        <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>Kocka játék</h1>
        <p className="text-emerald-400 text-sm mb-10">Dobd meg és lásd, ki iszik!</p>

        {/* Dice display */}
        <div className="flex gap-6 mb-8">
          {[die1, die2].map((d, i) => (
            <div
              key={i}
              className={`w-24 h-24 bg-white rounded-3xl flex items-center justify-center text-6xl shadow-2xl transition-transform ${rolling ? 'animate-spin' : 'scale-100'}`}
              style={{ animationDuration: '0.15s' }}
            >
              {d !== null ? DICE_FACES[d - 1] : '🎲'}
            </div>
          ))}
        </div>

        {/* Result */}
        {die1 !== null && die2 !== null && !rolling && (
          <div className="bg-emerald-800/50 rounded-2xl px-8 py-5 mb-8 max-w-xs">
            <div className="text-4xl font-bold text-emerald-300 mb-1">{total}</div>
            {die1 === die2 && <div className="text-yellow-400 text-sm font-bold mb-2">🎉 DUPLA! Különleges szabály!</div>}
            <p className="text-white font-semibold text-lg">{die1 === die2 ? DICE_RULES[6] : rule}</p>
          </div>
        )}

        <button
          onClick={roll}
          disabled={rolling}
          className="w-full max-w-xs bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-5 rounded-2xl text-xl transition-colors disabled:opacity-50 shadow-lg shadow-emerald-500/30 mb-8"
        >
          {rolling ? '🎲 Gurítás...' : '🎲 Dobás!'}
        </button>

        {/* Rules */}
        <div className="w-full max-w-xs bg-emerald-900/40 rounded-2xl p-4">
          <h3 className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">Szabályok</h3>
          <div className="space-y-1.5">
            {Object.entries(DICE_RULES).map(([sum, rule]) => (
              <div key={sum} className="flex items-center gap-3 text-sm">
                <span className="text-emerald-400 font-bold w-4 text-right">{sum}</span>
                <span className="text-emerald-200/70">{rule}</span>
              </div>
            ))}
          </div>
          <p className="text-emerald-500 text-xs mt-3">* Dupla esetén: Mindenki iszik duplán!</p>
        </div>
      </div>
    </div>
  )
}
