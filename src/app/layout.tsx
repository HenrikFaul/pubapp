import type { Metadata, Viewport } from 'next'
import './globals.css'
import AppShellProviders from '@/components/AppShellProviders'

export const metadata: Metadata = {
  title: 'Kapakka — Rendelj okosan, várj kevesebbet',
  description: 'QR-kódos rendelés, kocsmakvíz, hűségpontok a legjobb vendéglátóhelyeken.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Kapakka' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1C0A00',
}

const themeBootScript = `
(function(){
  try {
    var key = localStorage.getItem('kapakka:theme') || 'taproom-classic';
    document.documentElement.dataset.theme = key;
    if (document.body) document.body.dataset.theme = key;
  } catch (e) {
    document.documentElement.dataset.theme = 'taproom-classic';
  }
})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu" data-theme="taproom-classic">
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
