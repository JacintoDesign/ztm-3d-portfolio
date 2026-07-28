'use client'

import { useSyncExternalStore } from 'react'

/**
 * §13 — `prefers-reduced-motion: reduce`, honoured everywhere.
 *
 * A first-person world owes this more than a scroll page does, because the whole camera
 * moves. It ships with the motion code rather than as a retrofit, which is why this
 * module exists in the shell — the ground's normal scroll is the first thing that has
 * to answer to it.
 *
 * Two readers, deliberately:
 *   - `prefersReducedMotion()` is a direct, non-reactive read for frame loops.
 *   - `usePrefersReducedMotion()` is the reactive hook for React-level decisions.
 *
 * A frame loop must never subscribe. One matchMedia listener keeps a module-level
 * boolean fresh, and reading it sixty times a second costs nothing.
 */

const QUERY = '(prefers-reduced-motion: reduce)'

let mql: MediaQueryList | null = null
let current = false
const listeners = new Set<() => void>()

function ensureListener(): void {
  if (mql !== null || typeof window === 'undefined') return
  mql = window.matchMedia(QUERY)
  current = mql.matches
  mql.addEventListener('change', (event) => {
    current = event.matches
    for (const notify of listeners) notify()
  })
}

/** Direct read. Safe to call inside `useFrame`. */
export function prefersReducedMotion(): boolean {
  ensureListener()
  return current
}

function subscribe(onStoreChange: () => void): () => void {
  ensureListener()
  listeners.add(onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
  }
}

function getSnapshot(): boolean {
  ensureListener()
  return current
}

/**
 * Motion allowed on the server. The Canvas never server-renders, and the DOM overlays
 * re-evaluate at hydration — assuming reduced motion here would make the first paint
 * of every overlay wrong for the majority.
 */
function getServerSnapshot(): boolean {
  return false
}

/** Reactive read, for components that need to re-render when the setting changes. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
