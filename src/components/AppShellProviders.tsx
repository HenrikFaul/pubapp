'use client'

import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { DEFAULT_THEME_KEY, isKapakkaThemeKey, type KapakkaThemeKey } from '@/lib/themes'

const THEME_EVENT = 'kapakka-theme-change'
const STORAGE_KEY = 'kapakka:theme'

function applyTheme(themeKey: KapakkaThemeKey) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = themeKey
  if (document.body) {
    document.body.dataset.theme = themeKey
  }
}

export function broadcastThemeChange(themeKey: KapakkaThemeKey) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, themeKey)
  applyTheme(themeKey)
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: themeKey }))
}

export default function AppShellProviders() {
  useEffect(() => {
    let isMounted = true

    async function syncTheme() {
      const localValue = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
      if (isKapakkaThemeKey(localValue)) {
        applyTheme(localValue)
      } else {
        applyTheme(DEFAULT_THEME_KEY)
      }

      const { data, error } = await supabase.from('app_settings').select('theme_key').eq('id', 'global').maybeSingle()
      if (!isMounted || error) return

      const remoteTheme = data?.theme_key
      if (isKapakkaThemeKey(remoteTheme)) {
        localStorage.setItem(STORAGE_KEY, remoteTheme)
        applyTheme(remoteTheme)
      }
    }

    syncTheme()

    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<KapakkaThemeKey>
      const detail = customEvent.detail
      if (isKapakkaThemeKey(detail)) {
        applyTheme(detail)
      }
    }

    window.addEventListener(THEME_EVENT, handleThemeChange)

    return () => {
      isMounted = false
      window.removeEventListener(THEME_EVENT, handleThemeChange)
    }
  }, [])

  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3200,
        style: {
          borderRadius: '18px',
          background: 'rgba(18, 24, 38, 0.92)',
          color: '#f8fbff',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(14px)',
          boxShadow: '0 16px 42px rgba(0,0,0,0.28)',
        },
      }}
    />
  )
}
