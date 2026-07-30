'use client'

import { Environment, Lightformer } from '@react-three/drei'
import { ATMOSPHERE, HEMISPHERE_LIGHT, LIGHTFORMERS, PALETTE, v2, v3 } from '@/lib/world'

/**
 * §5 — fog, background, and the environment that feeds the wet ground.
 *
 * There is no sky. Fourteen-metre facades on both sides, a mat of overhead cable, and
 * fog that closes the last fifteen metres — so `scene.background` is a flat colour and
 * no HDRI is ever downloaded.
 */
export default function Atmosphere() {
  return (
    <>
      {/* §5 — flat void. No skybox, no HDRI file anywhere in the world. */}
      <color attach="background" args={[PALETTE.void]} />

      {/*
        §5 — FogExp2 at 0.0300. The check that this density is right is not visual
        preference: ~0.62 transmittance at 23 m, ~0.24 at 40 m. The far end of the alley
        stays legible and never resolves, which is what removes the need for a horizon.
      */}
      <fogExp2 attach="fog" args={[PALETTE.fogColor, ATMOSPHERE.fog.density]} />

      {/*
        §7 light #1 of 10, and the only one that lives here. The other nine are attached
        to objects that do not exist yet and arrive with them.
      */}
      <hemisphereLight
        color={HEMISPHERE_LIGHT.skyColor}
        groundColor={HEMISPHERE_LIGHT.groundColor}
        intensity={HEMISPHERE_LIGHT.intensity}
      />

      {/*
        §5.1 — the environment, built from Lightformers only. These exist to feed the
        wet-ground reflections and the metal, not to light the scene directly.

        `frames={1}` bakes the cube map once at mount. It must never re-render per
        frame: an environment that re-bakes every frame costs more than everything else
        in this file put together, and the symptom is a frame rate that looks like the
        ground's fault.
      */}
      <Environment resolution={ATMOSPHERE.environment.resolution} frames={ATMOSPHERE.environment.frames}>
        {/*
          §5.1 — the uniform fill, and the reason this file no longer hangs four coloured
          rectangles outside the walls.

          `<Environment>` portals its children into a private scene and bakes a cube map
          from it, so a background on *that* scene is returned for every direction: an
          environment with no shape, no edge and no position. That is the whole of why it
          is allowed where the four formers were not — there is nothing in it that can
          read as an object, so there is nothing that needs something above it.

          It also has to be here rather than expressed as a brighter light. §7.1 measured
          it: the environment was carrying 68% of the frame, and it was carrying it
          through *reflection* in §6's wet ground, which no amount of hemisphere reaches.
        */}
        <color attach="background" args={[ATMOSPHERE.environment.fill]} />
        {LIGHTFORMERS.map((lf, i) => (
          <Lightformer
            key={i}
            form={lf.form}
            color={PALETTE[lf.color]}
            intensity={lf.intensity}
            scale={v2(lf.scale)}
            position={v3(lf.position)}
          />
        ))}
      </Environment>
    </>
  )
}
