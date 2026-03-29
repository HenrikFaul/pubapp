import type { Metadata, Viewport } from 'next'
import './globals.css'

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  )
}
