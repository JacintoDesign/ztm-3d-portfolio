'use client'

import { useSyncExternalStore } from 'react'

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
const ownerListeners = new Set<() => void>()

/** Direct read, for frame loops. */
export const lockOwner = (): LockOwner => owner

function setOwner(next: LockOwner): void {
  if (next === owner) return
  owner = next
  for (const listener of ownerListeners) listener()
}

function subscribeOwner(onStoreChange: () => void): () => void {
  ownerListeners.add(onStoreChange)
  return () => {
    ownerListeners.delete(onStoreChange)
  }
}

/**
 * **Reactive, and it had to become so because the mode alone cannot see this change.**
 *
 * §2.1.2's controls read the owner during render and re-rendered on `useMode()`. Pressing
 * `Next stop` while parked at §2.1's board runs `releaseLock()` then `lockTo(…, 'guidedPath')`
 * inside one handler — `'locked'` → `'play'` → `'locked'`. React batches that, so
 * `useSyncExternalStore` compares the final snapshot to the previous one, finds `'locked'`
 * both times, and **does not re-render**. The owner had changed; nothing asked again. The
 * pager stayed on screen over a camera gliding away to a food cart.
 *
 * **A value the DOM branches on needs its own subscription.** Reading it during a render
 * driven by a *different* store is only correct while the two always change together, and
 * these two provably do not.
 */
export function useLockOwner(): LockOwner {
  return useSyncExternalStore(subscribeOwner, lockOwner, () => owner)
}

/**
 * **A lock has two phases, and only one of them is a view.**
 *
 * `'locked'` covered both from the start: the seconds spent gliding to a pose and the time
 * spent held at it. §2.1.1 could ignore the difference at 1.1 s; §12.6 cannot, because its
 * legs run to eight seconds. §2.1.2's project pager was appearing the instant `Work` was
 * pressed and riding the whole camera move — offering *open* and a page count for a board
 * still thirty metres away.
 *
 * So arriving is a state of its own. `false` while travelling, `true` from the moment
 * `lib/pose.ts` reports the curve finished, `false` again on release.
 */
let arrived = false
const arrivedListeners = new Set<() => void>()

/** Direct read, for frame loops. */
export const lockArrived = (): boolean => arrived

function setArrived(next: boolean): void {
  if (next === arrived) return
  arrived = next
  for (const listener of arrivedListeners) listener()
}

function subscribeArrived(onStoreChange: () => void): () => void {
  arrivedListeners.add(onStoreChange)
  return () => {
    arrivedListeners.delete(onStoreChange)
  }
}

/** Reactive, for the DOM — see `useLockOwner` on why this cannot ride `useMode()`. */
export function useLockArrived(): boolean {
  return useSyncExternalStore(subscribeArrived, lockArrived, () => arrived)
}

export function lockTo(
  to: Pose,
  nowMs: number,
  durationMs?: number,
  by: LockOwner = 'showcase',
  onArrive?: () => void,
): void {
  if (isLocked()) return
  setOwner(by)
  setArrived(false)

  const motion = prefersReducedMotion() ? SHOWCASE_LOCK.reducedMotion : SHOWCASE_LOCK

  /**
   * **The mode is set before the move, not after, and reduced motion is why.**
   *
   * `poseTo` samples immediately so the first frame is already on the curve — and at §13's
   * zero duration that first sample *arrives*, firing `onArrive` synchronously from inside
   * this call. With `setMode` still below, anything that handler touched saw mode `'play'`:
   * §2.3's overlay would read `isLocked()` as false, not suspend the lock, and closing would
   * drop the visitor into free control. A state that a callback can observe has to be true
   * before the callback can run.
   */
  tickAtLock = movementTick()
  setMode('locked')

  /* §12.5 — `Escape` has one owner and this is how something claims it: a registration on
     a stack, removed on release. The overlays will register their own on top later, and
     the top-most wins. */
  unregisterEscape = registerEscape(releaseLock)

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
      onArrive: () => {
        setArrived(true)
        onArrive?.()
      },
    },
  )
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
  setArrived(false)
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
