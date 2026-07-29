'use client'

import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { BoxGeometry, MeshBasicMaterial, MeshStandardMaterial } from 'three'
import { resolveTier } from '@/lib/device'
import { prefersReducedMotion } from '@/lib/reducedMotion'
import { type NeonSign, NEON_SIGN_LIST } from '@/lib/signs'
import { neonSignTexture } from '@/lib/textures/neonSign'
import { LAYOUT, MATERIALS, NEON_FLICKER, NEON_SIGNS, PALETTE } from '@/lib/world'

/**
 * §3.5 — the nine decorative neon signs.
 *
 * **They project.** Each is a double-sided box on a bracket, out at 90° from the wall and
 * readable walking either way. A flush panel is a poster; this is signage, and it is most
 * of what makes a wall read as a street rather than as a corridor with decals on it.
 *
 * **Carries nothing** (§2.4). Strings come from §11.4's fixed list by index, nothing here
 * is clickable, and none of it is raycast against.
 *
 * Not solid (§3.2): the lowest face sits at 2.90 against a 1.68 eye, so no boxes.
 */

const UNIT_BOX = new BoxGeometry(1, 1, 1)

/** §11.3 — one authored sequence, played identically on every run, then a steady hold. */
const FLICKER_CYCLE_MS = NEON_FLICKER.sequence.length * NEON_FLICKER.stepMs
const FLICKER_PERIOD_MS = FLICKER_CYCLE_MS + NEON_FLICKER.holdSec * 1000

/** Into the alley: +X off the west wall, −X off the east. */
const facing = (sign: NeonSign) => (sign.wall === 'west' ? 1 : -1)
const faceX = (sign: NeonSign) =>
  sign.wall === 'west' ? LAYOUT.alley.x[0] : LAYOUT.alley.x[1]

type Built = {
  sign: NeonSign
  face: MeshStandardMaterial
  rim: MeshBasicMaterial
  bracket: MeshStandardMaterial
  /** Panel extents on the world axes: thickness runs along X, out from the wall. */
  panel: { x: number; y: number; height: number; depth: number; bracketLength: number }
}

function build(tier: ReturnType<typeof resolveTier>): Built[] {
  return NEON_SIGN_LIST.map((sign) => {
    const canvas = NEON_SIGNS.canvas[tier]
    // A horizontal sign reads the canvas turned on its side, so the two axes swap.
    const size: readonly [number, number] =
      sign.orientation === 'vertical' ? canvas : [canvas[1], canvas[0]]
    const texture = neonSignTexture(sign.text, sign.color, sign.orientation, size, tier)

    /* `size` is [z-extent, y-extent] for both orientations — a vertical sign is narrow
       and tall, a horizontal one wide and short, and `lib/signs.ts` already resolves
       which is which. Deriving them from the orientation a second time here is how the
       three horizontal signs came out rotated 90°, standing tall and reading sideways. */
    const [depth, height] = sign.size

    return {
      sign,
      face: new MeshStandardMaterial({
        map: texture,
        emissiveMap: texture,
        /* White emissive so the painted colour comes through unchanged, and `void` as
           the diffuse — §3.4's rule: the accent lives in the emissive term only, or the
           panel arrives at twice the intensity §8.1 asked for. */
        emissive: 0xffffff,
        color: PALETTE.void,
        emissiveIntensity: NEON_SIGNS.faceEmissive,
        roughness: MATERIALS.neonTube.roughness,
        metalness: MATERIALS.neonTube.metalness,
      }),
      /* §8 — the tube is `meshBasicMaterial`, colour at full. It is not lit by anything;
         it *is* the light, and §9's bloom is what gives it the halo that §8's 0.03 shell
         would otherwise have to fake. See §3.5. */
      rim: new MeshBasicMaterial({ color: PALETTE[sign.color] }),
      bracket: new MeshStandardMaterial({
        color: PALETTE.metalDark,
        roughness: MATERIALS.paintedMetal.roughness,
        metalness: MATERIALS.paintedMetal.metalness,
        envMapIntensity: MATERIALS.paintedMetal.envMapIntensity,
      }),
      panel: {
        x: faceX(sign) + facing(sign) * (sign.projection + NEON_SIGNS.thickness / 2),
        y: sign.y + height / 2,
        height,
        depth,
        bracketLength: sign.projection,
      },
    }
  })
}

export default function NeonSigns() {
  const tier = resolveTier()
  const signs = useMemo(() => build(tier), [tier])

  /**
   * §11.3 — the flicker, in one frame callback rather than nine. Only the two signs the
   * brief names are touched, and `emissiveIntensity` is mutated on the material directly:
   * this never reaches React state, because sixty renders a second to dim a sign costs
   * more than the sign does.
   */
  const flickering = useMemo(() => signs.filter((built) => built.sign.flickers), [signs])

  useFrame((state) => {
    if (prefersReducedMotion()) {
      // §13 — constant 1. Not dimmed and not frozen mid-sequence: on.
      for (const { face } of flickering) face.emissiveIntensity = NEON_SIGNS.faceEmissive
      return
    }

    const ms = (state.clock.elapsedTime * 1000) % FLICKER_PERIOD_MS
    const step = ms < FLICKER_CYCLE_MS ? Math.floor(ms / NEON_FLICKER.stepMs) : -1
    const level = step === -1 ? 1 : (NEON_FLICKER.sequence[step] as number)
    for (const { face } of flickering) {
      face.emissiveIntensity = NEON_SIGNS.faceEmissive * level
    }
  })

  return (
    <>
      {signs.map(({ sign, face, rim, bracket, panel }) => (
        <group key={sign.index} name={`neon:${sign.index}`}>
          {/* The tube rim: larger on the two long axes, thinner across, so the painted
              face stands out through it on both sides and the rim reads as the frame. */}
          <mesh
            geometry={UNIT_BOX}
            material={rim}
            position={[panel.x, panel.y, sign.z]}
            scale={[
              NEON_SIGNS.thickness * 0.94,
              panel.height + NEON_SIGNS.rim * 2,
              panel.depth + NEON_SIGNS.rim * 2,
            ]}
          />
          <mesh
            name={`neon:face:${sign.index}`}
            geometry={UNIT_BOX}
            material={face}
            position={[panel.x, panel.y, sign.z]}
            scale={[NEON_SIGNS.thickness, panel.height, panel.depth]}
          />
          {/* Bracket back to the wall — §3.5, 0.05 square in `metalDark`. */}
          <mesh
            geometry={UNIT_BOX}
            material={bracket}
            position={[
              faceX(sign) + (facing(sign) * panel.bracketLength) / 2,
              panel.y,
              sign.z,
            ]}
            scale={[panel.bracketLength, NEON_SIGNS.bracket, NEON_SIGNS.bracket]}
          />
        </group>
      ))}
    </>
  )
}
