'use client'

import { useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { boxCount, registerBoxes, resolveX, resolveZ } from '@/lib/collision'
import { expose } from '@/lib/debug'
import { entrySweepOffset } from '@/lib/entrySweep'
import { attachKeyboard, hasMovementInput, readIntent } from '@/lib/input'
import { poseActive, sampled } from '@/lib/pose'
import { prefersReducedMotion } from '@/lib/reducedMotion'
import { canControl } from '@/lib/store'
import { BOUNDS, CAMERA, WALK } from '@/lib/world'
import { look } from './Camera'

/**
 * §12.3 — walking, and §3's hard clamp.
 *
 * This file owns the camera's *position*; `Camera.tsx` owns its rotation. No physics
 * engine: a velocity, a clamp, and a sine wave for the bob.
 *
 * Collision against the §3.2 objects is not here — AABBs go on as objects are placed, in
 * the surroundings step. What ships now is the clamp, which is the part that cannot leak:
 * boxes open at corners, a coordinate limit does not.
 */

/* Every one of these is hoisted. Allocating inside a frame loop is the thing that turns
   a smooth world into a stuttering one, and the stutter never looks like its cause. */
/* Annotated rather than inferred: `world.ts` is `as const`, so an unannotated `position`
   would take the literal type of the spawn coordinates and reject every later write. */
const intent: { x: number; y: number } = { x: 0, y: 0 }
const velocity: { x: number; z: number } = { x: 0, z: 0 }
/**
 * Exported for §12.5's interact manager and §2.1.1's locked view, which both need to know
 * where the visitor is standing — the same way `Camera.tsx` exports `look` for this file's
 * movement basis. A module read, never a subscription.
 */
export const position: { x: number; z: number } = {
  x: CAMERA.spawn.position[0],
  z: CAMERA.spawn.position[2],
}

const TWO_PI = Math.PI * 2
let bobPhase = 0

/** Below this the visitor has stopped; letting it decay forever keeps the bob alive. */
const REST_EPSILON = 1e-4

/**
 * §3 — the hard clamp, per axis. Clamping each axis independently is what lets the visitor
 * slide along a bound instead of sticking to it, and zeroing only the offending component
 * stops a phantom velocity firing them off when they turn away. The clamp is on the eye;
 * the 0.32 player radius belongs to the §12.4 box pass.
 *
 * Lifted out of the frame body when §2.1.1's pose branch arrived, so that branch can keep
 * the clamp while skipping collision — *"the clamp always has the last word"* has to hold
 * on both paths or it is not a clamp.
 */
function clampToBounds(): void {
  if (position.x < BOUNDS.x[0]) {
    position.x = BOUNDS.x[0]
    if (velocity.x < 0) velocity.x = 0
  } else if (position.x > BOUNDS.x[1]) {
    position.x = BOUNDS.x[1]
    if (velocity.x > 0) velocity.x = 0
  }

  if (position.z < BOUNDS.z[0]) {
    position.z = BOUNDS.z[0]
    if (velocity.z < 0) velocity.z = 0
  } else if (position.z > BOUNDS.z[1]) {
    position.z = BOUNDS.z[1]
    if (velocity.z > 0) velocity.z = 0
  }
}

export default function Player(): null {
  useEffect(() => attachKeyboard(), [])

  // Dev only; compiled away in production. The brief's movement values are numbers, and
  // several of them can only be checked by reading them while walking.
  useEffect(() => {
    expose('intent', intent)
    expose('velocity', velocity)
    expose('position', position)
    expose('look', look)
    expose('hasMovementInput', hasMovementInput)
    // §13 cannot be checked from here — it is an OS setting. Exposed so the manual check
    // is one line: `__world.prefersReducedMotion()` should read `true` with it on.
    expose('prefersReducedMotion', prefersReducedMotion)
    // §12.4 — so a test box can be dropped in mid-alley and walked into. Every storefront
    // box is inert against the §3 clamp, so this is the only way to exercise the resolver.
    expose('boxCount', boxCount)
    expose('registerBoxes', registerBoxes)
  }, [])

  /**
   * Priority −1: after `Camera`'s −2, so the movement basis uses this frame's yaw rather
   * than the last one's. Negative priorities order callbacks without taking over the
   * render loop.
   */
  useFrame((state, delta) => {
    /**
     * §2.1.1 — while a pose owns the camera, position comes from it. `Camera.tsx` advanced
     * it at −2, so `sampled` is this frame's, not the last one's.
     *
     * **Collision is skipped and the §3 clamp is kept.** A pose resolving against an AABB
     * would stall mid-ease against whatever it passed; the clamp costs nothing when the
     * pose is legal and means a bad brief value still cannot walk the visitor out of the
     * world. `intent` and `velocity` are zeroed rather than parked, so control returns
     * without a lurch — the same reason the `canControl` branch below does it.
     */
    if (poseActive()) {
      intent.x = 0
      intent.y = 0
      velocity.x = 0
      velocity.z = 0
      position.x = sampled.x
      position.z = sampled.z
      clampToBounds()
      // No bob: the visitor is not walking, and §13 is not involved either way.
      state.camera.position.set(position.x, CAMERA.eyeHeight, position.z)
      return
    }

    if (canControl()) {
      readIntent(intent)
    } else {
      // §12.3's gate, and it zeroes the velocity as well as the intent. Parking the
      // velocity instead would resume the walk the moment the overlay closed, which
      // reads as the world shoving the visitor.
      intent.x = 0
      intent.y = 0
      velocity.x = 0
      velocity.z = 0
    }

    if (intent.x !== 0 || intent.y !== 0) {
      /* §12.3 — camera yaw only, flattened. ψ is the brief's yaw, not three's:
           forward = ( sin ψ, 0,  cos ψ )
           right   = (−cos ψ, 0,  sin ψ )   ( = forward × up )
         The sign of `right` is the easiest thing here to get backwards, and it presents
         as A and D swapped — which reads as a binding bug rather than a maths one. */
      const sin = Math.sin(look.yaw)
      const cos = Math.cos(look.yaw)
      const desiredX = -cos * intent.x + sin * intent.y
      const desiredZ = sin * intent.x + cos * intent.y

      // right and forward are orthonormal, so |desired| is |intent| × speed with no
      // further scaling — a half-pushed stick is half speed for free.
      const targetX = desiredX * WALK.speed
      const targetZ = desiredZ * WALK.speed

      /* Accelerate toward the desired *velocity vector*, not along the input direction,
         so turning while walking redirects the existing speed instead of adding to it. */
      const deltaX = targetX - velocity.x
      const deltaZ = targetZ - velocity.z
      const distance = Math.hypot(deltaX, deltaZ)
      const step = WALK.acceleration * delta

      if (distance <= step || distance === 0) {
        velocity.x = targetX
        velocity.z = targetZ
      } else {
        velocity.x += (deltaX / distance) * step
        velocity.z += (deltaZ / distance) * step
      }
    } else {
      /* Damping applies only here. Running it alongside acceleration would make this a
         first-order system settling at acceleration ÷ damping = 1.2 m/s — less than half
         the 2.6 the brief states, and nothing in the code would look wrong. */
      const decay = Math.exp(-WALK.damping * delta)
      velocity.x *= decay
      velocity.z *= decay
      if (Math.abs(velocity.x) + Math.abs(velocity.z) < REST_EPSILON) {
        velocity.x = 0
        velocity.z = 0
      }
    }

    /* §12.4 — integrate and resolve one axis at a time. Both passes run before the §3
       clamp, so the clamp always has the last word; a box that disagreed with it would
       otherwise be able to park the visitor outside the walkable bounds. */
    position.x += velocity.x * delta
    resolveX(position, velocity)
    position.z += velocity.z * delta
    resolveZ(position, velocity)

    clampToBounds()

    let eyeY = CAMERA.eyeHeight

    /* §12.3 head bob, scaled by speed so it fades in and out with the walk rather than
       switching on. §13 turns it off entirely — phase frozen, eye exactly at 1.68.
       Walking itself is untouched under reduced motion: it is visitor-initiated, not
       ambient, and reduced motion never means reduced access. */
    if (!prefersReducedMotion()) {
      const speedRatio = Math.hypot(velocity.x, velocity.z) / WALK.speed
      bobPhase = (bobPhase + TWO_PI * WALK.headBob.frequencyHz * speedRatio * delta) % TWO_PI
      eyeY += Math.sin(bobPhase) * WALK.headBob.amplitude * speedRatio
    }

    /* §14.1 — the entry sweep: a diagonal offset on top of everything above, camera-only in
       the same sense `eyeY` already is. It is added at the very last moment, after the
       clamp and after the bob, and it never touches `position.x`/`position.z` themselves —
       §12.4's collision and §12.5's interact range read `position`, and the sweep is a
       98-frame flourish at spawn, nowhere near a wall or a station, so there is nothing for
       either to see. `{0, 0, 0}` on every frame it has not been started on, which under
       reduced motion is every frame, since `Gate.tsx` never starts it there. */
    const sweep = entrySweepOffset(state.clock.elapsedTime * 1000)
    eyeY += sweep.dy

    state.camera.position.set(position.x + sweep.dx, eyeY, position.z + sweep.dz)
  }, -1)

  return null
}
