'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { QuizQuestion } from '@/types'
import { ArrowLeft, Trophy, RefreshCw, CheckCircle, XCircle } from 'lucide-react'

type GameState = 'intro' | 'playing' | 'answer' | 'done'

export default function QuizPage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [state, setState] = useState<GameState>('intro')
  const [playerName, setPlayerName] = useState('')
  const [timeLeft, setTimeLeft] = useState(20)

  const fetchQuestions = useCallback(async () => {
    const { data } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('language', 'hu')
      .limit(10)
    // Shuffle
    const shuffled = (data || []).sort(() => Math.random() - 0.5)
    setQuestions(shuffled)
  }, [])

  useEffect(() => {
    fetchQuestions()
  }, [fetchQuestions])

  useEffect(() => {
    if (state !== 'playing') return
    if (timeLeft <= 0) {
      handleAnswer(-1)
      return
    }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(timer)
  }, [state, timeLeft])

  function startGame() {
    setState('playing')
    setCurrentIdx(0)
    setScore(0)
    setSelected(null)
    setTimeLeft(20)
  }

  function handleAnswer(optionIdx: number) {
    setSelected(optionIdx)
    setState('answer')
    if (optionIdx === questions[currentIdx]?.correct_answer) {
      setScore(s => s + (timeLeft > 10 ? 2 : 1))
    }
  }

  function nextQuestion() {
    if (currentIdx + 1 >= questions.length) {
      saveScore()
      setState('done')
    } else {
      setCurrentIdx(i => i + 1)
      setSelected(null)
      setState('playing')
      setTimeLeft(20)
    }
  }

  async function saveScore() {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('quiz_sessions').insert({
      player_id: user?.id,
      player_name: playerName || user?.email || 'Anonim',
      score,
      questions_answered: questions.length,
      completed: true,
    })
  }

  const q = questions[currentIdx]
  const totalQ = questions.length

  if (state === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-purple-950 text-white px-4 pt-12 pb-8 flex flex-col">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-purple-300 mb-8">
          <ArrowLeft className="w-5 h-5" /> Vissza
        </button>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="text-8xl mb-6">🧠</div>
          <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>Kocsmakvíz</h1>
          <p className="text-purple-300 text-base mb-8 max-w-xs">
            {totalQ} kérdés vár rád. Minél gyorsabban válaszolsz, annál több pont jár!
          </p>
          <div className="w-full max-w-xs mb-6">
            <input
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="Beceneved (opcionális)"
              className="w-full bg-purple-800/50 border border-purple-600 text-purple-100 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 placeholder:text-purple-500 text-center"
            />
          </div>
          <div className="flex gap-3 w-full max-w-xs mb-4">
            {[
              { label: '⏱ 20mp / kérdés', color: 'bg-purple-800/40' },
              { label: '🏆 Pontozás', color: 'bg-purple-800/40' },
              { label: '❓ Általános', color: 'bg-purple-800/40' },
            ].map(pill => (
              <div key={pill.label} className={`${pill.color} rounded-xl px-3 py-2 text-xs text-purple-200 flex-1 text-center`}>
                {pill.label}
              </div>
            ))}
          </div>
          <button
            onClick={startGame}
            disabled={questions.length === 0}
            className="w-full max-w-xs bg-purple-500 hover:bg-purple-400 text-white font-bold py-4 rounded-2xl transition-colors disabled:opacity-50 text-lg"
          >
            Játék indítása! 🚀
          </button>
        </div>
      </div>
    )
  }

  if (state === 'done') {
    const pct = Math.round((score / (totalQ * 2)) * 100)
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-purple-950 text-white px-4 pt-12 pb-8 flex flex-col items-center justify-center text-center">
        <Trophy className="w-20 h-20 text-yellow-400 mb-4" />
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>Vége!</h1>
        <p className="text-purple-300 mb-6">
          {pct >= 70 ? '🔥 Elképesztő teljesítmény!' : pct >= 40 ? '👍 Jól csináltad!' : '💪 Legközelebb jobban megy!'}
        </p>
        <div className="bg-purple-800/50 rounded-2xl p-8 mb-8 w-full max-w-xs">
          <p className="text-purple-300 text-sm mb-1">Pontszámod</p>
          <p className="text-5xl font-bold text-yellow-400">{score}</p>
          <p className="text-purple-400 text-sm mt-2">max. {totalQ * 2} pontból</p>
        </div>
        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={() => { startGame(); fetchQuestions() }}
            className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Újra
          </button>
          <button
            onClick={() => router.back()}
            className="flex-1 bg-purple-800/50 text-purple-300 font-bold py-3 rounded-xl"
          >
            Kilépés
          </button>
        </div>
      </div>
    )
  }

  if (!q) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-purple-950 text-white px-4 pt-12 pb-8 flex flex-col">
      {/* Progress */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-purple-300 text-sm">{currentIdx + 1}/{totalQ}</span>
          <div className="w-32 h-1.5 bg-purple-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-400 rounded-full transition-all"
              style={{ width: `${((currentIdx + 1) / totalQ) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <span className="font-bold text-yellow-400">{score}</span>
        </div>
      </div>

      {/* Timer */}
      {state === 'playing' && (
        <div className="flex items-center justify-center mb-6">
          <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center font-bold text-xl transition-colors ${
            timeLeft > 10 ? 'border-green-400 text-green-300' :
            timeLeft > 5 ? 'border-yellow-400 text-yellow-300' :
            'border-red-400 text-red-300 animate-pulse'
          }`}>
            {timeLeft}
          </div>
        </div>
      )}

      {/* Question */}
      <div className="bg-purple-800/40 rounded-2xl p-5 mb-6">
        <p className="text-xs text-purple-400 uppercase tracking-wider mb-2">{q.category} · {q.difficulty}</p>
        <p className="text-lg font-semibold text-white leading-snug">{q.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-3 flex-1">
        {q.options.map((option, i) => {
          let btnClass = 'bg-purple-800/50 border border-purple-700/50 text-white'
          if (state === 'answer') {
            if (i === q.correct_answer) btnClass = 'bg-green-600 border-green-500 text-white'
            else if (i === selected) btnClass = 'bg-red-600 border-red-500 text-white'
            else btnClass = 'bg-purple-900/30 border-purple-800/30 text-purple-400'
          }

          return (
            <button
              key={i}
              onClick={() => state === 'playing' && handleAnswer(i)}
              disabled={state === 'answer'}
              className={`w-full ${btnClass} rounded-xl px-4 py-4 text-left font-medium flex items-center justify-between transition-all`}
            >
              <span>{['A', 'B', 'C', 'D'][i]}. {option}</span>
              {state === 'answer' && i === q.correct_answer && <CheckCircle className="w-5 h-5 text-white" />}
              {state === 'answer' && i === selected && i !== q.correct_answer && <XCircle className="w-5 h-5 text-white" />}
            </button>
          )
        })}
      </div>

      {/* Next button */}
      {state === 'answer' && (
        <button
          onClick={nextQuestion}
          className="mt-6 w-full bg-purple-500 hover:bg-purple-400 text-white font-bold py-4 rounded-2xl transition-colors"
        >
          {currentIdx + 1 >= totalQ ? 'Eredmény megtekintése 🏆' : 'Következő kérdés →'}
        </button>
      )}
    </div>
  )
}
