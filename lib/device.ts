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
  const update = (): void => {
    const next = orientationMql?.matches ?? false
    if (next === isPortrait) return
    isPortrait = next
    for (const notify of orientationListeners) notify()
  }
  isPortrait = orientationMql.matches
  orientationMql.addEventListener('change', update)
  /* `resize` as well: DevTools device mode and CDP metric overrides sometimes skip the
     media-query `change` event while still updating `.matches` and firing `resize`. */
  window.addEventListener('resize', update)
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
  return orientationMql?.matches ?? isPortrait
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

/**
 * §15.1's 820 px cut, **live**. `resolveTier()` freezes the same query for the Canvas; overlay
 * chrome that has to follow a resize — DevTools device mode, a window dragged narrow — reads
 * this instead. Server snapshot is `false` (desktop), matching `useIsPortrait`.
 */
const NARROW = '(max-width: 820px)'

let narrowMql: MediaQueryList | null = null
let isNarrow = false
const narrowListeners = new Set<() => void>()

function ensureNarrowListener(): void {
  if (narrowMql !== null || typeof window === 'undefined') return
  narrowMql = window.matchMedia(NARROW)
  const update = (): void => {
    const next = narrowMql?.matches ?? false
    if (next === isNarrow) return
    isNarrow = next
    for (const notify of narrowListeners) notify()
  }
  isNarrow = narrowMql.matches
  narrowMql.addEventListener('change', update)
  window.addEventListener('resize', update)
}

function subscribeNarrow(onStoreChange: () => void): () => void {
  ensureNarrowListener()
  narrowListeners.add(onStoreChange)
  return () => {
    narrowListeners.delete(onStoreChange)
  }
}

function getNarrowSnapshot(): boolean {
  ensureNarrowListener()
  return narrowMql?.matches ?? isNarrow
}

export function useIsNarrow(): boolean {
  return useSyncExternalStore(subscribeNarrow, getNarrowSnapshot, () => false)
}
