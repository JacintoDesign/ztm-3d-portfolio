'use client'

import { useEffect, useState } from 'react'

import { unlock } from '@/lib/audio'
import { markReadyTimeout, useGate } from '@/lib/gate'
import { usePrefersReducedMotion } from '@/lib/reducedMotion'
import { setMode } from '@/lib/store'
import { GATE, PALETTE, WORDMARK } from '@/lib/world'

/** The same two words §12.7's corner carries. Two treatments of one name is two studios. */
const [MARK_FIRST, MARK_SECOND] = WORDMARK

/**
 * §14.1 — the entry gate.
 *
 * **It is a sibling of the dynamic boundary, not a child of it.** §15's engine chunk exists
 * because `World` is imported through `next/dynamic({ ssr: false })`, and 1.6 MB of `three`
 * and R3F is the wait this panel is here to cover. Rendered *inside* that boundary it would
 * arrive with the thing it was covering for and cover nothing. So it mounts from
 * `WorldMount.tsx`, in the first paint, while the chunk is still on the wire.
 *
 * **Three things and one button**, in reading order: the line that explains why the world
 * looks like this, the name of whose it is, and the way in.
 */

/** §13 — a duration of zero, applied in both the places that animate. */
const instant = (ms: number, reduced: boolean): number => (reduced ? 0 : ms)

export default function Gate() {
  const { progress, ready } = useGate()
  const reduced = usePrefersReducedMotion()
  /**
   * `open` is the panel; `entered` is the visitor. They are two states because the panel
   * outlives the press by §14.1's fade — and during that fade the world is already live,
   * which is the point: the controls go with the button, not with the last frame of a
   * transition.
   */
  const [entered, setEntered] = useState(false)
  const [open, setOpen] = useState(true)

  /**
   * §14.1's escape hatch. **This is the one screen in the world that can trap someone** — no
   * WebGL, a context that failed to create, a driver that gave up, and the button never
   * enables with nothing on screen saying why.
   */
  useEffect(() => {
    if (ready) return
    const timer = window.setTimeout(markReadyTimeout, GATE.readyTimeoutMs)
    return () => window.clearTimeout(timer)
  }, [ready])

  /**
   * The panel leaves once the fade has run. **Only the fading path goes through here** — §13's
   * unmounts in `enter` itself, because a zero-length timer scheduling a `setState` from an
   * effect is a cascading render to say *now*, and *now* is available in the handler.
   */
  useEffect(() => {
    if (!entered) return
    const timer = window.setTimeout(() => setOpen(false), GATE.fadeOutMs)
    return () => window.clearTimeout(timer)
  }, [entered])

  if (!open) return null

  /**
   * **The order of these three is the whole of §14.2's autoplay rule.**
   *
   * `unlock()` is the *first statement*, synchronous, inside the handler. A browser grants a
   * running `AudioContext` only to a real gesture, and the gesture's permission is spent by
   * the time a promise callback or an effect runs — so a context created anywhere after this
   * line starts `suspended`, silently, and cannot resume itself.
   *
   * Then the mode, which is what takes §12's controls live: `canControl()` has been false
   * since the module loaded and this is the first thing in the world that moves it.
   *
   * Then the fade, which is only appearance.
   */
  function enter(): void {
    unlock()
    setMode('play')
    /* §13 — no fade. The panel goes now, and `entered` is never set, because there is no
       out-transition left for it to drive. */
    if (reduced) {
      setOpen(false)
      return
    }
    setEntered(true)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={GATE.title}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-6 text-center"
      style={{
        background: PALETTE[GATE.background],
        opacity: entered ? 0 : 1,
        transition: `opacity ${instant(GATE.fadeOutMs, reduced)}ms ease-out`,
        /* Once the press has landed the panel is a ghost on its way out — it must not eat the
           first click at the world underneath it. */
        pointerEvents: entered ? 'none' : 'auto',
      }}
    >
      {/* Wide enough for the sentence to hold one line from `sm` up — at 26rem it broke
          after *the last*, which turns a beat into a stumble. It still wraps on a phone,
          where two lines is what 375 px has. */}
      <p className="max-w-[22rem] text-xs leading-relaxed tracking-[0.18em] text-white/45 uppercase sm:max-w-[38rem] sm:text-sm sm:tracking-[0.22em]">
        {GATE.kicker}
      </p>

      {/* §3.6's own pairing, and the same two words the corner wordmark carries — this is
          where a visitor meets the name, and meeting it twice in two different treatments
          would be two studios. */}
      <h1 className="mt-5 text-3xl tracking-[0.16em] uppercase sm:mt-6 sm:text-5xl sm:tracking-[0.2em]">
        <span style={{ color: PALETTE.neonMagenta }}>{MARK_FIRST}</span>{' '}
        <span style={{ color: PALETTE.neonCyan }}>{MARK_SECOND}</span>
      </h1>

      <button
        type="button"
        onClick={enter}
        disabled={!ready}
        className="mt-10 rounded-full px-10 py-3 text-sm tracking-[0.3em] uppercase transition-opacity disabled:cursor-not-allowed sm:mt-12"
        style={{
          background: ready ? PALETTE.neonMagenta : 'transparent',
          color: ready ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
          border: ready ? '1px solid transparent' : '1px solid rgba(255,255,255,0.15)',
          /* The same 320 ms the panel leaves on — the button lighting up and the panel
             going are one gesture's worth of motion, not two durations. */
          transition: `background ${instant(GATE.fadeOutMs, reduced)}ms ease-out, color ${instant(GATE.fadeOutMs, reduced)}ms ease-out`,
        }}
      >
        {GATE.button}
      </button>

      {/**
       * §14.1 — a 1 px rule across the very bottom, filling left to right. Not a spinner.
       *
       * **It moves by milestone and never between them**, because neither thing it waits on
       * can be measured while it happens: a dynamic `import()` states no total, and the first
       * frame is shader compilation rather than bytes. The easing is what makes three floors
       * read as travel — and §13 takes it off, which loses nothing, since the floors were
       * always the information.
       */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/10">
        <div
          className="h-full"
          style={{
            width: `${progress * 100}%`,
            background: PALETTE.neonCyan,
            transition: `width ${instant(GATE.progress.easeMs, reduced)}ms ease-out`,
          }}
        />
      </div>
    </div>
  )
}
