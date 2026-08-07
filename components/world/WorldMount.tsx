'use client'

import dynamic from 'next/dynamic'
import Gate from '@/components/ui/Gate'
import MuteToggle from '@/components/ui/MuteToggle'
import type { About } from '@/lib/about'
import type { Contact } from '@/lib/contact'
import type { Project } from '@/lib/projects'

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

/**
 * All three payloads pass straight through; this wrapper still holds one flag and no logic.
 *
 * **§14.1's gate mounts here, deliberately outside the boundary above.** It is the panel that
 * covers the engine chunk's download, so it has to be on screen while that download is
 * happening — rendered inside `World` it would arrive with the thing it was covering for. This
 * is the whole reason the gate is not one more file under `components/ui` mounted by `World`
 * alongside the nav and the overlays.
 *
 * **§14.2's mute toggle mounts here for the same reason.** It has to be visible before the
 * gate is dismissed — a visitor decides whether to unmute before the button that starts
 * making sound, not after — and a `z-[65]` panel rendered *inside* `World` would still be
 * waiting on the engine chunk the gate is covering for.
 */
export default function WorldMount({
  projects,
  about,
  contact,
}: {
  projects: readonly Project[]
  about: About
  contact: Contact
}) {
  return (
    <>
      <World projects={projects} about={about} contact={contact} />
      <Gate />
      <MuteToggle />
    </>
  )
}
