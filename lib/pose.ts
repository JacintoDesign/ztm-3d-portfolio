/**
 * §2.1.1 / §12.6 — the camera pose primitive: a target pose, an ease, and a release.
 *
 * **One primitive, two consumers.** §2.1.1's locked view is one pose; §12.6's guided path is
 * four of them in sequence with a control point. `CLAUDE.md` asks for the locked-view camera
 * to be *kept general*, and the way to keep it general is to build it before the second
 * consumer exists rather than to generalise it afterwards.
 *
 * **This module writes nothing to the camera.** `Camera.tsx` owns rotation and `Player.tsx`
 * owns position, and that split is what stops two writers disagreeing inside one frame. So
 * a pose is *sampled* here and each of those two files reads back only the part it already
 * owned. A module that wrote `state.camera` directly would need a frame priority above
 * Player's −1 — which means ≥ 0, which runs *after* Player, which is fighting rather than
 * winning — and would need a second copy of §12.1's ψ → three conversion.
 *
 * **`poseAdvance` is called from exactly one place**, `Camera.tsx` at priority −2. Both
 * readers then read the same `sampled` object, so they cannot disagree about what time it is.
 *
 * Motion policy is the caller's business, not this file's: `durationMs` and `ease` arrive as
 * arguments and §13 is never read here. `lib/flicker.ts` sets that precedent explicitly.
 */

export type Ease = 'linear' | 'easeInOutCubic'

export type Pose = {
  x: number
  z: number
  /** Brief convention (§12.1): yaw 0 faces +Z. Converted to three's exactly once, elsewhere. */
  yaw: number
  pitch: number
}

/** What the two readers read. Mutated in place; never reallocated. */
export const sampled: Pose = { x: 0, z: 0, yaw: 0, pitch: 0 }

type Move = {
  from: Pose
  to: Pose
  startedMs: number
  durationMs: number
  ease: Ease
  onArrive: (() => void) | null
}

let move: Move | null = null
let active = false

/** True while a pose owns the camera. Read directly in frame loops — never subscribed to. */
export const poseActive = (): boolean => active

const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2

const TWO_PI = Math.PI * 2

/**
 * §12.2 leaves yaw unlimited, so a visitor who has spun three times sits at ≈19.2 rad.
 * Easing that to +0.35 spins them backwards three full turns over the duration. Normalising
 * the *start* rather than the target keeps the destination exactly as authored.
 *
 * Invisible until someone spins, and then it looks like a bug in whatever they were
 * walking up to.
 */
const shortestFrom = (from: number, to: number): number =>
  from + TWO_PI * Math.round((to - from) / TWO_PI)

/**
 * Begin a move to `to`, starting from wherever the camera is now.
 *
 * `nowMs` is passed in rather than read, because `lib/world.ts`'s whole convention is that
 * a module takes its inputs; it also makes this deterministic under test.
 */
export function poseTo(
  from: Pose,
  to: Pose,
  options: { nowMs: number; durationMs: number; ease: Ease; onArrive?: () => void },
): void {
  move = {
    from: { ...from, yaw: shortestFrom(from.yaw, to.yaw) },
    to: { ...to },
    startedMs: options.nowMs,
    durationMs: Math.max(0, options.durationMs),
    ease: options.ease,
    onArrive: options.onArrive ?? null,
  }
  active = true
  // Sample immediately so the first frame after this call is already on the curve, rather
  // than one frame of whatever `sampled` last held.
  poseAdvance(options.nowMs)
}

/**
 * Advance the active pose and write `sampled`. Called once per frame from `Camera.tsx`.
 *
 * Returns `true` while a pose owns the camera, so the caller can branch without a second
 * read of `poseActive()`.
 */
export function poseAdvance(nowMs: number): boolean {
  if (!active || move === null) return false

  const { from, to, startedMs, durationMs, ease } = move
  /* A zero duration is a legal request — §13's reduced-motion path can ask for one — and
     dividing by it would put `t` at NaN and freeze the camera at `from` forever. */
  const raw = durationMs === 0 ? 1 : (nowMs - startedMs) / durationMs
  const clamped = raw < 0 ? 0 : raw > 1 ? 1 : raw
  const t = ease === 'linear' ? clamped : easeInOutCubic(clamped)

  sampled.x = from.x + (to.x - from.x) * t
  sampled.z = from.z + (to.z - from.z) * t
  sampled.yaw = from.yaw + (to.yaw - from.yaw) * t
  sampled.pitch = from.pitch + (to.pitch - from.pitch) * t

  if (clamped >= 1) {
    const { onArrive } = move
    move = null
    /* Still `active` — arriving ends the *move*, not the lock. §2.1.1 holds the pose until
       the visitor releases it; §12.6 releases on arrival, and does so through `onArrive`.
       Conflating the two is how a guided path would strand the visitor at a stop. */
    onArrive?.()
  }

  return active
}

/**
 * End the pose. The caller must write `sampled` back into whatever it took over, which is
 * why this returns it — see `Camera.tsx`. Releasing without writing back leaves
 * `look.target*` and `position` at their pre-pose values, and control returns by snapping
 * the visitor to where they were standing before the lock.
 */
export function poseRelease(): Pose {
  active = false
  move = null
  return sampled
}
