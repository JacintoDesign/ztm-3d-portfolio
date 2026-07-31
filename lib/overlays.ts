'use client'

import { useSyncExternalStore } from 'react'
import { registerEscape } from '@/lib/escape'
import { isLocked } from '@/lib/lockedView'
import { setMode } from '@/lib/store'

/**
 * §2.2 / §2.3 / §12.5 — which overlay is open.
 *
 * `lib/store.ts`'s shape, for its reasons: one module-level value, a listener set, a direct
 * read for frame loops and a hook for the DOM.
 *
 * **Opening sets `'overlay'`, and that one line is what stops the visitor moving.** §12.3's
 * key handler, `TouchStick`'s two handlers and `Camera.tsx`'s pointer handlers are all gated
 * on `canControl()`, so none of them has to know overlays exist. The bug this prevents —
 * walking across the world while typing — is invisible for the whole build, because you never
 * type in your own form.
 *
 * **It suspends §2.1.1's locked view rather than releasing it.** Both are non-`'play'` modes
 * and both write the mode, so one of them has to yield — but *releasing* also writes the pose
 * back and hands control over, which meant closing a panel dropped the visitor into free play
 * at a stop the tour had just aimed them at. On a phone that is §12.3's stick reappearing
 * under a camera they did not ask to take over. The pose stays active and keeps holding the
 * camera; only the mode changes, and `closeOverlay` puts it back.
 */

export type Overlay = 'about' | 'contact' | null

let open: Overlay = null
let unregisterEscape: (() => void) | null = null
/**
 * Whether §2.1.1's lock was holding the camera when this overlay opened.
 *
 * **Closing has to put the visitor back where they were, and that is not always `'play'`.**
 * §12.6 parks them at a stop and — on mobile — opens the contact panel for them; closing it
 * used to hand back free control, which on a phone means §12.3's stick reappearing under a
 * camera the tour is still aiming. The visitor never asked to start walking; they asked to
 * close a panel. So the lock is *suspended* rather than released, and closing resumes it.
 */
let lockSuspended = false

const listeners = new Set<() => void>()

const notify = (): void => {
  for (const listener of listeners) listener()
}

/** Direct read. Safe inside `useFrame`. */
export const openOverlay = (): Overlay => open

export function closeOverlay(): void {
  if (open === null) return
  open = null
  unregisterEscape?.()
  unregisterEscape = null

  /* Back to the lock if one was suspended, not to free control. `lockTo`'s own `Escape`
     registration is still underneath ours on §12.5's stack, so the next press releases it. */
  if (lockSuspended) {
    lockSuspended = false
    setMode('locked')
  } else {
    setMode('play')
  }
  notify()
}

function show(which: Exclude<Overlay, null>): void {
  if (open === which) return

  /**
   * **The lock is suspended, not released.**
   *
   * It used to be released outright, on the argument that both are non-`'play'` modes and
   * two owners of the mode is one too many. That is still true — but releasing also writes
   * the pose back and hands control over, so closing the panel dropped the visitor into free
   * play at a stop the tour had aimed them at. `lockTo`'s pose stays active and keeps holding
   * the camera; only the *mode* changes, and `closeOverlay` puts it back.
   */
  lockSuspended = isLocked()

  /* Re-opening from one overlay straight into the other: drop the first registration rather
     than stacking two, or one `Escape` closes the overlay and leaves a dead handler on top
     of §12.5's stack for the next thing that registers. */
  unregisterEscape?.()

  open = which
  setMode('overlay')
  unregisterEscape = registerEscape(closeOverlay)
  notify()
}

export const openAbout = (): void => show('about')
export const openContact = (): void => show('contact')

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
  }
}

/** Reactive read, for the DOM. Frame loops use `openOverlay()`. */
export function useOverlay(): Overlay {
  return useSyncExternalStore(subscribe, openOverlay, () => null)
}
