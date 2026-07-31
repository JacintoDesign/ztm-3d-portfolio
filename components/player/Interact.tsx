'use client'

import { useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { expose } from '@/lib/debug'
import { isLocked, lockOwner, pollLockRelease } from '@/lib/lockedView'
import { getInRange, nearestInRange, setInRange, stationCount } from '@/lib/stations'
import { canControl, getMode } from '@/lib/store'
import { look } from './Camera'
import { position } from './Player'

/**
 * §12.5 — the one owner of the interact key.
 *
 * **Priority exactly 0**, and both halves of that matter. Zero rather than negative, so it
 * runs after `Camera`'s −2 and `Player`'s −1 and reads a fully-posed frame. Zero rather
 * than positive, because R3F hands the render loop over to the first subscriber with a
 * positive `renderPriority` — at which point calling `gl.render` becomes our job, which is
 * a large thing to take on to read a distance.
 *
 * **It lives under `components/player/`** beside the other two input owners, which is also
 * where `eslint.config.mjs` scopes its `react-hooks/immutability` suppression.
 *
 * One `keydown` here for `E`, one in `lib/input.ts` for movement, one in `lib/escape.ts`
 * for `Escape`. Three listeners for three disjoint key sets is what *one owner per key*
 * means; what §12.5 forbids is each *station* listening, because two in overlapping range
 * would then both fire.
 */
export default function Interact(): null {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.code !== 'KeyE') return
      // Edge-triggered: a held key must not re-open on every repeat.
      if (event.repeat) return
      // Only from `'play'`. In `'locked'` or `'overlay'` the key belongs to whatever is open.
      if (!canControl()) return

      const station = getInRange()
      if (station === null) return

      event.preventDefault()
      station.open()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    expose('stationCount', stationCount)
    expose('inRange', getInRange)
  }, [])

  useFrame(() => {
    pollLockRelease()

    /**
     * **In range is computed while `'play'` *and* while §12.6 has parked you at a stop.**
     *
     * This used to clear it whenever `canControl()` was false, on the argument that the
     * prompt says *press E to view* and both non-play modes are past that. That was true when
     * `'locked'` only ever meant §2.1.1's board, which brings its own controls. §12.6's tour
     * now locks the camera at §2.2's cart and §2.3's bank too — and there the prompt is the
     * only thing on screen telling a visitor what they have arrived at. Clearing it left
     * every arrival ending in silence.
     *
     * `'overlay'` still clears: a panel is open and covering the thing the prompt is about.
     * A `'showcase'` lock still clears too, because §2.1.2's pager is showing instead.
     */
    if (getMode() === 'overlay' || (isLocked() && lockOwner() === 'showcase')) {
      setInRange(null)
      return
    }

    /* Sixty calls a second into a setter that early-returns unless the value changed, so
       React renders on exactly three events per approach — in, out, or a swap. §12.5's
       180 ms fade is then a CSS transition rather than a JS interpolation, which also
       makes it reverse correctly when the visitor backs out halfway through. */
    setInRange(nearestInRange(position.x, position.z, look.yaw))
  }, 0)

  return null
}
