'use client'

import { useSyncExternalStore } from 'react'
import type { Tier } from './world'

/**
 * §15.1 — the single place that decides which column the world reads. The rule and the
 * reasoning behind it live in the brief; this implements them.
 *
 * Tier is resolved once and frozen (it feeds the Canvas's `gl.antialias`, fixed at
 * context creation). Orientation is reactive, because the §12.1 FOV split has to follow
 * the device in the visitor's hands.
 */

let cachedTier: Tier | null = null

/** §15.1 — coarse pointer, or a viewport 820 px or narrower. */
export function resolveTier(): Tier {
  if (cachedTier !== null) return cachedTier

  // The Canvas is client-only, so this branch is unreachable in practice. It exists so
  // that importing this module from a server context is not a crash.
  if (typeof window === 'undefined') return 'desktop'

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches
  const narrowViewport = window.matchMedia('(max-width: 820px)').matches
  cachedTier = coarsePointer || narrowViewport ? 'mobile' : 'desktop'
  return cachedTier
}

/** Direct read. Safe inside `useFrame`. */
export function tier(): Tier {
  return resolveTier()
}

const PORTRAIT = '(orientation: portrait)'

let orientationMql: MediaQueryList | null = null
let isPortrait = false
const orientationListeners = new Set<() => void>()

function ensureOrientationListener(): void {
  if (orientationMql !== null || typeof window === 'undefined') return
  orientationMql = window.matchMedia(PORTRAIT)
  isPortrait = orientationMql.matches
  orientationMql.addEventListener('change', (event) => {
    isPortrait = event.matches
    for (const notify of orientationListeners) notify()
  })
}

function subscribeOrientation(onStoreChange: () => void): () => void {
  ensureOrientationListener()
  orientationListeners.add(onStoreChange)
  return () => {
    orientationListeners.delete(onStoreChange)
  }
}

function getOrientationSnapshot(): boolean {
  ensureOrientationListener()
  return isPortrait
}

function getOrientationServerSnapshot(): boolean {
  return false
}

/** Reactive. Drives the §12.1 FOV split. */
export function useIsPortrait(): boolean {
  return useSyncExternalStore(
    subscribeOrientation,
    getOrientationSnapshot,
    getOrientationServerSnapshot,
  )
}
