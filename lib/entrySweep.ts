'use client'

import { CAMERA, degToRad } from '@/lib/world'

/**
 * §14.1 — the entry sweep: the world's first movement, and the only one nobody asked for by
 * pressing a key.
 *
 * **A vector, not a pose.** §2.1.1's `Pose` is `{x, z, yaw, pitch}`; this sweep never touches
 * yaw or pitch and *does* touch height, which `Pose` has no field for at all — the two shapes
 * want opposite things. So it is a small offset of its own, `{dx, dy, dz}`, started once,
 * sampled once a frame, and added onto `position.x`, `eyeY` and `position.z` in `Player.tsx`
 * right where the head bob already lands — same place, same convention, three terms instead
 * of one.
 *
 * **Diagonal, not vertical.** A pure rise-and-drop reads as an elevator, not a step forward
 * into the world. The start point is `riseM` above eye height *and* `backM` behind spawn,
 * measured along the direction spawn already faces — so the ease from there is a swoop
 * down-and-in rather than a straight descent, which is the difference between *arriving* and
 * merely *lowering*.
 *
 * **The back offset rotates with the spawn heading rather than being authored as raw `x`/`z`.**
 * `Player.tsx`'s own WASD math uses `forward = (sin ψ, 0, cos ψ)` for the brief's yaw
 * convention (§12.1: yaw 0 faces `+Z`); this reuses exactly that, so a retuned
 * `CAMERA.spawn.yawDeg` rotates the sweep's start point with it instead of leaving it pointed
 * at whatever used to be behind the visitor.
 *
 * **Same shape as `lib/pose.ts` in miniature**: a module-level value, a direct read for the
 * frame loop, nothing reactive, because nothing in the DOM ever needs to know where this has
 * got to. `lib/pose.ts`'s own note applies here too — motion policy is the caller's, so §13 is
 * never read inside this file. `Gate.tsx` decides whether to call `startEntrySweep` at all.
 */

export type EntrySweepOffset = { dx: number; dy: number; dz: number }

/** Fastest at `t = 0`, decelerating the whole way to `t = 1` — matches `CAMERA.entrySweep.ease`
    (`'easeOutCubic'`), a glide that is already moving when it starts rather than one that
    builds speed through the middle. */
const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3

/** `sin`/`cos` of the spawn heading, computed once — the sweep only ever starts from spawn. */
const spawnYaw = degToRad(CAMERA.spawn.yawDeg)
const forwardX = Math.sin(spawnYaw)
const forwardZ = Math.cos(spawnYaw)

let startedMs: number | null = null

/**
 * What `entrySweepOffset` returns. Mutated in place, exactly the way `lib/pose.ts`'s
 * `sampled` is — `CLAUDE.md`'s rule against allocating inside a frame loop applies to this
 * file as much as it does to `Camera.tsx` or `Player.tsx`, and `Player.tsx` calls this once a
 * frame for as long as the sweep runs. The invariant is that `offset` is `{0, 0, 0}` whenever
 * `startedMs` is `null`, so a caller never has to branch on whether the sweep is active before
 * reading it.
 */
const offset: EntrySweepOffset = { dx: 0, dy: 0, dz: 0 }

/** Called once, from `Gate.tsx`'s `Enter` handler. A second call while one is running is a
    no-op — there is exactly one gesture that can ever start this. */
export function startEntrySweep(nowMs: number): void {
  if (startedMs !== null) return
  startedMs = nowMs
}

/**
 * The offset to add to this frame's camera position. `{0, 0, 0}` once the sweep has finished
 * or never started — which is every frame under reduced motion, since `Gate.tsx` never calls
 * `startEntrySweep` there and this function is the only thing that can make it non-zero.
 */
export function entrySweepOffset(nowMs: number): EntrySweepOffset {
  if (startedMs === null) return offset

  const { riseM, backM, durationMs } = CAMERA.entrySweep
  const raw = (nowMs - startedMs) / durationMs
  if (raw >= 1) {
    startedMs = null
    offset.dx = 0
    offset.dy = 0
    offset.dz = 0
    return offset
  }

  const remaining = 1 - easeOutCubic(raw < 0 ? 0 : raw)
  offset.dx = -forwardX * backM * remaining
  offset.dy = riseM * remaining
  offset.dz = -forwardZ * backM * remaining
  return offset
}
