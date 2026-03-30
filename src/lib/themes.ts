export type KapakkaThemeKey =
  | 'taproom-classic'
  | 'neon-arcade'
  | 'botanical-brew'
  | 'midnight-reserve'
  | 'cosmic-pulse'

export interface KapakkaThemeDefinition {
  key: KapakkaThemeKey
  name: string
  tagline: string
  customerPreview: string
  adminPreview: string
}

export const DEFAULT_THEME_KEY: KapakkaThemeKey = 'cosmic-pulse'

export const KAPAKKA_THEMES: KapakkaThemeDefinition[] = [
  {
    key: 'cosmic-pulse',
    name: 'Cosmic Pulse',
    tagline: 'Ultrafiatal, neon nightlife, erősen mobil-first élmény.',
    customerPreview: 'Neon feed · gyors rendelés · társasági fókusz',
    adminPreview: 'Live ops · dark dashboard · premium control',
  },
  {
    key: 'taproom-classic',
    name: 'Taproom Classic',
    tagline: 'Modern craft beer hangulat letisztult navigációval.',
    customerPreview: 'Warm pub tones · könnyű étlapolvasás',
    adminPreview: 'Tiszta operációs nézet · gyors kezelhetőség',
  },
  {
    key: 'neon-arcade',
    name: 'Neon Arcade',
    tagline: 'Játékos, energikus, fiatal társaságokra optimalizált.',
    customerPreview: 'Arcade glow · játékok · közösségi CTA-k',
    adminPreview: 'Kontrasztos, teches, gyors monitorozás',
  },
  {
    key: 'botanical-brew',
    name: 'Botanical Brew',
    tagline: 'Friss, brunchos, gastro-pub karakter.',
    customerPreview: 'Organikus tónusok · food-forward élmény',
    adminPreview: 'Világos üzemeltetés · premium hospitality',
  },
  {
    key: 'midnight-reserve',
    name: 'Midnight Reserve',
    tagline: 'Elegáns black-gold esti bár arculat.',
    customerPreview: 'Lounge hangulat · upscale vizuál',
    adminPreview: 'Exkluzív esti venue irányítás',
  },
]

export function isKapakkaThemeKey(value: string | null | undefined): value is KapakkaThemeKey {
  return KAPAKKA_THEMES.some((theme) => theme.key === value)
}

export function getKapakkaTheme(themeKey: string | null | undefined): KapakkaThemeDefinition {
  if (isKapakkaThemeKey(themeKey || '')) {
    return KAPAKKA_THEMES.find((theme) => theme.key === themeKey) || KAPAKKA_THEMES[0]
  }
  return KAPAKKA_THEMES.find((theme) => theme.key === DEFAULT_THEME_KEY) || KAPAKKA_THEMES[0]
}
