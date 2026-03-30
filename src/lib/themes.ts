export type KapakkaThemeKey = 'taproom-classic' | 'neon-arcade' | 'botanical-brew' | 'midnight-reserve'

export interface KapakkaThemeOption {
  key: KapakkaThemeKey
  name: string
  shortDescription: string
  venueFit: string
  accent: string
  accentStrong: string
  accentText: string
  customerBackground: string
  adminSurface: string
}

export const DEFAULT_THEME_KEY: KapakkaThemeKey = 'taproom-classic'
export const STORAGE_THEME_KEY = 'kapakka:theme'

export const KAPAKKA_THEMES: KapakkaThemeOption[] = [
  {
    key: 'taproom-classic',
    name: 'Taproom Classic',
    shortDescription: 'Meleg pub / söröző hangulat, legerősebb általános alap skin.',
    venueFit: 'klasszikus söröző, romkocsma, pub food',
    accent: '#F2A93B',
    accentStrong: '#D98B18',
    accentText: '#1B1207',
    customerBackground: 'linear-gradient(135deg, #201109 0%, #3A1C0B 48%, #170C07 100%)',
    adminSurface: '#FBF5EE',
  },
  {
    key: 'neon-arcade',
    name: 'Neon Arcade',
    shortDescription: 'Játékos, fiatalos, erős közösségi és gamification fókusz.',
    venueFit: 'játékbár, event venue, fiatal közönség',
    accent: '#8B5CF6',
    accentStrong: '#6D3EF0',
    accentText: '#F8F7FF',
    customerBackground: 'linear-gradient(135deg, #0A0F1F 0%, #151338 44%, #08121F 100%)',
    adminSurface: '#121522',
  },
  {
    key: 'botanical-brew',
    name: 'Botanical Brew',
    shortDescription: 'Friss, természetes, gastro és teraszos helyekhez passzol.',
    venueFit: 'kerthelyiség, brunch bár, gastro pub',
    accent: '#5E9F57',
    accentStrong: '#447C41',
    accentText: '#F5FFF3',
    customerBackground: 'linear-gradient(135deg, #0F2218 0%, #1C3527 48%, #0D1A12 100%)',
    adminSurface: '#F4F3EA',
  },
  {
    key: 'midnight-reserve',
    name: 'Midnight Reserve',
    shortDescription: 'Fekete-arany prémium esti bár hangulat.',
    venueFit: 'cocktail bár, lounge, upscale esti venue',
    accent: '#D4AF4E',
    accentStrong: '#B38B26',
    accentText: '#17120A',
    customerBackground: 'linear-gradient(135deg, #050608 0%, #10141D 52%, #050608 100%)',
    adminSurface: '#F1ECE3',
  },
]

export function isKapakkaThemeKey(value: string | null | undefined): value is KapakkaThemeKey {
  return KAPAKKA_THEMES.some(theme => theme.key === value)
}

export function getKapakkaTheme(key: string | null | undefined): KapakkaThemeOption {
  return KAPAKKA_THEMES.find(theme => theme.key === key) || KAPAKKA_THEMES[0]
}
