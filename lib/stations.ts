'use client'

import { useSyncExternalStore } from 'react'

/**
 * §12.5 — the station registry.
 *
 * *"Stations register `{ position, radius, open() }` on mount; a single manager finds the
 * nearest registered station in range and opens it. No station listens for the key itself."*
 * Two stations in overlapping range both firing is the failure that rule exists to prevent,
 * and it is not hypothetical here: §12.5's radii are 4.00, 2.20 and 2.00 in a 9 m alley.
 *
 * The shape is `lib/collision.ts`'s, for its reasons. Module-level state read directly in a
 * frame loop — a store subscription would re-render the tree on every registration — and
 * **removal by identity rather than by index**, because three stations mount from three
 * components and an index captured at mount stops meaning anything the moment one unmounts.
 *
 * The one thing that *is* reactive is which station is currently in range, because a DOM
 * overlay has to render the prompt. That goes through `lib/store.ts`'s idiom, where the
 * setter early-returns if unchanged — so the frame loop can call it sixty times a second
 * and React renders only on the three events that matter: entering range, leaving it, and
 * swapping between two stations.
 */

export type Station = {
  id: string
  /** Ground position. Distance is measured in XZ; the visitor's eye height is irrelevant. */
  x: number
  z: number
  radius: number
  prompt: string
  open: () => void
}

const stations: Station[] = []

/** Registers a station and returns its remover. Call from an effect, never from a render. */
export function registerStation(station: Station): () => void {
  stations.push(station)
  return () => {
    const at = stations.indexOf(station)
    if (at !== -1) stations.splice(at, 1)
  }
}

/**
 * The nearest station whose radius contains the point, or `null`.
 *
 * Squared distances, and no allocation — this runs every frame from `Interact.tsx`.
 */
export function nearestInRange(x: number, z: number): Station | null {
  let best: Station | null = null
  let bestDistSq = Infinity

  for (const station of stations) {
    const dx = x - station.x
    const dz = z - station.z
    const distSq = dx * dx + dz * dz
    if (distSq > station.radius * station.radius) continue
    if (distSq < bestDistSq) {
      bestDistSq = distSq
      best = station
    }
  }

  return best
}

export const stationCount = (): number => stations.length

/**
 * Every registered station, for `lib/guidedPath.ts`'s `stationAudit`.
 *
 * **A copy, not the array.** The registry is mutated by `registerStation`'s remover, and a
 * caller holding the live array would see it change under a loop. Reading is cheap and rare;
 * `nearestInRange` is the hot path and it reads the array directly.
 */
export const registeredStations = (): readonly Station[] => [...stations]

/* ── Which station is in range — the one reactive part ─────────────────────── */

let inRange: Station | null = null
const listeners = new Set<() => void>()

/** Safe to call inside a frame loop: early-returns unless the value actually changed. */
export function setInRange(next: Station | null): void {
  if (next === inRange) return
  inRange = next
  for (const listener of listeners) listener()
}

export const getInRange = (): Station | null => inRange

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** For the DOM prompt. Renders on entering range, leaving it, or swapping stations. */
export function useInRangeStation(): Station | null {
  return useSyncExternalStore(subscribe, getInRange, () => null)
}
