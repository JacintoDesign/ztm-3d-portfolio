import { LOOK } from '@/lib/world'

/**
 * §12.2 — the click guard. *"A pointer that travelled more than 6 px between down and up was
 * a camera turn, not a tap."*
 *
 * Look-drag and click share the left mouse button, so without this a drag that happens to end
 * over a door opens the door. **Measured rather than assumed** before anything was built on
 * it: a clean tap reports `delta` 0 with the camera unmoved, and a 60 px drag ending over the
 * same mesh *still fires `onClick`* — `delta` 113, camera yawed 14°. The guard is the only
 * thing between that gesture and an opened tab.
 *
 * One helper rather than an inline comparison per clickable, because `LOOK.clickGuardPx` had
 * sat with no consumer since the player build and a rule with two implementations has two
 * places to forget it.
 *
 * **Two facts about `delta` to build against rather than discover.** R3F populates it only
 * for `onClick`, `onDoubleClick` and `onContextMenu` — on `onPointerUp` it is always 0 and
 * this guard would silently always pass. And it is `Math.round`ed, so a 6.4 px drag counts
 * as a tap.
 */
export const isTap = (event: { delta: number }): boolean => event.delta <= LOOK.clickGuardPx
