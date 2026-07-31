'use client'

import { useHover } from '@/lib/hover'
import { useInRangeStation } from '@/lib/stations'
import { INTERACT } from '@/lib/world'

/**
 * §12.5 — the interact prompt.
 *
 * 2D overlay, so it is a sibling of the `<Canvas>` rather than a child, for `TouchStick`'s
 * reason: a pointerdown here never reaches the canvas's look listener.
 *
 * **It is a button, not a caption, and on a phone it is the only way in.** It said `E — About`
 * on a device with no `E`. §12.5 has always specified the prompt as *`E — …` / tap* — the tap
 * half was never built, so §12.6 could park a touch visitor in front of a station and tell
 * them to press a key they do not have. Pressing it does exactly what the key does, through
 * the same `station.open()`, so there is still one way for a station to be opened.
 *
 * The 180 ms fade is a CSS transition rather than a JS interpolation. Nothing here runs per
 * frame: `useInRangeStation` re-renders on entering range, leaving it, or swapping stations,
 * which is a few times a session.
 */
export default function InteractPrompt() {
  const station = useInRangeStation()
  const hover = useHover()

  /**
   * **Hover wins over range, because it is the more specific answer.**
   *
   * Standing at §2.3's bank you are in range of one station and looking at six things, each
   * of which opens somewhere else. `E — contact` is true and useless at that moment; `GitHub
   * — JacintoDesign` is what the visitor needs. Falling back to the station prompt the moment
   * the pointer leaves means the general answer is never *missing*, only ever deferred.
   */
  const text = hover !== null ? `${hover.label} — ${hover.hint}` : (station?.prompt ?? '')

  /**
   * Rendered always and faded, rather than mounted and unmounted — a transition needs both
   * ends of itself to exist, and mounting straight into the visible state skips it.
   *
   * **Visible when there is something to say, not when the mode says so.** It used to include
   * `locked`, from a draft where the locked state was going to carry its own *press Escape*
   * copy; that copy never landed and §2.1.2's close button took the job. What was left was a
   * condition that turned the pill on with nothing in it — invisible until §12.6's tour
   * started parking the visitor in `'locked'` at every stop, at which point every arrival
   * ended with **an empty black lozenge**. A prompt with no text is not a prompt.
   */
  const visible = text.length > 0

  /* Hovering a mailbox names it but is not itself the way to open one — the box under the
     pointer already is. So the pill is only pressable when it is speaking for a station. */
  const pressable = visible && hover === null && station !== null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-4"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2.25rem)',
        opacity: visible ? 1 : 0,
        transition: `opacity ${INTERACT.promptFadeMs}ms ease-out`,
      }}
    >
      <button
        type="button"
        /* Not focusable or announced while it is saying nothing — a hidden control that can
           still be tabbed to is a trap for exactly the visitors it is meant to help. */
        tabIndex={pressable ? 0 : -1}
        aria-hidden={!pressable}
        disabled={!pressable}
        onClick={() => station?.open()}
        className={
          pressable
            ? 'pointer-events-auto rounded-full border border-white/25 bg-black/60 px-4 py-2 text-sm tracking-wide text-white/85 backdrop-blur-sm transition-colors hover:border-white/40 hover:bg-black/75 hover:text-white'
            : 'pointer-events-none rounded-full border border-white/15 bg-black/45 px-4 py-2 text-sm tracking-wide text-white/75 backdrop-blur-sm'
        }
      >
        {text}
      </button>
    </div>
  )
}
