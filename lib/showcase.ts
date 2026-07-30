'use client'

import { useSyncExternalStore } from 'react'
import { prefersReducedMotion } from '@/lib/reducedMotion'
import { SHOWCASE } from '@/lib/world'

/**
 * §2.1 — which project the board is showing, and whether it is still advancing on its own.
 *
 * `lib/store.ts`'s shape: a module singleton with a `useSyncExternalStore` hook, and a setter
 * that **early-returns if the value is unchanged**. That is what makes it safe to call from a
 * frame loop — a React render is structurally impossible unless the index actually moved,
 * rather than merely being something a reader has to remember not to trigger.
 *
 * **The dwell is a `performance.now()` comparison, not a timer.** A `setInterval` keeps
 * firing (throttled) in a hidden tab, so a visitor who switches away for two minutes comes
 * back to project 3 with no idea how they got there. A comparison inside `useFrame` stops
 * when `requestAnimationFrame` stops — correct semantics for free, and nothing to clear.
 * `lib/input.ts` already treats a backgrounded tab as *nothing happened*, for the same reason.
 */

let index = 0
let count = 0
let dwellStartedMs = 0
/** §2.1's transition clock. 0 means "never changed", so the first paint is not a fade. */
let transitionAtMs = 0
/** §2.1 — the first manual page or door click stops the automatic paging for the session. */
let autoStopped = false

const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) listener()
}

/** Safe inside a frame loop. Direct read; never a subscription. */
export const showcaseIndex = (): number => index
export const showcaseCount = (): number => count
export const autoAdvanceStopped = (): boolean => autoStopped

/** Set once from the project list. N is never hardcoded — §2.1. */
export function setShowcaseCount(next: number): void {
  if (next === count) return
  count = next
  if (index >= count) index = 0
  notify()
}

function goTo(next: number, nowMs: number): void {
  if (count === 0) return
  const wrapped = ((next % count) + count) % count
  dwellStartedMs = nowMs
  if (wrapped === index) return
  index = wrapped
  transitionAtMs = nowMs
  notify()
}

/** Automatic paging. Wraps; never stops the dwell clock. */
export function advanceAuto(nowMs: number): void {
  goTo(index + 1, nowMs)
}

/**
 * A manual page. **Stops the automatic paging**, which is the whole difference between this
 * and `advanceAuto` — the visitor has taken the wheel.
 */
export function page(delta: number, nowMs: number): void {
  autoStopped = true
  goTo(index + delta, nowMs)
}

/** A door click counts as taking the wheel too, without moving the board. */
export function stopAutoAdvance(): void {
  autoStopped = true
}

/**
 * Called every frame. Advances if the dwell has elapsed.
 *
 * **Off entirely under reduced motion** (§13): ten seconds of self-advancing content is
 * motion under any reading, and §2.1's stop-on-first-manual-page only helps a visitor who
 * has already touched something. The arrows, the keys and the swipe all still work, so
 * nothing becomes unreachable — it only stops happening by itself.
 */
export function pollAutoAdvance(nowMs: number): void {
  if (autoStopped || count <= 1) return
  if (prefersReducedMotion()) return
  if (dwellStartedMs === 0) {
    dwellStartedMs = nowMs
    return
  }
  if (nowMs - dwellStartedMs >= SHOWCASE.autoAdvanceMs) advanceAuto(nowMs)
}

/**
 * §2.1 — how bright the board should be right now, 0 to 1, during a project change.
 *
 * **Cut to black, hold, fade up.** §2.1 also specifies a 140 ms fade *out* before the cut, and
 * that half is not implemented: the texture swap is synchronous with the index change, so a
 * fade-out would dim the *incoming* screenshot rather than the outgoing one. Doing it properly
 * needs a display index that lags the real one, which is a second piece of state for 140 ms of
 * polish — recorded here rather than faked, because a fade that dims the wrong image is worse
 * than a cut.
 *
 * §13: hard cut, 0 ms. Read directly in a frame loop; allocates nothing.
 */
export function transitionLevel(nowMs: number): number {
  if (transitionAtMs === 0) return 1
  if (prefersReducedMotion()) return 1

  const { hold, fadeUp } = SHOWCASE.transitionMs
  const since = nowMs - transitionAtMs
  if (since < hold) return 0
  if (since < hold + fadeUp) return (since - hold) / fadeUp
  return 1
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** For the one React render that swaps the board's textures. */
export function useShowcaseIndex(): number {
  return useSyncExternalStore(subscribe, showcaseIndex, () => 0)
}
