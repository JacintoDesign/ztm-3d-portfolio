'use client'

import { type CSSProperties, useEffect, useState } from 'react'

import { unlock } from '@/lib/audio'
import { startEntrySweep } from '@/lib/entrySweep'
import { markReadyTimeout, useGate } from '@/lib/gate'
import { startRainBed } from '@/lib/rainBed'
import { usePrefersReducedMotion } from '@/lib/reducedMotion'
import { setMode } from '@/lib/store'
import { GATE, PALETTE, WORDMARK } from '@/lib/world'

/** The same two words §12.7's corner carries. Two treatments of one name is two studios. */
const [MARK_FIRST, MARK_SECOND] = WORDMARK
const [KICKER_LINE_1, KICKER_LINE_2] = GATE.kickerLines

/**
 * §14.1 — the entry gate.
 *
 * **It is a sibling of the dynamic boundary, not a child of it.** §15's engine chunk exists
 * because `World` is imported through `next/dynamic({ ssr: false })`, and 1.6 MB of `three`
 * and R3F is the wait this panel is here to cover. Rendered *inside* that boundary it would
 * arrive with the thing it was covering for and cover nothing. So it mounts from
 * `WorldMount.tsx`, in the first paint, while the chunk is still on the wire.
 *
 * **Five lines and one button**, in reading order, each fading in after the one before it:
 * the two-part line that explains why the world looks like this, the name of whose it is —
 * itself two words, two beats — and the way in.
 */

/** §13 — a duration of zero, applied in both the places that animate. */
const instant = (ms: number, reduced: boolean): number => (reduced ? 0 : ms)

/**
 * §14.1 — one line's turn in the five-line reveal.
 *
 * **§13 disables the animation outright rather than shortening it to zero.** A zero-duration
 * `gate-reveal` still runs — `from` and `to` collapse to the same instant, but the *rise* is
 * still there for one frame under some browsers' animation timing, which is a flicker rather
 * than a cut. `animation: 'none'` with `opacity: 1` has no such edge: the line is simply there.
 */
function revealStyle(index: number, reduced: boolean): CSSProperties {
  if (reduced) return { opacity: 1 }
  return {
    opacity: 0,
    animation: `gate-reveal ${GATE.reveal.riseDurationMs}ms ease-out ${GATE.reveal.delayMs[index]}ms both`,
    ['--gate-reveal-rise' as string]: `${GATE.reveal.risePx}px`,
  }
}

/**
 * §14.1 — the button's own reveal. `gate-fade` carries no `transform`, so there is no rise to
 * hold `--gate-reveal-rise` for — a fade-only keyframe rather than the shared one at zero rise,
 * because a `0px` rise is still a `translateY` some browsers repaint for on the same frame the
 * animation resolves.
 */
function buttonRevealStyle(reduced: boolean): CSSProperties {
  if (reduced) return { opacity: 1 }
  return {
    opacity: 0,
    animation: `gate-fade ${GATE.reveal.buttonFadeMs}ms ease-out ${GATE.reveal.delayMs[4]}ms both`,
  }
}

export default function Gate() {
  const { ready } = useGate()
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
   * **The order of these five is the whole of §14.2's autoplay rule, plus two.**
   *
   * `unlock()` is the *first statement*, synchronous, inside the handler. A browser grants a
   * running `AudioContext` only to a real gesture, and the gesture's permission is spent by
   * the time a promise callback or an effect runs — so a context created anywhere after this
   * line starts `suspended`, silently, and cannot resume itself.
   *
   * `startRainBed` is the *second* statement, for the same reason. It builds and starts a
   * `BufferSourceNode` on the context `unlock()` just returned, and a source node started
   * from a later effect or timer is a second thing asking a context for permission it was
   * only ever granted once, in this handler, by this gesture.
   *
   * Then the mode, which is what takes §12's controls live: `canControl()` has been false
   * since the module loaded and this is the first thing in the world that moves it.
   *
   * Then §14.1's entry sweep — skipped outright under reduced motion, not shortened to zero,
   * for the same reason `revealStyle` skips its own animation rather than running it at 0 ms:
   * a sweep of no duration is still one JS-driven write competing with the frame that should
   * simply already be at rest.
   *
   * Then the fade, which is only appearance.
   */
  function enter(): void {
    const context = unlock()
    if (context !== null) startRainBed(context)
    setMode('play')
    if (!reduced) startEntrySweep(performance.now())
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
      {/**
       * §14.1 — two elements, not one, on every device. The reveal below fades each in on
       * its own beat, which a single string cannot do. `sm:inline` lets them flow onto what
       * usually reads as one sentence; below that they stack, forced onto their own lines
       * rather than left to wrap wherever 375 px happens to break them.
       */}
      <p className="flex max-w-[22rem] flex-col items-center gap-1 text-xs leading-relaxed tracking-[0.18em] text-white/45 uppercase sm:block sm:max-w-[38rem] sm:text-sm sm:tracking-[0.22em]">
        <span className="sm:inline" style={revealStyle(0, reduced)}>
          {KICKER_LINE_1}
        </span>{' '}
        <span className="sm:inline" style={revealStyle(1, reduced)}>
          {KICKER_LINE_2}
        </span>
      </p>

      {/* §3.6's own pairing, and the same two words the corner wordmark carries — this is
          where a visitor meets the name, and meeting it twice in two different treatments
          would be two studios. */}
      <h1 className="mt-5 text-3xl tracking-[0.16em] uppercase sm:mt-6 sm:text-5xl sm:tracking-[0.2em]">
        <span style={{ color: PALETTE.neonMagenta, ...revealStyle(2, reduced) }}>{MARK_FIRST}</span>{' '}
        <span style={{ color: PALETTE.neonCyan, ...revealStyle(3, reduced) }}>{MARK_SECOND}</span>
      </h1>

      <button
        type="button"
        onClick={enter}
        disabled={!ready}
        /* `cursor-pointer` is explicit rather than assumed: Tailwind's preflight resets a
           `<button>` to `cursor: default`, which is correct for a button that submits a
           form and wrong for the one button on this screen, whose entire job is to be
           pressed. `disabled:cursor-not-allowed` already covers the other state. */
        className="mt-10 cursor-pointer rounded-full px-10 py-3 text-sm tracking-[0.3em] uppercase transition-opacity disabled:cursor-not-allowed sm:mt-12"
        style={{
          background: ready ? PALETTE.neonMagenta : 'transparent',
          color: ready ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
          border: ready ? '1px solid transparent' : '1px solid rgba(255,255,255,0.15)',
          /* The same 320 ms the panel leaves on — the button lighting up and the panel
             going are one gesture's worth of motion, not two durations. */
          transition: `background ${instant(GATE.fadeOutMs, reduced)}ms ease-out, color ${instant(GATE.fadeOutMs, reduced)}ms ease-out`,
          ...buttonRevealStyle(reduced),
        }}
      >
        {GATE.button}
      </button>
    </div>
  )
}
