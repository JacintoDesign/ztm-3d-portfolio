import type { MetadataRoute } from 'next'
import { PALETTE } from '@/lib/world'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Jacinto Design - 3D Portfolio',
    short_name: 'Jacinto Design',
    icons: [
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    theme_color: PALETTE.void,
    background_color: PALETTE.void,
    display: 'standalone',
  }
}
