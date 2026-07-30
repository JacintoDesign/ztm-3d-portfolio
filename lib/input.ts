'use client'

import { canControl } from './store'
import { WALK } from './world'

/**
 * §12.3 — where the two input paths converge.
 *
 * The keyboard and the on-screen stick each maintain their own vector here, and a single
 * `readIntent` sums them into one. That sum is the only thing the player reads:
 *
 *     keyboard {x,y}  ──┐
 *                       ├──►  sum, clamped to the unit disc  ──►  intent
 *     stick    {x,y}  ──┘
 *
 * `x` is strafe (positive is the visitor's right), `y` is forward.
 *
 * Neither path passes through React. A `pointermove` at 120 Hz through a store would
 * re-render the tree faster than the world draws, and the symptom would look like the
 * ground's fault. These are plain module objects, mutated by their listeners and read
 * once a frame — and nothing in this file allocates after load.
 *
 * Summed and clamped, not maxed: it is the only rule that keeps a half-pushed stick at
 * half speed while `W` plus a forward stick still gives 1 rather than 2.
 */

const keyboard = { x: 0, y: 0 }
const stick = { x: 0, y: 0 }

/* ── Keyboard ─────────────────────────────────────────────────────────────── */

/**
 * Keyed on `event.code`, not `event.key`, so the bindings are physical: `WASD` stays
 * under the same four fingers on AZERTY and Dvorak, where `event.key` would scatter it.
 *
 * §12.3 — arrows strafe, they do not turn. They live in the same intent vector as WASD,
 * and the basis is camera yaw; a turning binding would need a second basis.
 */
const FORWARD_KEYS = new Set(['KeyW', 'ArrowUp'])
const BACK_KEYS = new Set(['KeyS', 'ArrowDown'])
const LEFT_KEYS = new Set(['KeyA', 'ArrowLeft'])
const RIGHT_KEYS = new Set(['KeyD', 'ArrowRight'])

const held = new Set<string>()

function isBound(code: string): boolean {
  return FORWARD_KEYS.has(code) || BACK_KEYS.has(code) || LEFT_KEYS.has(code) || RIGHT_KEYS.has(code)
}

/**
 * Recomputed on each key event rather than per frame — key events are rare and a frame
 * is not. Normalised so `W+D` is not 1.41× faster than `W`, which every visitor finds.
 */
function recomputeKeyboard(): void {
  let x = 0
  let y = 0
  for (const code of held) {
    if (FORWARD_KEYS.has(code)) y += 1
    else if (BACK_KEYS.has(code)) y -= 1
    else if (RIGHT_KEYS.has(code)) x += 1
    else if (LEFT_KEYS.has(code)) x -= 1
  }
  const length = Math.hypot(x, y)
  if (length > 1) {
    x /= length
    y /= length
  }
  keyboard.x = x
  keyboard.y = y
}

/**
 * §12.5 — a monotonic tick, bumped on every movement press **whether or not the gate below
 * lets it through**, and on the stick leaving its dead zone.
 *
 * It exists because §2.1.1's locked view has to release on movement input and cannot: the
 * gate on the next line means that in `'locked'` mode a `W` is never recorded, so `held`
 * stays empty and `hasMovementInput()` is permanently false. The gate itself must not move
 * — it is what stops a visitor walking while typing in §2.3's contact form — so the signal
 * goes *above* it instead.
 *
 * **The consumer decides when it means anything**, and that is the part to get right. This
 * same tick fires when someone types `w` into a contact form; a consumer that watched it in
 * `'overlay'` mode would close the form under them. The locked view watches it only while
 * the mode is `'locked'`.
 */
let movementSeq = 0

/** Read directly in a frame loop; never subscribed to. */
export const movementTick = (): number => movementSeq

function onKeyDown(event: KeyboardEvent): void {
  if (!isBound(event.code)) return
  if (!event.repeat) movementSeq++
  // Gated here rather than downstream so that an overlay's text field keeps its arrow
  // keys: while the visitor cannot control the world, we neither record nor preventDefault.
  if (!canControl()) return
  if (event.repeat) return
  // The page never scrolls (overflow hidden), but a focused element still can.
  event.preventDefault()
  held.add(event.code)
  recomputeKeyboard()
}

/**
 * Never gated. A key pressed before an overlay opened must still be releasable while it
 * is open, or it stays held and the visitor resumes walking when the overlay closes.
 */
function onKeyUp(event: KeyboardEvent): void {
  if (!held.delete(event.code)) return
  recomputeKeyboard()
}

/**
 * A `keyup` delivered to a hidden tab is never delivered at all. Without this, holding
 * `W` and switching away leaves the visitor walking into a wall for as long as they are
 * gone — and the bug only ever reproduces when you stop looking at the screen.
 */
function onFocusLoss(): void {
  clearInput()
}

function onVisibilityChange(): void {
  if (document.visibilityState === 'hidden') clearInput()
}

/** Attaches the keyboard path. Returns its own cleanup. */
export function attachKeyboard(): () => void {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onFocusLoss)
  document.addEventListener('visibilitychange', onVisibilityChange)

  return () => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('blur', onFocusLoss)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    clearInput()
  }
}

/* ── Stick ────────────────────────────────────────────────────────────────── */

const { deadZone } = WALK.stick

/**
 * Takes the raw thumb offset already normalised to the ring — magnitude 0 at centre,
 * 1 at the edge — and applies the §12.3 dead zone. The remap matters: without it the
 * stick jumps from nothing to 12% speed the instant it leaves the dead zone, which
 * reads as a stuck control rather than a gentle one.
 */
export function setStick(rawX: number, rawY: number): void {
  const magnitude = Math.hypot(rawX, rawY)

  if (magnitude <= deadZone) {
    stick.x = 0
    stick.y = 0
    return
  }

  /* §12.5 — the touch half of the movement tick, on the *crossing* rather than on every
     move: a thumb held out of the dead zone would otherwise bump this sixty times a second
     for a signal whose whole meaning is "something new happened". */
  if (stick.x === 0 && stick.y === 0) movementSeq++

  const clamped = Math.min(magnitude, 1)
  const scale = ((clamped - deadZone) / (1 - deadZone)) / magnitude
  stick.x = rawX * scale
  stick.y = rawY * scale
}

/* ── The convergence ──────────────────────────────────────────────────────── */

/**
 * The single read. Writes into a caller-owned object so this allocates nothing, which
 * matters because it is called every frame.
 */
export function readIntent(out: { x: number; y: number }): void {
  const x = keyboard.x + stick.x
  const y = keyboard.y + stick.y

  const length = Math.hypot(x, y)
  if (length > 1) {
    out.x = x / length
    out.y = y / length
    return
  }

  out.x = x
  out.y = y
}

/** §12.6 — the visitor always wins: any movement input releases the guided path. */
export function hasMovementInput(): boolean {
  return keyboard.x !== 0 || keyboard.y !== 0 || stick.x !== 0 || stick.y !== 0
}

export function clearInput(): void {
  held.clear()
  keyboard.x = 0
  keyboard.y = 0
  stick.x = 0
  stick.y = 0
}
