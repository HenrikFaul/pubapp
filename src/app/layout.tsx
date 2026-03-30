import type { Metadata, Viewport } from 'next'
import './globals.css'
import AppShellProviders from '@/components/AppShellProviders'
import { DEFAULT_THEME_KEY } from '@/lib/themes'

export const metadata: Metadata = {
  title: 'Kapakka — cool venue discovery, rendelés és közösségi élmény',
  description:
    'Kapakka: QR rendelés, digitális étlap, közös helylisták, barát meghívás, foglalás és live order tracking fiatalos, reszponzív felületen.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Kapakka',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0b0f1c',
}

const themeBootScript = `
(function(){
  try {
    var key = localStorage.getItem('kapakka:theme') || '${DEFAULT_THEME_KEY}';
    document.documentElement.dataset.theme = key;
    if (document.body) document.body.dataset.theme = key;
  } catch (error) {
    document.documentElement.dataset.theme = '${DEFAULT_THEME_KEY}';
  }
})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu" data-theme={DEFAULT_THEME_KEY}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <AppShellProviders />
        {children}
      </body>
    </html>
  )
}
