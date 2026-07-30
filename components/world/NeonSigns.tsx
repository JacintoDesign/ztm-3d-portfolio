'use client'

import { useCallback, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BoxGeometry,
  type InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three'
import { resolveTier } from '@/lib/device'
import { flickerLevel } from '@/lib/flicker'
import { prefersReducedMotion } from '@/lib/reducedMotion'
import {
  type NeonSign,
  NEON_SIGN_LIST,
  signFacing,
  signPanelCentre,
  signWallX,
} from '@/lib/signs'
import { neonSignTexture } from '@/lib/textures/neonSign'
import { MATERIALS, NEON_FLICKER, NEON_SIGNS, PALETTE } from '@/lib/world'

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

/**
 * §3.5 — one material for all fifteen brackets, and that is a precondition rather than a
 * tidiness. They are drawn as a single `InstancedMesh`, which can carry exactly one
 * material; nine per-sign copies of the same `metalDark` was what made them nine draw calls.
 */
const BRACKET_MATERIAL = new MeshStandardMaterial({
  color: PALETTE.metalDark,
  roughness: MATERIALS.paintedMetal.roughness,
  metalness: MATERIALS.paintedMetal.metalness,
  envMapIntensity: MATERIALS.paintedMetal.envMapIntensity,
})

/* Hoisted scratch for composing the bracket matrices once at mount. Not a frame loop, but
   the same rule applies for the same reason: these are built inside a loop. */
const TMP_POSITION = new Vector3()
const TMP_QUATERNION = new Quaternion()
const TMP_SCALE = new Vector3()

/** §11.3 — the offset per flickering decorative sign, as a fraction of the period. */
const FLICKER_PHASE: Record<number, number> = NEON_FLICKER.phase.decorativeSign

type Built = {
  sign: NeonSign
  face: MeshStandardMaterial
  rim: MeshBasicMaterial
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
    /* §7.1 — the same call that seats the dynamic light on this sign. Deriving the panel
       centre twice is how a light ends up half a metre off the thing emitting it. */
    const [panelX, panelY] = signPanelCentre(sign)

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
      panel: {
        x: panelX,
        y: panelY,
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
  const flickering = useMemo(
    () =>
      signs
        .filter((built) => built.sign.flickers)
        .map((built) => ({
          face: built.face,
          /* §11.3 — the offset for this sign, by index. Without it every flickering thing
             in the world stutters on the same frame and the street reads as switched
             rather than as failing. */
          phase: FLICKER_PHASE[built.sign.index] ?? 0,
        })),
    [signs],
  )

  useFrame((state) => {
    if (prefersReducedMotion()) {
      // §13 — constant 1. Not dimmed and not frozen mid-sequence: on.
      for (const { face } of flickering) face.emissiveIntensity = NEON_SIGNS.faceEmissive
      return
    }

    for (const { face, phase } of flickering) {
      face.emissiveIntensity =
        NEON_SIGNS.faceEmissive * flickerLevel(state.clock.elapsedTime, phase)
    }
  })

  /**
   * §3.5 — every bracket in the alley, as one `InstancedMesh`.
   *
   * Verticals take two at ±`bracketOffsetY` and horizontals one on the centre line, so the
   * count is 6 × 2 + 3 = 15. They were nine separate meshes and nine draw calls; sharing one
   * geometry and one material makes them one, which is the −8 that bought §10's ripples the
   * room to exist on a mobile tier sitting at 90 of 90.
   *
   * Static, so the matrices are written once when the mesh attaches. Nothing here runs per
   * frame — a bracket that never moves has no business in `useFrame`.
   */
  const bracketMatrices = useMemo(() => {
    const out: Matrix4[] = []
    for (const { sign, panel } of signs) {
      const offsets =
        sign.orientation === 'vertical'
          ? [+NEON_SIGNS.bracketOffsetY, -NEON_SIGNS.bracketOffsetY]
          : [0]
      for (const dy of offsets) {
        out.push(
          new Matrix4().compose(
            TMP_POSITION.set(
              signWallX(sign) + (signFacing(sign) * panel.bracketLength) / 2,
              panel.y + dy,
              sign.z,
            ),
            TMP_QUATERNION,
            TMP_SCALE.set(panel.bracketLength, NEON_SIGNS.bracket, NEON_SIGNS.bracket),
          ),
        )
      }
    }
    return out
  }, [signs])

  const attachBrackets = useCallback(
    (mesh: InstancedMesh | null) => {
      if (mesh === null) return
      bracketMatrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix))
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere()
    },
    [bracketMatrices],
  )

  return (
    <>
      {signs.map(({ sign, face, rim, panel }) => (
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
        </group>
      ))}

      {/* §3.5 — all fifteen brackets, one call. */}
      <instancedMesh
        name="neon:brackets"
        ref={attachBrackets}
        args={[UNIT_BOX, BRACKET_MATERIAL, bracketMatrices.length]}
      />
    </>
  )
}
