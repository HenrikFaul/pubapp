'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, MapPin, Search, X } from 'lucide-react'
import { searchPlaces, type ExternalPlace } from '@/lib/place-search'

interface PlaceAutocompleteProps {
  placeholder?: string
  category?: string
  openNow?: boolean
  radiusKm?: number
  latitude?: number
  longitude?: number
  value?: string
  onChange?: (value: string) => void
  onSubmit?: (query: string) => void
  onSelect: (place: ExternalPlace) => void
}

export default function PlaceAutocomplete({
  placeholder = 'Hely keresése…',
  category,
  openNow,
  radiusKm,
  latitude,
  longitude,
  value,
  onChange,
  onSubmit,
  onSelect,
}: PlaceAutocompleteProps) {
  const [internalQuery, setInternalQuery] = useState(value ?? '')
  const [results, setResults] = useState<ExternalPlace[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const query = typeof value === 'string' ? value : internalQuery
  const canSearch = useMemo(() => query.trim().length >= 2, [query])

  function updateQuery(nextValue: string) {
    if (typeof value !== 'string') {
      setInternalQuery(nextValue)
    }
    onChange?.(nextValue)
  }

  useEffect(() => {
    if (typeof value === 'string') {
      setInternalQuery(value)
    }
  }, [value])

  useEffect(() => {
    if (!canSearch) {
      setResults([])
      return
    }

    const timer = window.setTimeout(async () => {
      setLoading(true)
      const data = await searchPlaces({
        query,
        category,
        openNow,
        radiusKm,
        latitude,
        longitude,
        limit: 8,
      })
      setResults(data)
      setOpen(true)
      setLoading(false)
    }, 280)

    return () => window.clearTimeout(timer)
  }, [canSearch, query, category, openNow, radiusKm, latitude, longitude])

  return (
    <div className="relative">
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
          <Search className="h-4 w-4" />
        </span>
        <input
          value={query}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => updateQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && query.trim().length >= 2) {
              event.preventDefault()
              onSubmit?.(query.trim())
            }
          }}
          placeholder={placeholder}
          className="kap-input pl-11 pr-12"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              updateQuery('')
              setResults([])
              setOpen(false)
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/5 p-1 text-white/40 transition hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (query.trim() || loading) && (
        <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(11,16,26,0.96)] shadow-2xl backdrop-blur-xl">
          {loading ? (
            <div className="px-4 py-4 text-sm text-white/50">Keresés folyamatban…</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-4 text-sm text-white/50">Nincs találat a keresésre.</div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {results.map((place) => (
                <button
                  key={`${place.provider}-${place.external_id}`}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onSelect(place)
                    updateQuery(place.name)
                    setOpen(false)
                  }}
                  className="flex w-full items-start gap-3 border-b border-white/5 px-4 py-3 text-left transition hover:bg-white/5"
                >
                  <div className="mt-1 rounded-2xl border border-white/10 bg-white/5 p-2 text-white/70">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{place.name}</p>
                    <p className="truncate text-xs text-white/45">{place.address || place.category || place.provider}</p>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-white/25" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
