'use client'

import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
/* `ToneMappingMode` has no re-export from @react-three/postprocessing — this is the
   documented import for it, and `postprocessing` is a hard dependency of that package
   rather than an optional one, so it is present whenever the wrapper is. No new entry in
   `package.json`: adding one would pin a second version of a library whose version is
   already decided by the peer range in the `three` pin comment. */
import { ToneMappingMode } from 'postprocessing'
import { resolveTier } from '@/lib/device'
import { POST } from '@/lib/world'

/**
 * §9 — the post chain. **Bloom and vignette only**; §9's chromatic aberration and noise
 * are deliberately not here yet.
 *
 * The third pass is not an effect. `<EffectComposer>` sets `renderer.toneMapping` to
 * `NoToneMapping` for as long as it is mounted — so the moment this file exists, §5's
 * ACES and its 1.05 exposure stop being applied and the world renders raw linear HDR
 * straight to the screen. `<ToneMapping>` puts §5 back. It is restoration, not addition.
 *
 * **And it has to sit after the bloom, which is the part worth understanding.** §8.1 is a
 * ladder of emissive values either side of a 0.90 knee — neon tubes at 3.20, sign faces
 * at 2.40, spill at 1.10, storefront boxes at 0.85 deliberately under it. Those numbers
 * are only meaningful while they are still HDR. Tone map first and ACES has already
 * compressed every one of them below 1.0, nothing ever crosses 0.90, and the whole ladder
 * silently stops meaning anything — with no error and a picture that merely looks a bit
 * flat. Bloom reads the scene at 2.40; the screen sees it after ACES.
 *
 * §9's own order is preserved where it applies: bloom first, vignette last.
 *
 * **The mode must be named.** `ToneMappingEffect` defaults to **AgX**, not ACES, so
 * leaving it off would quietly replace §5's tone mapping with a different one. §5's
 * exposure survives the move: `World.tsx` still sets `toneMappingExposure` on the
 * renderer, three's tone-mapping chunk reads it as a uniform, and this pass compiles
 * that same chunk.
 *
 * **§13 has nothing to turn off here**, which is worth stating rather than leaving as an
 * absence. Reduced motion drops §9's effects 2 and 3 and keeps bloom and vignette — and
 * 2 and 3 are not in this chain, so the reduced-motion chain and the ordinary one are the
 * same chain. When they arrive, this is where the branch goes.
 */
export default function Effects() {
  const tier = resolveTier()
  const bloom = POST.bloom[tier]

  return (
    <EffectComposer
      /* §9 — `antialias` cannot reach a scene that renders into a target. This is where
         it went. */
      multisampling={POST.multisampling[tier]}
    >
      <Bloom
        intensity={bloom.intensity}
        luminanceThreshold={bloom.luminanceThreshold}
        luminanceSmoothing={bloom.luminanceSmoothing}
        mipmapBlur={bloom.mipmapBlur}
        radius={bloom.radius}
        {...('resolutionScale' in bloom ? { resolutionScale: bloom.resolutionScale } : {})}
      />

      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />

      <Vignette offset={POST.vignette.offset} darkness={POST.vignette.darkness} />
    </EffectComposer>
  )
}

