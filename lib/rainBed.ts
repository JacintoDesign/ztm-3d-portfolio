'use client'

import { dbToGain, master } from '@/lib/audio'
import { AUDIO } from '@/lib/world'

/**
 * §14.2 — rain on asphalt, synthesised. No file, ever.
 *
 * **White noise loops cleanly because it has nothing to loop.** A sampled rain bed has to
 * stay convincingly non-repeating for as long as anyone stands still and listens, which is
 * exactly the asset that is never quite long enough — `CLAUDE.md`'s weight budget is paid in
 * files that ship, and a bed at −18 dB under a −30 dB master has no business costing anything.
 * A `bufferSeconds`-long buffer of uncorrelated samples has no periodicity for a loop seam to
 * expose, so it is indistinguishable from an infinite one at a fraction of the cost — and the
 * cost here is CPU cycles to fill a typed array, not bytes in a bundle.
 *
 * **Filtered and shaped, or it is a dead FM station, not rain.** `lib/world.ts`'s
 * `rainSynthesis` block carries every number this file uses and the reasoning for each —
 * the lowpass that removes the hiss, the Q that keeps it from whistling, the LFO that keeps
 * a filtered noise floor from reading as static. This file only assembles the graph.
 */

let started = false

export function startRainBed(context: AudioContext): void {
  if (started) return
  const destination = master()
  if (destination === null) return
  started = true

  const { bufferSeconds, lowpassHz, lowpassQ, wobble } = AUDIO.rainSynthesis

  /* The noise. Mono is enough — this is a floor under the mix, not a stereo asset, and a
     second channel would be a second buffer to fill for a difference nobody at −18 dB
     under the master will hear. */
  const frameCount = Math.round(bufferSeconds * context.sampleRate)
  const buffer = context.createBuffer(1, frameCount, context.sampleRate)
  const samples = buffer.getChannelData(0)
  for (let i = 0; i < frameCount; i++) {
    samples[i] = Math.random() * 2 - 1
  }

  const noise = context.createBufferSource()
  noise.buffer = buffer
  noise.loop = true

  /* The one filter. Rolls the top off; the Q below the biquad default of 1 is what keeps
     the cutoff from resonating into a whistle. See `lib/world.ts` for both numbers. */
  const lowpass = context.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = lowpassHz
  lowpass.Q.value = lowpassQ

  /* The wobble. A slow sine on the *cutoff*, not the gain — see `lib/world.ts`'s note on why
     amplitude modulation was the wrong axis. `lfoDepth` scales ±1 down to ±depthHz before it
     ever reaches the filter's frequency `AudioParam`. */
  const lfo = context.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = wobble.rateHz
  const lfoDepth = context.createGain()
  lfoDepth.gain.value = wobble.depthHz

  /* The bed's own level. `AUDIO.beds.rainOnAsphalt.db`, not the master — this is *how loud
     rain is in the mix*, a property of the bed, independent of §14.1's master fader and of
     the visitor's mute preference, both of which sit further downstream. See `lib/audio.ts`. */
  const rainGain = context.createGain()
  rainGain.gain.value = dbToGain(AUDIO.beds.rainOnAsphalt.db)

  lfo.connect(lfoDepth)
  lfoDepth.connect(lowpass.frequency)
  noise.connect(lowpass)
  lowpass.connect(rainGain)
  rainGain.connect(destination)

  noise.start()
  lfo.start()
}
