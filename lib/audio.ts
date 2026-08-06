'use client'

import { AUDIO } from '@/lib/world'

/**
 * §14.2 — the audio context, and the one rule about when it may be created.
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
 * **There is nothing to play yet, and that is deliberate rather than unfinished.** §14.2's
 * seven beds need seven files that are not in the repo. What exists is the context and the
 * master gain they will hang off, created in the only gesture the world is guaranteed to get.
 * A later bed connects to `master()` and is audible; a later bed that had to unlock its own
 * context would have missed its chance by minutes.
 */

let context: AudioContext | null = null
let masterGain: GainNode | null = null

/** §14.2 — all levels are dB relative to a master that starts at −6. */
const gainFromDb = (db: number): number => 10 ** (db / 20)

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext }

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
  masterGain.gain.value = gainFromDb(AUDIO.masterDb)
  masterGain.connect(context.destination)

  /* Chromium hands back a `running` context when the gesture is real and a `suspended` one
     when it is not — so this resolves instantly in the good case and is the tell in the bad. */
  if (context.state === 'suspended') void context.resume()

  return context
}

/** The node every §14.2 bed connects to. `null` until `unlock()` has run. */
export const master = (): GainNode | null => masterGain

/** Direct read, for anything that needs to know whether sound is available at all. */
export const isUnlocked = (): boolean => context !== null && context.state === 'running'
