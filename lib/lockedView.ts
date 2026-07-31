'use client'

import { registerEscape } from '@/lib/escape'
import { movementTick } from '@/lib/input'
import { look } from '@/components/player/Camera'
import { position } from '@/components/player/Player'
import { type Pose, poseRelease, poseTo } from '@/lib/pose'
import { prefersReducedMotion } from '@/lib/reducedMotion'
import { getMode, setMode } from '@/lib/store'
import { SHOWCASE_LOCK } from '@/lib/world'

/**
 * §2.1.1 — the locked view: `lib/pose.ts`'s first consumer, and the policy around it.
 *
 * `lib/pose.ts` knows about curves and nothing else. This file knows about §13, about the
 * mode machine, and about the four ways a visitor gets out — which is the part that has to
 * be right, because **this is the first state in the world that can trap someone.**
 *
 * `setMode('locked')` is the first call to `setMode` from application code anywhere: the
 * mode has been `'play'` since the shell and `'locked'` has been unreachable. Four gates
 * change behaviour in the same instant — `lib/input.ts`'s keydown, `TouchStick`'s two, and
 * `Camera.tsx`'s pointer handlers — so all four are exercised deliberately, not assumed.
 */

/** Bumped when the lock takes over, so the release poll knows what "new input" means. */
let tickAtLock = 0
let unregisterEscape: (() => void) | null = null

export const isLocked = (): boolean => getMode() === 'locked'

/**
 * Take the camera to `to`. Reads §13 here rather than in `lib/pose.ts`, which takes its
 * motion policy as arguments and reads nothing — `lib/flicker.ts`'s precedent.
 *
 * §13 chooses *linear over the same duration* rather than a jump: the lock starts from
 * wherever the visitor happens to be standing, and a cut would leave them no way to tell
 * whether they moved or the world did.
 */
/**
 * Who asked for the lock.
 *
 * **§2.1.2's controls are the reason this exists.** They appear whenever the mode is
 * `'locked'`, which was unambiguous while §2.1.1 was the only thing that could lock — and
 * stopped being so the moment §12.6's tour reused the same primitive. Without an owner, the
 * project pager and its OPEN button appear while the camera is gliding to a food cart.
 */
export type LockOwner = 'showcase' | 'guidedPath'

let owner: LockOwner = 'showcase'

/** Read directly; the DOM reads it through `useMode()` re-rendering on the transition. */
export const lockOwner = (): LockOwner => owner

export function lockTo(
  to: Pose,
  nowMs: number,
  durationMs?: number,
  by: LockOwner = 'showcase',
  onArrive?: () => void,
): void {
  if (isLocked()) return
  owner = by

  const motion = prefersReducedMotion() ? SHOWCASE_LOCK.reducedMotion : SHOWCASE_LOCK

  poseTo(
    { x: position.x, z: position.z, yaw: look.yaw, pitch: look.pitch },
    to,
    {
      nowMs,
      /**
       * §12.6's legs are a *distance* problem and §2.1.1's is not, which is why this is an
       * override rather than a second policy. The showcase lock always travels to one pose
       * and 1.1 s suits it; the guided path's legs run 2.1 to 38.6 m, and one duration across
       * that range is either a crawl or 15 m/s. `lib/guidedPath.ts` derives its own from
       * §12.6's glide speed and passes it in — the caller owning motion policy is the same
       * split `lib/pose.ts` already makes with this file.
       *
       * **Reduced motion still wins.** A caller asking for 3.9 s gets `reducedMotion`'s
       * duration anyway, because §13 is not something a caller may opt out of.
       */
      durationMs: prefersReducedMotion() ? motion.durationMs : (durationMs ?? motion.durationMs),
      ease: motion.ease,
      onArrive,
    },
  )

  tickAtLock = movementTick()
  setMode('locked')

  /* §12.5 — `Escape` has one owner and this is how something claims it: a registration on
     a stack, removed on release. The overlays will register their own on top later, and
     the top-most wins. */
  unregisterEscape = registerEscape(releaseLock)
}

/**
 * Give control back.
 *
 * **The write-back is the whole of it.** `lib/pose.ts` returns where the camera actually
 * ended up, and that has to land in `position` — otherwise `Player.tsx` resumes from
 * wherever the visitor was standing before the lock and they snap backwards. Rotation needs
 * no write-back: `Camera.tsx` drives `look` *through* the pose every frame, so it is
 * already correct.
 */
export function releaseLock(): void {
  if (!isLocked()) return

  const final = poseRelease()
  position.x = final.x
  position.z = final.z

  unregisterEscape?.()
  unregisterEscape = null
  setMode('play')
}

/**
 * Called once per frame while the world is running. Releases on movement input.
 *
 * **Guarded on the mode, and that guard is not cosmetic.** `movementTick` fires above
 * §12.3's `canControl` gate, so it also ticks when someone types `w` into §2.3's contact
 * form. A poll that did not check for `'locked'` would close the contact form under them.
 */
export function pollLockRelease(): void {
  if (!isLocked()) return
  if (movementTick() !== tickAtLock) releaseLock()
}
