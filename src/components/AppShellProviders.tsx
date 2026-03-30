'use client'

import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { DEFAULT_THEME_KEY, isKapakkaThemeKey, STORAGE_THEME_KEY } from '@/lib/themes'

function applyTheme(themeKey: string) {
  if (typeof document === 'undefined') return
  const safeTheme = isKapakkaThemeKey(themeKey) ? themeKey : DEFAULT_THEME_KEY
  document.documentElement.dataset.theme = safeTheme
  document.body.dataset.theme = safeTheme
  try {
    localStorage.setItem(STORAGE_THEME_KEY, safeTheme)
  } catch {}
}

export function broadcastThemeChange(themeKey: string) {
  const safeTheme = isKapakkaThemeKey(themeKey) ? themeKey : DEFAULT_THEME_KEY
  applyTheme(safeTheme)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('kapakka-theme-change', { detail: safeTheme }))
  }
}

export default function AppShellProviders() {
  useEffect(() => {
    const localTheme = (() => {
      try {
        return localStorage.getItem(STORAGE_THEME_KEY)
      } catch {
        return null
      }
    })()

    applyTheme(localTheme || DEFAULT_THEME_KEY)

    let cancelled = false

    async function syncThemeFromBackend() {
      const { data } = await supabase
        .from('app_settings')
        .select('theme_key')
        .eq('id', 'global')
        .maybeSingle()

      if (cancelled) return
      if (data?.theme_key && isKapakkaThemeKey(data.theme_key)) {
        applyTheme(data.theme_key)
      }
    }

    syncThemeFromBackend().catch(() => {
      // Fallback is localStorage/default theme.
    })

    const onCustomThemeChange = (event: Event) => {
      const custom = event as CustomEvent<string>
      applyTheme(custom.detail)
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_THEME_KEY && event.newValue) {
        applyTheme(event.newValue)
      }
    }

    window.addEventListener('kapakka-theme-change', onCustomThemeChange as EventListener)
    window.addEventListener('storage', onStorage)

    return () => {
      cancelled = true
      window.removeEventListener('kapakka-theme-change', onCustomThemeChange as EventListener)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: '14px',
            background: 'var(--admin-surface)',
            color: 'var(--admin-text)',
            border: '1px solid var(--admin-border)',
          },
        }}
      />
    </>
  )
}
