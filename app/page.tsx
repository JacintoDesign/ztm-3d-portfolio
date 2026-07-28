import WorldMount from '@/components/world/WorldMount'

/**
 * Stays a Server Component so `metadata` in layout.tsx keeps working. The `ssr: false`
 * flag the Canvas needs cannot live here — see WorldMount.
 */
export default function Page() {
  return <WorldMount />
}
