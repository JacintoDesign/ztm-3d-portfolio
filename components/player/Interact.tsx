'use client'

import { useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { expose } from '@/lib/debug'
import { pollLockRelease } from '@/lib/lockedView'
import { getInRange, nearestInRange, setInRange, stationCount } from '@/lib/stations'
import { canControl } from '@/lib/store'
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

    /* The prompt is hidden while locked or in an overlay: it says "press E to view", and
       both of those states are already past that. */
    if (!canControl()) {
      setInRange(null)
      return
    }

    /* Sixty calls a second into a setter that early-returns unless the value changed, so
       React renders on exactly three events per approach — in, out, or a swap. §12.5's
       180 ms fade is then a CSS transition rather than a JS interpolation, which also
       makes it reverse correctly when the visitor backs out halfway through. */
    setInRange(nearestInRange(position.x, position.z))
  }, 0)

  return null
}
