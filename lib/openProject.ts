'use client'

import { stopAutoAdvance } from '@/lib/showcase'

/**
 * §2.1 — opens a real deployment in a new tab.
 *
 * One implementation, because there are three callers — the board's door, the GitHub plate,
 * and §2.1.2's *open* control — and §16.4 is still open about what should happen when a
 * popup blocker refuses. When that is settled it has to be settled in one place.
 *
 * Opening also **stops the automatic paging**: a visitor who has just opened a project has
 * taken the wheel, and coming back to a board that has moved on two projects is the thing
 * §2.1's stop rule exists to prevent.
 */
export function openProject(url: string): void {
  if (url.length === 0) return
  stopAutoAdvance()
  window.open(url, '_blank', 'noopener,noreferrer')
}
