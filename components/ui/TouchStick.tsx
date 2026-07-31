'use client'

import { useEffect, useRef } from 'react'
import { resolveTier } from '@/lib/device'
import { setStick } from '@/lib/input'
import { canControl, useCanControl } from '@/lib/store'
import { WALK } from '@/lib/world'

/**
 * §12.3 — the touch half of the movement input. A fixed pad, bottom-left, 128 px.
 *
 * 2D overlay: DOM and Tailwind, never inside the Canvas. It renders as a sibling of the
 * `<Canvas>`, which is also what makes the two-thumb case work — a pointerdown here never
 * reaches the canvas's look listener, so a left thumb can steer while a right thumb looks.
 *
 * It writes to `lib/input.ts` and nowhere else. The convergence with the keyboard happens
 * there, not here.
 */

const SIZE = WALK.stick.sizePx
const KNOB = 48
/** How far the knob may travel, and the same radius the input is normalised against —
 *  so the thumb reaching the ring edge is exactly input magnitude 1. */
const TRAVEL = (SIZE - KNOB) / 2

export default function TouchStick() {
  const padRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)

  /**
   * §15.1 — tier is resolved once and frozen, so this is a mount-time decision. A desktop
   * browser resized to phone width needs a reload to grow one, which is the documented
   * behaviour of the tier rule rather than a quirk of this component.
   */
  const isTouch = resolveTier() === 'mobile'

  /* The reactive form, because this decides what is *drawn*. The handlers keep the direct
     `canControl()` read — they run inside a gesture, not inside a render. */
  const walkable = useCanControl()

  useEffect(() => {
    const pad = padRef.current
    const knob = knobRef.current
    if (pad === null || knob === null) return

    let activePointerId: number | null = null
    let centreX = 0
    let centreY = 0

    function moveKnob(x: number, y: number): void {
      if (knob === null) return
      knob.style.transform = `translate3d(${x}px, ${y}px, 0)`
    }

    function reset(): void {
      activePointerId = null
      setStick(0, 0)
      moveKnob(0, 0)
    }

    function onPointerDown(event: PointerEvent): void {
      if (activePointerId !== null || pad === null) return
      if (!canControl()) return

      // The pad is fixed, so the origin is its centre rather than the touch point. Read
      // once per gesture: a getBoundingClientRect per pointermove is a layout read per
      // frame, on the device least able to afford one.
      const rect = pad.getBoundingClientRect()
      centreX = rect.left + rect.width / 2
      centreY = rect.top + rect.height / 2

      activePointerId = event.pointerId
      pad.setPointerCapture(event.pointerId)
      onPointerMove(event)
    }

    function onPointerMove(event: PointerEvent): void {
      if (event.pointerId !== activePointerId) return
      if (!canControl()) {
        reset()
        return
      }

      const dx = event.clientX - centreX
      const dy = event.clientY - centreY

      const distance = Math.hypot(dx, dy)
      const scale = distance > TRAVEL ? TRAVEL / distance : 1
      const clampedX = dx * scale
      const clampedY = dy * scale

      moveKnob(clampedX, clampedY)
      // Screen y grows downward and forward is +y in the intent vector, so it inverts.
      // The dead zone is applied in lib/input.ts, where the rest of the input semantics live.
      setStick(clampedX / TRAVEL, -clampedY / TRAVEL)
    }

    function release(event: PointerEvent): void {
      if (event.pointerId !== activePointerId) return
      reset()
    }

    pad.addEventListener('pointerdown', onPointerDown)
    pad.addEventListener('pointermove', onPointerMove)
    pad.addEventListener('pointerup', release)
    // `pointercancel` is the incoming call, `lostpointercapture` is the browser taking
    // the capture back. Missing either is how a stick stays pushed with no thumb on it.
    pad.addEventListener('pointercancel', release)
    pad.addEventListener('lostpointercapture', release)

    return () => {
      pad.removeEventListener('pointerdown', onPointerDown)
      pad.removeEventListener('pointermove', onPointerMove)
      pad.removeEventListener('pointerup', release)
      pad.removeEventListener('pointercancel', release)
      pad.removeEventListener('lostpointercapture', release)
      reset()
    }
  }, [])

  if (!isTouch) return null

  return (
    <div
      ref={padRef}
      /**
       * **Hidden whenever it cannot move the visitor.**
       *
       * Its handlers have always been gated on `canControl()`, so in `'locked'` and
       * `'overlay'` it was already inert — but it stayed on screen, and §2.1.2's project
       * controls sit in the same bottom-left corner. On a phone that put a dead 120 px disc
       * under the pager. **A control that is visible and does nothing is worse than one that
       * is gone**: it reads as the way out of a view whose actual way out is beside it.
       *
       * Faded rather than unmounted, so the pointer capture in the effect above is never torn
       * down mid-gesture, and `visibility` follows so it cannot be tapped through at zero
       * opacity.
       */
      // Everything this control does, the keyboard also does — and a thumb-driven
      // analogue stick is not operable by a screen reader. §12.7's nav is the reachable
      // path, so this stays out of the accessibility tree rather than pretending.
      aria-hidden="true"
      className="fixed z-10 flex touch-none select-none items-center justify-center rounded-full border border-white/15 bg-white/[0.04] backdrop-blur-[2px]"
      style={{
        width: SIZE,
        height: SIZE,
        // §12.3 — 24 px plus the safe area, so a notched phone does not put the home
        // indicator under the thumb.
        left: `calc(${WALK.stick.insetPx}px + env(safe-area-inset-left))`,
        bottom: `calc(${WALK.stick.insetPx}px + env(safe-area-inset-bottom))`,
        opacity: walkable ? 1 : 0,
        visibility: walkable ? 'visible' : 'hidden',
        transition: 'opacity 180ms ease-out',
      }}
    >
      <div
        ref={knobRef}
        className="pointer-events-none rounded-full border border-white/25 bg-white/10"
        style={{ width: KNOB, height: KNOB }}
      />
    </div>
  )
}
