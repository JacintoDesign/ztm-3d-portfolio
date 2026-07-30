'use client'

import { useEffect, useMemo } from 'react'
import { BoxGeometry, MeshStandardMaterial } from 'three'
import { expose } from '@/lib/debug'
import { resolveTier } from '@/lib/device'
import { alleyLightsFor, gateLightFor, reachReport } from '@/lib/lights'
import { neonSignTexture } from '@/lib/textures/neonSign'
import {
  DECORATIVE_SIGNAGE,
  MATERIALS,
  OVERHEAD,
  PALETTE,
  STATION_PLATE,
  STATION_PLATE_PANEL,
  v3,
} from '@/lib/world'

/** One box for the plate. Module scope, so it is created once for the page. */
const PLATE_BOX = new BoxGeometry(1, 1, 1)

/**
 * §7.1 — the alley's own five dynamic lights.
 *
 * Until this file existed the world ran on **one** of §7's ten. The hemisphere came with
 * the shell; the other nine were deferred to the objects that own them, and the five that
 * belong to §3.5's signs got built without their light. What was lighting the alley in
 * the meantime was §5.1's environment, which was never meant to — and which arrived on
 * the wet floor as a red disc and two coloured slabs with nothing above any of them.
 *
 * Each light here sits on a sign that exists, at that sign's panel centre, in that sign's
 * own colour. Where each one goes is decided in `lib/lights.ts`; this file mounts them
 * and nothing else.
 *
 * **Nothing in this file animates.** §11.3's flicker lives on the sign's material and is
 * deliberately not carried into the light: sixty `intensity` writes a second across five
 * point lights re-uploads every affected material's uniforms, and the flicker is already
 * fully legible on the panel that is doing it. §13 therefore has nothing to turn off here.
 */
export default function Lights() {
  const tier = resolveTier()
  const lights = useMemo(() => alleyLightsFor(tier), [tier])
  const gate = useMemo(() => gateLightFor(tier), [tier])

  /**
   * §3.1 — the `終電` plate, built here with its light rather than in `Alley.tsx`.
   *
   * It had been deferred as *surroundings work* since the shell, and §7.1 is what forces the
   * pairing: a light at `y = 4.2` with nothing at `y = 4.2` is precisely the unmotivated glow
   * that section deleted four lightformers for. The plate and the thing lighting it arrive
   * together or neither is defensible.
   *
   * Painted through §3.5's own painter at `kind: 'banner'`, not `'sign'`. §3.1 calls it a
   * *dark backlit plate*: a sign's panel is `void` with lit strokes on it, which is a neon
   * tube, and a plate lit from behind keeps a fraction of its own colour across the whole
   * face. That fraction is the difference between a plate and two glyphs in mid-air.
   */
  const plate = useMemo(() => {
    const texture = neonSignTexture(
      DECORATIVE_SIGNAGE[STATION_PLATE.stringIndex] ?? '',
      STATION_PLATE.color,
      'horizontal',
      OVERHEAD.banner.canvas[tier],
      tier,
      'banner',
    )
    if (texture === null) return null
    return new MeshStandardMaterial({
      map: texture,
      emissiveMap: texture,
      emissive: 0xffffff,
      color: PALETTE.concrete,
      emissiveIntensity: STATION_PLATE.emissive,
      roughness: MATERIALS.paintedMetal.roughness,
      metalness: MATERIALS.paintedMetal.metalness,
    })
  }, [tier])

  /* Dev only — §7.1 claims the five pools run continuously with no unlit gap. This is
     how that is checked rather than asserted. */
  useEffect(() => {
    expose('alleyLights', lights)
    expose('gateLight', gate)
    expose('lightReach', reachReport)
  }, [lights, gate])

  return (
    <>
      {lights.map((light) => (
        <pointLight
          key={light.id}
          name={`light:${light.id}:sign${light.sign}`}
          color={PALETTE[light.color]}
          intensity={light.intensity}
          position={v3(light.position)}
          distance={light.distance}
          decay={light.decay}
        />
      ))}

      {/* §3.1 — the plate. Its face points down the alley, so no rotation is needed. */}
      {plate !== null ? (
        <mesh
          name="station:plate"
          geometry={PLATE_BOX}
          material={plate}
          position={v3(gate.plate)}
          scale={[
            STATION_PLATE_PANEL.width,
            STATION_PLATE_PANEL.height,
            STATION_PLATE.thickness,
          ]}
        />
      ) : null}

      {/* §7 light 11 — seated on the plate above, `signWhite`, the one cool light here. */}
      <pointLight
        name={`light:${gate.id}:stationPlate`}
        color={PALETTE[gate.color]}
        intensity={gate.intensity}
        position={v3(gate.position)}
        distance={gate.distance}
        decay={gate.decay}
      />
    </>
  )
}
