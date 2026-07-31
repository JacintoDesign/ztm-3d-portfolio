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
 * §12.5's front arc: how far off the view direction a station may sit and still be claimable.
 *
 * `cos 75°`, so a 150° cone — wide enough that a station at the edge of vision still prompts,
 * narrow enough that one behind your head does not.
 */
const FACING_MIN_DOT = 0.25

/**
 * The nearest station whose radius contains the point **and which the visitor is facing**,
 * or `null`.
 *
 * Squared distances, and no allocation — this runs every frame from `Interact.tsx`.
 *
 * **The facing test is new, and *nearest alone* stopped being enough when the stations moved
 * together.** §12.5 was written for three stations spread over forty metres, where the
 * closest was always the one in front of you. §2.1 then moved to the bend and §2.2 and §2.3
 * followed, and now §2.1.1's locked pose — where a visitor stands to read the board — is
 * **2.32 m from §2.3's bank and 7.07 m from the board itself.** By distance the mailboxes win
 * there, and they are directly behind the visitor's head.
 *
 * So the rule becomes *the nearest thing you are looking at*, which is what "nearest" was
 * always standing in for. It also unblocks §2.3's stop: the bank's radius could not exceed
 * 2.32 without claiming the board's pose, and framing six boxes on a portrait phone needs a
 * 3.34 m standoff — the two were in direct conflict until this stopped being about distance
 * alone.
 *
 * **No fallback when nothing is in the arc.** Returning the nearest thing behind you would
 * reintroduce exactly the case this exists to exclude; turning away from a station and losing
 * its prompt is the correct reading of *what you are looking at*.
 */
export function nearestInRange(x: number, z: number, facingYaw?: number): Station | null {
  let best: Station | null = null
  let bestDistSq = Infinity

  /* §12.1's convention: yaw 0 faces `+Z`. Computed once, not per station. */
  const hasFacing = facingYaw !== undefined
  const faceX = hasFacing ? Math.sin(facingYaw) : 0
  const faceZ = hasFacing ? Math.cos(facingYaw) : 0

  for (const station of stations) {
    const dx = station.x - x
    const dz = station.z - z
    const distSq = dx * dx + dz * dz
    if (distSq > station.radius * station.radius) continue

    if (hasFacing && distSq > 1e-6) {
      const distance = Math.sqrt(distSq)
      if ((dx * faceX + dz * faceZ) / distance < FACING_MIN_DOT) continue
    }

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
