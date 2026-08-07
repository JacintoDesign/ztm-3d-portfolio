'use client'

import { useSyncExternalStore } from 'react'

import { AUDIO } from '@/lib/world'

/**
 * §14.1 / §14.2 — the audio context, its two-stage output, and the mute preference that
 * drives the second stage.
 *
 * **`unlock()` must be called synchronously inside a real gesture handler, and nothing else in
 * this file may create the context.** A browser grants a running `AudioContext` only to a
 * genuine user gesture, and *genuine* is narrower than it sounds: the gesture's permission is
 * spent by the time a promise callback, a `setTimeout` or a React effect runs, so a context
 * created there starts `suspended` and cannot resume itself. The failure is silent, it never
 * reproduces on a machine where a page has already been interacted with, and it looks like a
 * bug in whatever plays the first sound. Hence one entry point, called from one place —
 * §14.1's `Enter` button, first statement in the handler.
 *
 * **Two gain stages downstream of every bed, not one.** `masterGain` carries §14.2's −30 dB —
 * the mix balance, one knob for every bed there will ever be. `muteGain`, after it, is what
 * the visitor's mute preference drives. They stay separate because they answer different
 * questions: *how loud is the mix* is a property of the mix; *is this visitor listening at
 * all* is a property of the visitor, and folding the second into the first would mean
 * unmuting had to remember what the balance used to be.
 */

let context: AudioContext | null = null
let masterGain: GainNode | null = null
let muteGain: GainNode | null = null

/** §14.2 — all bed levels are dB relative to a master that starts at −6. Exported: `lib/rainBed.ts`
    needs the same conversion for `AUDIO.beds.rainOnAsphalt.db` and a second formula for the
    same number is a second place for it to drift. */
export const dbToGain = (db: number): number => 10 ** (db / 20)

/** How fast the mute gain ramps. Fast enough that toggling never sounds like a fade,
    slow enough that a gain node jumping to exactly 0 never clicks. */
const MUTE_RAMP_SEC = 0.05

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext }

/**
 * §14.2 — the mute preference. `localStorage`-backed, read once, lazily, and only on the
 * client — this module is reachable from `MuteToggle.tsx`, which renders before the gate is
 * dismissed and therefore before `unlock()` has ever run, so the preference has to exist
 * independently of the audio graph it will eventually drive.
 *
 * Same shape as `lib/store.ts`: a module-level value, a listener set, a direct read and a
 * hook — except the direct read (`isMuted`) also has to be safe to call during SSR, which
 * `getMode` never had to be. `ensureLoaded` is the guard: `typeof window === 'undefined'` on
 * the server, and read-once on the client.
 */

let muted = false
let loaded = false
const listeners = new Set<() => void>()

const STORAGE_KEY = 'jacintoDesign:audioMuted'

function ensureLoaded(): void {
  if (loaded || typeof window === 'undefined') return
  loaded = true
  try {
    muted = window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    /* Private browsing, a full quota, a browser policy — `localStorage` can throw on either
       read or write. The preference just does not persist; it is not worth failing over. */
  }
}

/** Direct read. Safe on the server (`ensureLoaded` no-ops there) and safe inside a frame
    loop, though nothing currently reads it from one. */
export function isMuted(): boolean {
  ensureLoaded()
  return muted
}

/**
 * Ramps `muteGain` toward the current preference. Split out from `setMuted` because
 * `unlock()` also needs it — a returning visitor who muted last time should hear nothing
 * from the instant the context exists, not from the next time they happen to press the
 * button.
 */
function applyMuteGain(instant: boolean): void {
  if (context === null || muteGain === null) return
  const target = muted ? 0 : 1
  if (instant) {
    muteGain.gain.setValueAtTime(target, context.currentTime)
  } else {
    muteGain.gain.setTargetAtTime(target, context.currentTime, MUTE_RAMP_SEC)
  }
}

export function setMuted(next: boolean): void {
  ensureLoaded()
  if (next === muted) return
  muted = next
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
  } catch {
    /* See `ensureLoaded` — the preference simply does not survive a reload. */
  }
  applyMuteGain(false)
  for (const listener of listeners) listener()
}

export const toggleMuted = (): void => setMuted(!isMuted())

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
  }
}

/** Reactive, for `MuteToggle.tsx`. `false` on the server — the same default `isMuted` would
    give without a stored preference, so hydration never has a mismatch to reconcile. */
export function useMuted(): boolean {
  return useSyncExternalStore(subscribe, isMuted, () => false)
}

/**
 * Create and resume the context. **Call only from inside a click handler.**
 *
 * Idempotent, because §14.1's button is not the only future caller — §14.2 says the world is
 * silent until first interaction if the gate is ever skipped by a deep link, and that path
 * calls this too.
 *
 * Returns `null` where there is no Web Audio at all. Silence is a correct outcome; a throw
 * here would take the gate's click handler with it, and the click handler is also what takes
 * the visitor into the world.
 */
export function unlock(): AudioContext | null {
  if (context !== null) {
    /* Already built. Still resume: a context can be suspended again by the browser when the
       tab goes to the background, and coming back is another gesture. */
    if (context.state === 'suspended') void context.resume()
    return context
  }

  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext
  if (Ctor === undefined) return null

  context = new Ctor()
  masterGain = context.createGain()
  masterGain.gain.value = dbToGain(AUDIO.masterDb)

  muteGain = context.createGain()
  masterGain.connect(muteGain)
  muteGain.connect(context.destination)
  /* The stored preference, applied before a single bed connects — a muted visitor gets
     silence from the first frame this context exists, not from the next time they reach
     for the button. */
  ensureLoaded()
  applyMuteGain(true)

  /* Chromium hands back a `running` context when the gesture is real and a `suspended` one
     when it is not — so this resolves instantly in the good case and is the tell in the bad. */
  if (context.state === 'suspended') void context.resume()

  return context
}

/** The node every §14.2 bed connects to. `null` until `unlock()` has run. */
export const master = (): GainNode | null => masterGain

/** Direct read, for anything that needs to know whether sound is available at all. */
export const isUnlocked = (): boolean => context !== null && context.state === 'running'
