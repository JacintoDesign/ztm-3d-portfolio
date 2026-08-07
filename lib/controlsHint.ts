'use client'

import { useSyncExternalStore } from 'react'

import { registerEscape } from '@/lib/escape'
import { isLocked } from '@/lib/lockedView'
import { setMode } from '@/lib/store'

/**
 * §14.3 — the controls hint's own state: whether the panel is open, and whether this
 * browser has ever seen it.
 *
 * **Two concerns, one file, because they are read together everywhere that matters.**
 * `openControlsHint` is what both the first-visit trigger and the `?` button call, and it
 * is also what marks the hint seen — showing it *is* the event `lib/world.ts`'s comment
 * calls "seen", not reading it to the end, which nothing here could measure anyway.
 *
 * **Same shape as `lib/overlays.ts`, independently, not imported from it.** About and
 * Contact are `CONTENT.md` panels with a shared identity (`Overlay`) and a shared close
 * path; this is a UI affordance with a persisted flag neither of them needs. Folding a
 * third, differently-lived case into that union would mean `Overlays.tsx` growing a branch
 * for content that was never `CONTENT.md`'s. What *is* shared — blocking movement, the
 * `Escape` stack, giving a suspended locked view back rather than dropping to free play —
 * is copied here in the few lines it costs, from the pattern `lib/overlays.ts` proved.
 */

const STORAGE_KEY = 'jacintoDesign:controlsHintSeen'

let open = false
let seen = false
let loaded = false
let unregisterEscape: (() => void) | null = null

/** Whether §2.1.1's lock was holding the camera when the hint opened — see
    `lib/overlays.ts`'s note on why closing restores this rather than always handing back
    free control. */
let lockSuspended = false

const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) listener()
}

function ensureLoaded(): void {
  if (loaded || typeof window === 'undefined') return
  loaded = true
  try {
    seen = window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    /* Private browsing, a full quota, a browser policy — the preference just does not
       persist; showing the hint an extra time is not worth failing over. */
  }
}

function markSeen(): void {
  ensureLoaded()
  if (seen) return
  seen = true
  try {
    window.localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    /* See `ensureLoaded`. */
  }
}

/** Direct read, safe on the server and before this module has loaded anything. */
export function hasSeenControlsHint(): boolean {
  ensureLoaded()
  return seen
}

/** Direct read. */
export const isControlsHintOpen = (): boolean => open

export function openControlsHint(): void {
  if (open) return
  lockSuspended = isLocked()
  open = true
  markSeen()
  setMode('overlay')
  unregisterEscape = registerEscape(closeControlsHint)
  notify()
}

export function closeControlsHint(): void {
  if (!open) return
  open = false
  unregisterEscape?.()
  unregisterEscape = null
  if (lockSuspended) {
    lockSuspended = false
    setMode('locked')
  } else {
    setMode('play')
  }
  notify()
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
  }
}

/** Reactive, for the DOM. */
export function useControlsHintOpen(): boolean {
  return useSyncExternalStore(subscribe, isControlsHintOpen, () => false)
}
