import type { NextConfig } from 'next'

/**
 * §15 asks for the engine (three + @react-three/*) to land in its own chunk so it
 * caches independently of application code.
 *
 * There is deliberately no splitChunks configuration here. The split already comes
 * from the `next/dynamic({ ssr: false })` boundary in components/world/WorldMount.tsx
 * — everything reachable only through that import lands in its own async chunk. Next 16
 * builds with Turbopack, which does not expose webpack's splitChunks anyway, so a
 * hand-written cacheGroups block would be config that silently does nothing.
 *
 * The chunk size is checked against the §15 600 kB gzip budget at build time, not
 * asserted here.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
}

export default nextConfig
