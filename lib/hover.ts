'use client'

import { useSyncExternalStore } from 'react'

/**
 * What the pointer is over in the world, when that thing is small enough to need naming.
 *
 * **§12.5's prompt answers *where you are*; this answers *what you are pointing at*.** They
 * are different questions and §2.3 is what made the difference matter: standing at the bank
 * you are in range of one station, but there are six things in front of you and each opens
 * somewhere else. A prompt that only says `E — contact` cannot tell you that the second box
 * on the top row is LinkedIn.
 *
 * `lib/stations.ts`'s shape, for its reasons: module-level state, a setter that early-returns
 * when nothing changed so a pointer-move handler can call it freely, and one hook for the DOM.
 */

export type HoverTarget = { label: string; hint: string } | null

let hovered: HoverTarget = null
const listeners = new Set<() => void>()

/** Safe to call from a pointer-move handler: early-returns unless the label actually changed. */
export function setHover(next: HoverTarget): void {
  if (next?.label === hovered?.label && next?.hint === hovered?.hint) return
  hovered = next
  for (const listener of listeners) listener()
}

export const getHover = (): HoverTarget => hovered

/**
 * Sets the cursor as well as the label, because the two always change together and forgetting
 * the cursor is what makes a clickable thing look like scenery.
 */
export function setHoverWithCursor(next: HoverTarget): void {
  setHover(next)
  if (typeof document !== 'undefined') {
    document.body.style.cursor = next === null ? '' : 'pointer'
  }
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
  }
}

export function useHover(): HoverTarget {
  return useSyncExternalStore(subscribe, getHover, () => null)
}
