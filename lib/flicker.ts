'use client'

import { NEON_FLICKER } from '@/lib/world'

/**
 * §11.3 — the flicker sequence, in one place because it now has more than one consumer.
 *
 * §3.5's nine signs had it to themselves until §11.3 extended it to the three banners, and
 * a hand-authored sequence copied into a second component is a sequence that can drift out
 * of step with the document that defines it. `Overhead.tsx` and `NeonSigns.tsx` both call
 * this; neither owns the timing.
 */

/** The stutter itself: 11 steps at 22 ms = 242 ms. */
const CYCLE_MS = NEON_FLICKER.sequence.length * NEON_FLICKER.stepMs

/** Stutter plus §11.3's 6.5 s steady hold — 6.742 s, the period every phase is a fraction of. */
export const FLICKER_PERIOD_MS = CYCLE_MS + NEON_FLICKER.holdSec * 1000

/**
 * The emissive multiplier for one flickering thing at one instant.
 *
 * `phase` is a fraction of the period, per §11.3. It is not cosmetic: the stutter is 242 ms
 * inside 6.742 s, so everything reading the same clock stutters on the same frame — five
 * objects blinking in unison, which reads as the street being switched rather than as five
 * failing tubes. §11.3 assigns the six offsets.
 *
 * Callers are frame loops, so this allocates nothing and reads no state. Reduced motion is
 * the caller's business: §13 wants a constant 1, and a caller that already has to skip its
 * own work is better placed to return early than this is to be asked every frame.
 */
export function flickerLevel(elapsedSec: number, phase: number): number {
  const ms = (elapsedSec * 1000 + phase * FLICKER_PERIOD_MS) % FLICKER_PERIOD_MS
  if (ms >= CYCLE_MS) return 1
  const step = Math.floor(ms / NEON_FLICKER.stepMs)
  return NEON_FLICKER.sequence[step] ?? 1
}
