'use client'

/**
 * §12.5 — the one owner of `Escape`.
 *
 * *"`Escape` closes whatever is open, and nothing else claims `Escape`."* Three features
 * will each feel entitled to it — §2.1.1's locked view, §2.2's bio overlay, §2.3's contact
 * overlay — and if each adds its own listener then pressing it with two of them open closes
 * both, in whichever order the listeners happen to have been bound.
 *
 * So there is one listener and a **LIFO stack**: the most recently registered handler wins,
 * and only it fires. That is the behaviour a visitor expects — `Escape` closes the thing on
 * top, not everything.
 *
 * Module-level state read by a DOM listener, in the shape `lib/collision.ts` established:
 * register, get a remover back, and remove **by identity rather than by index**, because two
 * things can register and unregister interleaved and an index captured at mount stops
 * meaning anything.
 */

type Handler = () => void

const stack: Handler[] = []
let listening = false

function onKeyDown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return
  const top = stack[stack.length - 1]
  if (top === undefined) return
  /* Only after finding a handler. Claiming the key with nothing open would stop the
     browser's own Escape — leaving full-screen, cancelling an IME composition — for a
     world that had nothing to close. */
  event.preventDefault()
  top()
}

/** Registers a handler and returns its remover. The top of the stack wins. */
export function registerEscape(handler: Handler): () => void {
  stack.push(handler)

  if (!listening && typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeyDown)
    listening = true
  }

  return () => {
    const at = stack.indexOf(handler)
    if (at !== -1) stack.splice(at, 1)
  }
}

/** How many handlers are registered. Dev-facing; the world never branches on it. */
export const escapeDepth = (): number => stack.length
