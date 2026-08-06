'use client'

import { useSyncExternalStore } from 'react'

import { GATE } from '@/lib/world'

/**
 * §14.1 — what the gate is waiting for.
 *
 * **Two events, not a percentage, and the brief argues the case.** Neither thing the gate
 * holds for can be measured while it is happening: a dynamic `import()` fires no progress
 * events and states no total, and the first rendered frame is shader compilation — time on a
 * GPU rather than bytes. So this store carries milestones and the rule reads its floor off
 * them. A bar that moves only when something has actually happened cannot lie about where it
 * is, which is the one property a progress indicator has to have.
 *
 * Same shape as `lib/store.ts`, `lib/device.ts` and `lib/reducedMotion.ts`: a module-level
 * value, a listener set, a direct read and a hook. Nothing here is read from a frame loop —
 * `markFirstFrame` is *called* from one, exactly once, which is the opposite direction.
 */

/** Ascending, so `Math.max` is the whole of the monotonicity guarantee. */
const STAGE = { painted: 0, chunkMounted: 1, firstFrame: 2 } as const
type Stage = (typeof STAGE)[keyof typeof STAGE]

const FLOOR: Record<Stage, number> = {
  [STAGE.painted]: GATE.progress.painted,
  [STAGE.chunkMounted]: GATE.progress.chunkMounted,
  [STAGE.firstFrame]: GATE.progress.firstFrame,
}

let stage: Stage = STAGE.painted
/**
 * **Ready is not the same as `stage === firstFrame`, and §14.1's timeout is why.** A world
 * that never renders a frame — no WebGL, a context that failed to create — would otherwise
 * leave the visitor on a permanently disabled button with nothing saying why. This is the one
 * screen in the world that can trap someone, so it has a way out that does not depend on the
 * thing that broke.
 */
let ready = false

export type GateState = { progress: number; ready: boolean }

let cached: GateState = { progress: FLOOR[stage], ready }

const listeners = new Set<() => void>()

function notify(): void {
  cached = { progress: FLOOR[stage], ready }
  for (const listener of listeners) listener()
}

/**
 * **Monotonic by construction.** The two milestones are reported from unrelated places —
 * `World`'s mount effect and a `useFrame` inside the Canvas — and React does not promise an
 * order between an effect and the first frame of a child that suspended. Clamping up rather
 * than assigning means an out-of-order report cannot walk the bar backwards, which is the one
 * thing a visitor would actually notice.
 */
function reach(next: Stage): void {
  if (next <= stage) return
  stage = next
  if (next === STAGE.firstFrame) ready = true
  notify()
}

/** The engine chunk has arrived and `World` has mounted. */
export const markChunkMounted = (): void => reach(STAGE.chunkMounted)

/**
 * The Canvas has presented a frame.
 *
 * Called from `useFrame` — **once, ever**, guarded by a ref at the call site. `CLAUDE.md`'s
 * rule is *never `setState` inside `useFrame`*, and the reason is sixty React renders a
 * second; one render, one time, at the moment the world becomes visible, is the event this
 * store exists to carry.
 */
export const markFirstFrame = (): void => reach(STAGE.firstFrame)

/**
 * §14.1's escape hatch. Enables the button without claiming the frame arrived — the rule
 * stays where it is, because moving it to full would be the bar telling the lie this whole
 * design is built to avoid.
 */
export function markReadyTimeout(): void {
  if (ready) return
  ready = true
  notify()
}

/** Direct reads. */
export const gateProgress = (): number => FLOOR[stage]
export const gateReady = (): boolean => ready

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
  }
}

const snapshot = (): GateState => cached

/**
 * One subscription carrying both values, and **the object is cached rather than built.**
 * `useSyncExternalStore` compares snapshots by identity, so a getter returning a fresh
 * `{ progress, ready }` re-renders on every check and React eventually calls it an infinite
 * loop. Rebuilt in `notify` — the one place either value can change — it is a new object
 * exactly when there is something new to see.
 */
export function useGate(): GateState {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}
