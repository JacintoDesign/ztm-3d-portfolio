'use client'

import { useSyncExternalStore } from 'react'
import { registerEscape } from '@/lib/escape'
import { isLocked, releaseLock } from '@/lib/lockedView'
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
 * **It releases §2.1.1's locked view first.** Both are non-`'play'` modes and both write the
 * mode, so opening the About overlay from the nav while the board is locked would leave the
 * lock holding a camera pose that nothing will ever release: closing the overlay returns to
 * `'play'`, and `releaseLock`'s write-back never runs, so the visitor snaps to wherever they
 * were standing before the lock. One owner per mode transition, and this is it.
 */

export type Overlay = 'about' | 'contact' | null

let open: Overlay = null
let unregisterEscape: (() => void) | null = null

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
  setMode('play')
  notify()
}

function show(which: Exclude<Overlay, null>): void {
  if (open === which) return

  /* §2.1.1's lock owns the camera and writes the mode. Let it finish before taking over. */
  if (isLocked()) releaseLock()

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
