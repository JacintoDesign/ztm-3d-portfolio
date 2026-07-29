'use client'

import { BOUNDS } from './world'

/**
 * §12.4 — the box resolution. No physics engine: a capsule and a clamp.
 *
 * Objects register axis-aligned boxes as they are placed and the player resolves against
 * them **per axis**, which is what makes the visitor slide along a wall instead of
 * sticking to it. The §3 clamp still runs after this, and still wins: boxes leak at
 * corners, a coordinate limit cannot.
 *
 * Boxes are 2D. Everything in this world that is solid runs floor to above eye height,
 * so a Y extent would be a third comparison per box per frame that can never change an
 * answer. When something is placed that a visitor can walk *under*, it does not register.
 *
 * Module-level state, read directly in the frame loop and never through React. A store
 * subscription here would re-render the tree on every registration.
 */

export type Box = {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

const boxes: Box[] = []

/**
 * Register boxes and get back a function that removes exactly these again.
 *
 * Removal is by identity rather than by index: registrations from different components
 * interleave, and an index captured at mount stops meaning anything as soon as anything
 * else unmounts.
 */
export function registerBoxes(added: readonly Box[]): () => void {
  boxes.push(...added)
  return () => {
    for (const box of added) {
      const at = boxes.indexOf(box)
      if (at !== -1) boxes.splice(at, 1)
    }
  }
}

export function boxCount(): number {
  return boxes.length
}

const R = BOUNDS.playerRadius

/**
 * Push the eye out of any box it has entered along X, and kill the velocity that put it
 * there. Call after the X integration and before the Z one — the two passes together are
 * what "resolved per axis" means, and running them as one vector test instead is how a
 * visitor ends up stopping dead in a corner rather than sliding out of it.
 *
 * Only the component that drove the visitor in is zeroed, so walking diagonally into a
 * wall keeps the along-wall motion.
 */
export function resolveX(position: { x: number; z: number }, velocity: { x: number; z: number }): void {
  for (const box of boxes) {
    if (position.z <= box.minZ - R || position.z >= box.maxZ + R) continue
    if (position.x <= box.minX - R || position.x >= box.maxX + R) continue

    // Out by the nearer face. Choosing the deeper one would teleport the visitor through.
    if (position.x - (box.minX - R) < box.maxX + R - position.x) {
      position.x = box.minX - R
      if (velocity.x > 0) velocity.x = 0
    } else {
      position.x = box.maxX + R
      if (velocity.x < 0) velocity.x = 0
    }
  }
}

export function resolveZ(position: { x: number; z: number }, velocity: { x: number; z: number }): void {
  for (const box of boxes) {
    if (position.x <= box.minX - R || position.x >= box.maxX + R) continue
    if (position.z <= box.minZ - R || position.z >= box.maxZ + R) continue

    if (position.z - (box.minZ - R) < box.maxZ + R - position.z) {
      position.z = box.minZ - R
      if (velocity.z > 0) velocity.z = 0
    } else {
      position.z = box.maxZ + R
      if (velocity.z < 0) velocity.z = 0
    }
  }
}
