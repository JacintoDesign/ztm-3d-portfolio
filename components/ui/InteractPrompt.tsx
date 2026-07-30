'use client'

import { useInRangeStation } from '@/lib/stations'
import { useMode } from '@/lib/store'
import { INTERACT } from '@/lib/world'

/**
 * §12.5 — the interact prompt, and §2.1.1's way out of the locked view.
 *
 * 2D overlay, so it is a sibling of the `<Canvas>` rather than a child, for `TouchStick`'s
 * reason: a pointerdown here never reaches the canvas's look listener.
 *
 * **Two states in one component, because they are one affordance.** In range it says how to
 * open; locked it says how to leave. Splitting them would put two absolutely-positioned
 * overlays in the same corner of the screen and make the case where both are momentarily
 * true somebody's bug.
 *
 * **The close control is not decoration — it is the only way out on a phone.** §12.3's
 * on-screen stick is gated on `canControl()`, so in `'locked'` mode the stick is dead and
 * `setStick` never fires; a touch visitor has no keyboard for `Escape` and no movement input
 * to release with. Without this button the lock is a trap, and it is a trap on exactly the
 * device §17's last line is about.
 *
 * The 180 ms fade is a CSS transition rather than a JS interpolation. Nothing here runs per
 * frame: `useInRangeStation` re-renders on entering range, leaving it, or swapping stations,
 * which is a few times a session.
 */
export default function InteractPrompt() {
  const mode = useMode()
  const station = useInRangeStation()
  const locked = mode === 'locked'

  /* Rendered always and faded, rather than mounted and unmounted — a transition needs both
     ends of itself to exist, and mounting straight into the visible state skips it. */
  const visible = locked || station !== null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2.25rem)',
        opacity: visible ? 1 : 0,
        transition: `opacity ${INTERACT.promptFadeMs}ms ease-out`,
      }}
    >
      <p className="rounded-full border border-white/15 bg-black/45 px-4 py-2 text-sm tracking-wide text-white/75 backdrop-blur-sm">
        {station?.prompt ?? ''}
      </p>
    </div>
  )
}
