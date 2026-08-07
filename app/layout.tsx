import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { GATE, PALETTE } from '@/lib/world'
import './globals.css'

export const metadata: Metadata = {
  title: 'Jacinto Design - 3D Portfolio',
  description: GATE.vibeLine,
  openGraph: {
    title: 'Jacinto Design - 3D Portfolio',
    description: GATE.vibeLine,
    type: 'website',
    siteName: 'Jacinto Design - 3D Portfolio',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jacinto Design - 3D Portfolio',
    description: GATE.vibeLine,
  },
}

export const viewport: Viewport = {
  themeColor: PALETTE.void,
  width: 'device-width',
  initialScale: 1,
  // Pinch-zoom is deliberately left enabled. It does contest the look gesture, but the
  // canvas takes its own gestures via `touch-action: none`, and disabling zoom outright
  // would cost low-vision visitors the overlays — §13's rule is that everything stays
  // reachable, and that is not limited to reduced motion.
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: PALETTE.void }}>{children}</body>
    </html>
  )
}
