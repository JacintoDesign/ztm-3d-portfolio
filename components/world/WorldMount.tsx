'use client'

import dynamic from 'next/dynamic'

/**
 * The Canvas never server-renders.
 *
 * three throws on `window` during SSR and the stack trace points nowhere near the
 * cause, so this boundary is load-bearing rather than an optimisation. Next 16 only
 * permits `ssr: false` inside a Client Component, and marking app/page.tsx `'use client'`
 * would forfeit its `metadata` export — hence this wrapper, which exists to hold that
 * one flag and nothing else.
 *
 * It also gets §15's engine chunk for free: everything reachable only through this
 * import lands in its own async chunk and caches independently of application code.
 * That is why there is no splitChunks config in next.config.ts.
 */
const World = dynamic(() => import('./World'), { ssr: false })

export default function WorldMount() {
  return <World />
}
