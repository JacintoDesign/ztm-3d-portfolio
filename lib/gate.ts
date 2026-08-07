'use client'

import { useSyncExternalStore } from 'react'

/**
 * §14.1 — whether the world is ready to be entered.
 *
 * Same shape as `lib/store.ts`, `lib/device.ts` and `lib/reducedMotion.ts`: a module-level
 * value, a listener set, a direct read and a hook. Nothing here is read from a frame loop —
 * `markFirstFrame` is *called* from one, exactly once, which is the opposite direction.
 */

/**
 * **Ready is not the same as "the first frame arrived", and §14.1's timeout is why.** A world
 * that never renders a frame — no WebGL, a context that failed to create — would otherwise
 * leave the visitor on a permanently disabled button with nothing saying why. This is the one
 * screen in the world that can trap someone, so it has a way out that does not depend on the
 * thing that broke.
 */
let ready = false

export type GateState = { ready: boolean }

let cached: GateState = { ready }

const listeners = new Set<() => void>()

function notify(): void {
  cached = { ready }
  for (const listener of listeners) listener()
}

/**
 * The Canvas has presented a frame.
 *
 * Called from `useFrame` — **once, ever**, guarded by a ref at the call site. `CLAUDE.md`'s
 * rule is *never `setState` inside `useFrame`*, and the reason is sixty React renders a
 * second; one render, one time, at the moment the world becomes visible, is the event this
 * store exists to carry.
 */
export function markFirstFrame(): void {
  if (ready) return
  ready = true
  notify()
}

/**
 * §14.1's escape hatch. Enables the button without claiming the frame arrived.
 */
export function markReadyTimeout(): void {
  if (ready) return
  ready = true
  notify()
}

/** Direct read. */
export const gateReady = (): boolean => ready

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
  }
}

const snapshot = (): GateState => cached

/**
 * `useSyncExternalStore` compares snapshots by identity, so a getter returning a fresh
 * `{ ready }` re-renders on every check and React eventually calls it an infinite loop.
 * Rebuilt in `notify` — the one place the value can change — it is a new object exactly
 * when there is something new to see.
 */
export function useGate(): GateState {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}
