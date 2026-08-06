'use client'

import { useSyncExternalStore } from 'react'

/**
 * The mode machine. One store holds the mode; one selector answers whether the visitor
 * may move.
 *
 * Movement and looking are both gated on `canControl()`, with no exceptions. Without it
 * a visitor typing in the contact form walks across the world while doing it — a bug
 * that is invisible for the whole build, because you never type in your own form.
 *
 * Same shape as `lib/reducedMotion.ts` and `lib/device.ts`: one module-level value, a
 * listener set, a direct read for frame loops and a hook for the DOM. A frame loop must
 * never subscribe — reading a module variable sixty times a second costs nothing, while
 * sixty React renders a second costs the frame budget.
 */

export type Mode = 'loading' | 'play' | 'locked' | 'overlay'

/**
 * §14.1 — `'loading'`, and the gate is the only thing that has ever moved it off this.
 *
 * It was `'play'` from the shell until the gate landed, with a note saying this line was the
 * one that would change. It is that line. Until the visitor presses `Enter`, `canControl()` is
 * false, so §12.3's walking, §12.2's looking, §12.5's interact key and §12.3's touch stick are
 * all inert — **behind a full-screen panel, which is belt and braces and is the point**: the
 * gate is DOM, and a keydown does not know it is there.
 */
let mode: Mode = 'loading'

const listeners = new Set<() => void>()

/** Direct read. Safe to call inside `useFrame`. */
export function getMode(): Mode {
  return mode
}

/**
 * The one selector. Movement, looking and the interact key all ask this and nothing
 * else — a second way to answer the question is a second thing to forget to update.
 */
export function canControl(): boolean {
  return mode === 'play'
}

export function setMode(next: Mode): void {
  if (next === mode) return
  mode = next
  for (const notify of listeners) notify()
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
  }
}

function getSnapshot(): Mode {
  return mode
}

/** The Canvas never server-renders, and the DOM overlays re-evaluate at hydration. */
function getServerSnapshot(): Mode {
  return mode
}

/** Reactive read, for components that need to re-render when the mode changes. */
export function useMode(): Mode {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/** Reactive form of the selector, for DOM overlays. Frame loops use `canControl()`. */
export function useCanControl(): boolean {
  return useMode() === 'play'
}
