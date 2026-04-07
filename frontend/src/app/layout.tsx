import type { Metadata, Viewport } from 'next'
import { MascotOverlay } from '@/components/mascot-overlay'
import { ThemeHydrator } from '@/components/theme-hydrator'
import './globals.css'

export const metadata: Metadata = {
  title: 'Progyx',
  description: 'Progyx — обучающая платформа для школьников по программированию',
  icons: {
    icon: '/progyx-logo.png',
    shortcut: '/progyx-logo.png',
    apple: '/progyx-logo.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" data-theme="light">
      <body>
        <ThemeHydrator />
        <MascotOverlay />
        {children}
      </body>
    </html>
  )
}
