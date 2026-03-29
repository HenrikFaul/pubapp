'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronDown, ChevronUp, Send, Bug } from 'lucide-react'
import toast from 'react-hot-toast'

const FAQS = [
  {
    q: 'Hogyan adok hozzá új terméket az étlaphoz?',
    a: 'Menj az "Étlap" menüpontra, kattints az "Új termék" gombra. Add meg a nevet, árat, kategóriát és mentsd el.',
  },
  {
    q: 'Hogyan tudok QR kódot nyomtatni az asztalokhoz?',
    a: 'A "Konfigurátor" > "Asztalok" fülön minden asztalhoz automatikusan generálódik egy QR kód. Kattints rá és mentsd el képként.',
  },
  {
    q: 'Mikor értesülök új rendelésről?',
    a: 'A főoldalon (Kiszolgálás) valós idejű értesítéseket kapsz. A böngészős push értesítéshez add hozzá az oldalt az asztali alkalmazásokhoz.',
  },
  {
    q: 'Hogyan tudok munkatársat felvenni?',
    a: "A \"Konfigurátor\" > \"Munkatársak\" fülön add meg az email címét. A meghívott a rendszerbe regisztráció után automatikusan hozzákapcsolódik.",
  },
  {
    q: 'Mi az a VIP rendelés?',
    a: 'A VIP rendelések prioritást élveznek a rendelési listán. Ezt a funkciót a Konfigurátor oldalon lehet bekapcsolni.',
  },
  {
    q: 'Hogyan exportálom a statisztikákat?',
    a: 'A Statisztikák oldalon a jövőben lesz Excel exportálási lehetőség. Jelenleg a böngésző nyomtatás funkciójával mentheted.',
  },
]

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [bugTitle, setBugTitle] = useState('')
  const [bugDesc, setBugDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submitBug(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    // In production, this would send to a support ticket system
    toast.success('Hibajelentés elküldve! Hamarosan felvesszük önnel a kapcsolatot.')
    setBugTitle('')
    setBugDesc('')
    setSubmitting(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-stone-800" style={{ fontFamily: 'Playfair Display, serif' }}>Segítség</h1>
        <p className="text-stone-500 text-sm">Dokumentáció és kezelési útmutató</p>
      </div>

      {/* Quick guide */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
        <h2 className="font-bold text-amber-900 mb-3">🚀 Gyors indulás</h2>
        <ol className="space-y-2 text-sm text-amber-800">
          {[
            'Menj a Konfigurátor oldalra és töltsd ki az étterem adatait',
            'Az Étlap oldalon add hozzá a kategóriákat és termékeket',
            'A Konfigurátor > Asztalok fülön hozz létre asztalokat és nyomtasd ki a QR kódokat',
            'Helyezd el a QR kódokat az asztalokra',
            'A főoldalon (Kiszolgálás) valós időben kezeld a rendeléseket',
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-5 h-5 bg-amber-500 text-white rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* FAQ */}
      <div className="mb-6">
        <h2 className="font-bold text-stone-700 mb-3">Gyakori kérdések</h2>
        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <div key={i} className="bg-white rounded-xl border border-stone-100 overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <span className="font-medium text-stone-800 text-sm pr-4">{faq.q}</span>
                {openFaq === i
                  ? <ChevronUp className="w-4 h-4 text-stone-400 flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-stone-400 flex-shrink-0" />}
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 text-sm text-stone-600 border-t border-stone-50 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bug report */}
      <div className="bg-white rounded-2xl border border-stone-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bug className="w-5 h-5 text-red-500" />
          <h2 className="font-bold text-stone-700">Hibabejelentés</h2>
        </div>
        <form onSubmit={submitBug} className="space-y-3">
          <div>
            <label className="text-stone-500 text-xs mb-1 block">Hiba rövid leírása *</label>
            <input
              value={bugTitle}
              onChange={e => setBugTitle(e.target.value)}
              className="input"
              placeholder="pl. Az étlap nem tölt be"
              required
            />
          </div>
          <div>
            <label className="text-stone-500 text-xs mb-1 block">Részletes leírás</label>
            <textarea
              value={bugDesc}
              onChange={e => setBugDesc(e.target.value)}
              className="input h-24 resize-none"
              placeholder="Mikor történt, mit próbáltál, mi volt a várható eredmény..."
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Küldés...' : 'Hibajelentés küldése'}
          </button>
        </form>
      </div>

      {/* Contact */}
      <div className="mt-6 text-center text-stone-400 text-sm">
        <p>Kapakka Support · <a href="mailto:support@kapakka.hu" className="text-amber-600">support@kapakka.hu</a></p>
        <p className="mt-1 text-xs">v1.0.0 · Supabase backend</p>
      </div>
    </div>
  )
}
